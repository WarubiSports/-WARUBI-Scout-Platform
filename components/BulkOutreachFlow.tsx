import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, FileUp, Trash2, Loader2, Copy, Check, Send, ChevronRight, MessageSquare, ExternalLink, Mail, CheckCircle } from 'lucide-react';
import { Player, PlayerStatus } from '../types';
import { extractPlayersFromBulkData, extractRosterFromPhoto, bulkGenerateOutreach, BulkOutreachResult } from '../services/geminiService';
import { useProspects } from '../hooks/useProspects';
import { useOutreach } from '../hooks/useOutreach';
import { toast } from 'sonner';

type FlowStep = 'UPLOAD' | 'REVIEW' | 'SAVING' | 'EMAIL' | 'OUTREACH';
type OutreachTemplate = 'First Spark' | 'Invite to ID' | 'Follow-up' | 'Request Video';

interface ExtractedPlayer {
  name: string;
  position: string;
  age: number;
  club: string;
  email: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  notes: string;
}

interface OutreachMessage {
  playerId: string;
  playerName: string;
  phone: string;
  parentPhone: string;
  message: string;
  copied: boolean;
}

interface BulkOutreachFlowProps {
  scoutId: string;
  scoutName: string;
  scoutBio?: string;
  onClose: () => void;
}

export const BulkOutreachFlow: React.FC<BulkOutreachFlowProps> = ({
  scoutId,
  scoutName,
  scoutBio,
  onClose,
}) => {
  const [step, setStep] = useState<FlowStep>('UPLOAD');
  const [extractedPlayers, setExtractedPlayers] = useState<ExtractedPlayer[]>([]);
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);
  const [outreachMessages, setOutreachMessages] = useState<OutreachMessage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<OutreachTemplate>('First Spark');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timeout wrapper — rejects after ms
  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Please try again.`)), ms)),
    ]);

  const { addProspectsBatch } = useProspects(scoutId);
  const { logOutreach } = useOutreach(scoutId);

  const handleClose = () => {
    if (step !== 'UPLOAD' && extractedPlayers.length > 0) {
      if (!confirm('Close? Unsaved data will be lost.')) return;
    }
    onClose();
  };

  // UPLOAD handlers
  const handleFileUpload = async (file: File) => {
    setIsExtracting(true);
    setExtractionFailed(false);
    setLastFile(file);
    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      let players: Partial<Player>[];
      if (isImage) {
        const base64 = await fileToBase64(file);
        players = await withTimeout(extractRosterFromPhoto(base64, file.type), 30000, 'Extraction');
      } else if (isPdf) {
        const base64 = await fileToBase64(file);
        players = await withTimeout(extractPlayersFromBulkData(base64, true, 'application/pdf'), 30000, 'Extraction');
      } else {
        const text = await file.text();
        players = await withTimeout(extractPlayersFromBulkData(text), 30000, 'Extraction');
      }
      const normalized = normalizeExtracted(players);
      if (normalized.length === 0) {
        setExtractionFailed(true);
        toast.error('No players found', { description: 'The AI couldn\'t find player data. Try a clearer file or paste the data instead.' });
      } else {
        setExtractedPlayers(normalized);
        setStep('REVIEW');
      }
    } catch (err) {
      setExtractionFailed(true);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Extraction failed', { description: msg.includes('timed out') ? 'The AI took too long. Tap Retry.' : msg });
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setIsExtracting(true);
    setExtractionFailed(false);
    try {
      const players = await withTimeout(extractPlayersFromBulkData(pasteText), 30000, 'Extraction');
      const normalized = normalizeExtracted(players);
      if (normalized.length === 0) {
        setExtractionFailed(true);
        toast.error('No players found', { description: 'The AI couldn\'t find player data in the text you pasted.' });
      } else {
        setExtractedPlayers(normalized);
        setStep('REVIEW');
      }
    } catch (err) {
      setExtractionFailed(true);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Extraction failed', { description: msg.includes('timed out') ? 'The AI took too long. Tap Retry.' : msg });
    } finally {
      setIsExtracting(false);
    }
  };

  const normalizeExtracted = (raw: Partial<Player>[]): ExtractedPlayer[] => {
    return (raw || []).filter(p => p.name).map(p => ({
      name: p.name || '',
      position: p.position || 'CM',
      age: p.age || 0,
      club: p.club || '',
      email: p.email || '',
      phone: p.phone || '',
      parentName: p.parentName || '',
      parentPhone: p.parentPhone || '',
      parentEmail: p.parentEmail || '',
      notes: p.notes || '',
    }));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // REVIEW handlers
  const removePlayer = (index: number) => {
    setExtractedPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof ExtractedPlayer, value: string | number) => {
    setExtractedPlayers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  // SAVING
  const handleSavePlayers = async () => {
    setIsSaving(true);
    setStep('SAVING');
    try {
      const playersToSave: Player[] = extractedPlayers.map(p => ({
        id: '',
        name: p.name,
        position: p.position,
        age: p.age,
        club: p.club,
        email: p.email || undefined,
        phone: p.phone || undefined,
        parentName: p.parentName || undefined,
        parentPhone: p.parentPhone || undefined,
        parentEmail: p.parentEmail || undefined,
        notes: p.notes || undefined,
        status: PlayerStatus.LEAD,
        outreachLogs: [],
        activityStatus: 'undiscovered' as const,
        isRecalibrating: false,
      }));

      const saved = await withTimeout(addProspectsBatch(playersToSave), 20000, 'Saving players');
      setSavedPlayers(saved);

      if (saved.length > 0) {
        toast.success(`${saved.length} player${saved.length > 1 ? 's' : ''} saved`);
        // Go straight to Email if players have emails
        const hasEmails = saved.some(p => p.email);
        if (hasEmails) {
          setEmailSubject('Quick question about your soccer future');
          setEmailBody(`Hi,\n\nI'm ${scoutName} with Warubi Sports. I work with European academies including FC Köln's ITP program, Bundesliga clubs, and 200+ college programs in the US to help players find the right opportunity.\n\nI came across your profile and think you've got real potential. If playing in the US or at a European academy is something you're interested in, I'd love to chat about what that could look like for you.\n\nNo pressure — just want to see if it's a good fit.\n\nBest,\n${scoutName}`);
          setStep('EMAIL');
        } else {
          setStep('OUTREACH');
        }
      } else {
        toast.error('Failed to save players');
        setStep('REVIEW');
      }
    } catch (err) {
      toast.error('Error saving players');
      setStep('REVIEW');
    } finally {
      setIsSaving(false);
    }
  };

  // OUTREACH
  const handleGenerateOutreach = async () => {
    setIsGenerating(true);
    try {
      const playerData = savedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        age: p.age,
        club: p.club || '',
      }));

      const results = await withTimeout(bulkGenerateOutreach(scoutName, playerData, selectedTemplate, {
        scoutBio,
        language: 'en',
      }), 45000, 'Message generation');

      const messages: OutreachMessage[] = savedPlayers.map(p => {
        const match = results.find(r => r.id === p.id);
        return {
          playerId: p.id,
          playerName: p.name,
          phone: p.phone || '',
          parentPhone: p.parentPhone || '',
          message: match?.message || '',
          copied: false,
        };
      });

      setOutreachMessages(messages);
    } catch (err) {
      toast.error('Failed to generate messages', { description: err instanceof Error ? err.message : '' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = async (index: number) => {
    const msg = outreachMessages[index];
    await navigator.clipboard.writeText(msg.message);
    setOutreachMessages(prev => prev.map((m, i) => i === index ? { ...m, copied: true } : m));

    // Log outreach
    await logOutreach(msg.playerId, 'Clipboard', `Bulk: ${selectedTemplate}`, msg.message);

    setTimeout(() => {
      setOutreachMessages(prev => prev.map((m, i) => i === index ? { ...m, copied: false } : m));
    }, 2000);
  };

  const handleWhatsApp = async (index: number) => {
    const msg = outreachMessages[index];
    const phone = msg.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg.message)}`, '_blank');
      await logOutreach(msg.playerId, 'WhatsApp', `Bulk: ${selectedTemplate}`, msg.message);
    }
  };

  const handleParentWhatsApp = async (index: number) => {
    const msg = outreachMessages[index];
    const phone = msg.parentPhone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg.message)}`, '_blank');
      await logOutreach(msg.playerId, 'WhatsApp', `Bulk: ${selectedTemplate} (Parent)`, msg.message);
    }
  };

  // EMAIL ALL
  const [emailSent, setEmailSent] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const BATCH_SIZE = 30;

  const emailableMessages = outreachMessages.filter(m => {
    const player = savedPlayers.find(p => p.id === m.playerId);
    return player?.email;
  });

  const buildGroupEmailBody = (): string => {
    // Use the first message as template — it's representative of the style
    if (outreachMessages.length > 0) return outreachMessages[0].message;
    return `Hi,\n\nI'm ${scoutName} with Warubi Sports. I came across your profile and think you've got real potential. If playing in the US or at a European academy is something you're interested in, I'd love to chat about what that could look like for you.\n\nBest,\n${scoutName}`;
  };

  const handleEmailAll = async () => {
    const emails = emailableMessages.map(m => {
      const player = savedPlayers.find(p => p.id === m.playerId);
      return player?.email || '';
    }).filter(Boolean);

    if (emails.length === 0) return;

    const subject = selectedTemplate === 'First Spark' ? 'Quick question about your soccer future'
      : selectedTemplate === 'Invite to ID' ? 'You\'re invited — ID Day with college coaches'
      : selectedTemplate === 'Follow-up' ? 'Following up — opportunities in the US & Europe'
      : 'Quick request — game footage';

    const body = buildGroupEmailBody();

    // Batch into groups of 30 for mailto URL length limits
    const batches: string[][] = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      batches.push(emails.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const mailto = `mailto:?bcc=${encodeURIComponent(batch.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto, '_blank');
    }

    // Log outreach for all emailed players
    for (const m of emailableMessages) {
      await logOutreach(m.playerId, 'Email', `Bulk: ${selectedTemplate}`, body);
    }

    setEmailSent(true);
  };

  const templates: { value: OutreachTemplate; label: string; desc: string }[] = [
    { value: 'First Spark', label: 'First Spark', desc: 'Initial contact' },
    { value: 'Invite to ID', label: 'Invite to ID', desc: 'Event invitation' },
    { value: 'Follow-up', label: 'Follow-up', desc: 'Second touch' },
    { value: 'Request Video', label: 'Request Video', desc: 'Ask for footage' },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full md:max-w-3xl md:mx-4 bg-scout-900 rounded-t-2xl md:rounded-2xl border border-scout-700 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-scout-700 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              {step === 'UPLOAD' && 'Bulk Import'}
              {step === 'REVIEW' && `Review ${extractedPlayers.length} Players`}
              {step === 'SAVING' && 'Saving Players...'}
              {step === 'EMAIL' && 'Send Outreach'}
              {step === 'OUTREACH' && 'Individual Messages'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {(['UPLOAD', 'REVIEW', 'EMAIL'] as const).map((s, i) => (
                <React.Fragment key={s}>
                  <span className={`text-[10px] font-black uppercase ${step === s || (step === 'SAVING' && s === 'REVIEW') || (step === 'OUTREACH' && s === 'EMAIL') ? 'text-scout-accent' : 'text-gray-600'}`}>
                    {i + 1}. {s === 'UPLOAD' ? 'Import' : s === 'REVIEW' ? 'Review' : 'Send'}
                  </span>
                  {i < 2 && <ChevronRight size={10} className="text-gray-700" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-scout-800 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {/* UPLOAD STEP */}
          {step === 'UPLOAD' && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-scout-700 rounded-2xl p-10 text-center hover:border-scout-accent/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.pdf,image/*"
                  className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                />
                {isExtracting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-scout-accent animate-spin" />
                    <p className="text-gray-400 text-sm">Extracting players with AI...</p>
                    <p className="text-gray-600 text-xs">This usually takes 5-15 seconds</p>
                  </div>
                ) : extractionFailed ? (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={32} className="mx-auto text-red-400 mb-1" />
                    <p className="text-white font-bold">Extraction failed</p>
                    <p className="text-gray-500 text-xs">The AI couldn't read the file. Try a different format or paste the data below.</p>
                    {lastFile && (
                      <button
                        onClick={() => handleFileUpload(lastFile)}
                        className="mt-1 px-5 py-2 bg-scout-accent text-scout-900 rounded-lg font-bold text-sm"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-white font-bold mb-1">Drop a file or click to upload</p>
                    <p className="text-gray-500 text-xs">CSV, TXT, PDF, or photo of a roster</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-scout-700" />
                <span className="text-gray-600 text-xs font-bold uppercase">or paste</span>
                <div className="flex-1 h-px bg-scout-700" />
              </div>

              {/* Paste area */}
              <div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste player names, roster data, or a CSV here...&#10;&#10;Example:&#10;Max Mueller, 18, CM, FC Bayern Youth, +49151123456&#10;Tom Schmidt, 17, CB, BVB U19, tom@email.com"
                  className="w-full h-40 bg-scout-800 border border-scout-700 rounded-xl p-4 text-white placeholder:text-gray-600 text-sm resize-none focus:outline-none focus:border-scout-accent"
                />
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim() || isExtracting}
                  className="mt-3 w-full py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                  Extract Players
                </button>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'REVIEW' && (
            <div className="space-y-3">
              {extractedPlayers.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>No players extracted. Try a different format.</p>
                  <button onClick={() => setStep('UPLOAD')} className="mt-3 text-scout-accent font-bold text-sm">Go back</button>
                </div>
              ) : (
                extractedPlayers.map((player, index) => (
                  <div key={index} className="bg-scout-800 border border-scout-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                        <input
                          value={player.name}
                          onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                          placeholder="Name"
                          className="bg-scout-900 border border-scout-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-scout-accent col-span-2 md:col-span-1"
                        />
                        <input
                          value={player.position}
                          onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                          placeholder="Position"
                          className="bg-scout-900 border border-scout-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-scout-accent w-full"
                        />
                        <input
                          value={player.club}
                          onChange={(e) => updatePlayer(index, 'club', e.target.value)}
                          placeholder="Club"
                          className="bg-scout-900 border border-scout-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-scout-accent w-full"
                        />
                        <input
                          value={player.phone}
                          onChange={(e) => updatePlayer(index, 'phone', e.target.value)}
                          placeholder="Phone (incl. country code)"
                          className="bg-scout-900 border border-scout-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-scout-accent"
                        />
                        <input
                          value={player.email}
                          onChange={(e) => updatePlayer(index, 'email', e.target.value)}
                          placeholder="Email"
                          className="bg-scout-900 border border-scout-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-scout-accent"
                        />
                        <input
                          value={player.parentPhone}
                          onChange={(e) => updatePlayer(index, 'parentPhone', e.target.value)}
                          placeholder="Parent phone"
                          className="bg-scout-900 border border-scout-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-scout-accent"
                        />
                      </div>
                      <button onClick={() => removePlayer(index)} className="p-2 text-gray-600 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SAVING STEP */}
          {step === 'SAVING' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={40} className="text-scout-accent animate-spin" />
              <p className="text-gray-400 text-sm">Saving {extractedPlayers.length} players to your pipeline...</p>
            </div>
          )}


          {/* EMAIL STEP — Direct email blast */}
          {step === 'EMAIL' && (
            <div className="space-y-5">
              {!emailSent ? (
                <>
                  <div className="bg-gradient-to-br from-scout-accent/20 to-scout-accent/5 border-2 border-scout-accent/40 rounded-2xl p-6 text-center">
                    <Mail size={40} className="mx-auto text-scout-accent mb-3" />
                    <h3 className="text-white font-black text-xl uppercase tracking-tight mb-1">
                      Email {savedPlayers.filter(p => p.email).length} Players
                    </h3>
                    <p className="text-gray-400 text-xs mb-1">
                      Opens your mail app with all players in BCC. One click, done.
                    </p>
                  </div>

                  {/* Editable subject */}
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Subject</label>
                    <input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-scout-800 border border-scout-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-scout-accent"
                    />
                  </div>

                  {/* Editable body */}
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Message</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full bg-scout-800 border border-scout-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-scout-accent resize-none"
                      rows={10}
                    />
                  </div>

                  <button
                    onClick={() => {
                      const emails = savedPlayers.filter(p => p.email).map(p => p.email!);
                      const batches: string[][] = [];
                      for (let i = 0; i < emails.length; i += BATCH_SIZE) batches.push(emails.slice(i, i + BATCH_SIZE));
                      for (const batch of batches) {
                        window.open(`mailto:?bcc=${encodeURIComponent(batch.join(','))}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_blank');
                      }
                      savedPlayers.filter(p => p.email).forEach(p => logOutreach(p.id, 'Email', 'Bulk: First Spark', emailBody));
                      setEmailSent(true);
                    }}
                    className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all"
                  >
                    <Send size={20} />
                    Open Email — {savedPlayers.filter(p => p.email).length} Recipients
                  </button>

                  {savedPlayers.some(p => !p.email) && (
                    <p className="text-center text-gray-600 text-[10px]">
                      {savedPlayers.filter(p => !p.email).length} player{savedPlayers.filter(p => !p.email).length > 1 ? 's' : ''} without email.{' '}
                      <button onClick={() => setStep('OUTREACH')} className="text-scout-accent hover:underline">Generate WhatsApp messages</button>
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="mx-auto text-scout-accent mb-4" />
                  <h3 className="text-scout-accent font-black text-xl uppercase tracking-tight mb-2">
                    Email Opened!
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Check your mail app and hit send.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setStep('OUTREACH')} className="px-6 py-3 bg-scout-800 border border-scout-700 text-white rounded-xl font-bold text-sm hover:border-scout-600 transition-colors">
                      WhatsApp Individual Messages
                    </button>
                    <button onClick={onClose} className="px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OUTREACH STEP */}
          {step === 'OUTREACH' && (
            <div className="space-y-5">
              {/* Template + Language picker */}
              {outreachMessages.length === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Message Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {templates.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setSelectedTemplate(t.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${selectedTemplate === t.value
                            ? 'border-scout-accent bg-scout-accent/10 text-white'
                            : 'border-scout-700 bg-scout-800 text-gray-400 hover:border-scout-600'
                          }`}
                        >
                          <span className="text-sm font-bold block">{t.label}</span>
                          <span className="text-[10px] text-gray-500">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateOutreach}
                    disabled={isGenerating}
                    className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <MessageSquare size={20} />}
                    Generate {savedPlayers.length} Messages
                  </button>

                  <p className="text-center text-gray-600 text-xs">
                    {savedPlayers.length} players saved. Generate personalized outreach for each.
                  </p>
                </div>
              )}

              {/* Generated messages */}
              {outreachMessages.length > 0 && (
                <div className="space-y-4">
                  {/* EMAIL ALL — Hero CTA */}
                  {emailableMessages.length > 0 && (
                    <div className="bg-gradient-to-br from-scout-accent/20 to-scout-accent/5 border-2 border-scout-accent/40 rounded-2xl p-6 text-center">
                      {!emailSent ? (
                        <>
                          <Mail size={36} className="mx-auto text-scout-accent mb-3" />
                          <h3 className="text-white font-black text-lg uppercase tracking-tight mb-1">
                            Email All {emailableMessages.length} Players
                          </h3>
                          <p className="text-gray-400 text-xs mb-4">
                            Opens your mail app with all players in BCC. One click, done.
                          </p>
                          <button
                            onClick={handleEmailAll}
                            className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all"
                          >
                            <Send size={20} />
                            Send Email to {emailableMessages.length} Players
                          </button>
                          {emailableMessages.length < outreachMessages.length && (
                            <p className="text-gray-600 text-[10px] mt-2">
                              {outreachMessages.length - emailableMessages.length} player{outreachMessages.length - emailableMessages.length > 1 ? 's' : ''} without email — use WhatsApp below
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <CheckCircle size={36} className="mx-auto text-scout-accent mb-3" />
                          <h3 className="text-scout-accent font-black text-lg uppercase tracking-tight mb-1">
                            Email Opened!
                          </h3>
                          <p className="text-gray-400 text-xs">
                            Check your mail app and hit send.{emailableMessages.length > BATCH_SIZE ? ` Opened in ${Math.ceil(emailableMessages.length / BATCH_SIZE)} batches.` : ''}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {emailableMessages.length === 0 && outreachMessages.length > 0 && (
                    <div className="bg-scout-800 border border-scout-700 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm">No player emails found — use WhatsApp or copy messages below.</p>
                    </div>
                  )}

                  {/* Individual messages — WhatsApp + Copy */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Individual Messages ({outreachMessages.length})
                      </p>
                      <button
                        onClick={() => { setOutreachMessages([]); setEmailSent(false); }}
                        className="text-xs text-gray-500 hover:text-white"
                      >
                        Regenerate
                      </button>
                    </div>

                    {outreachMessages.map((msg, index) => (
                      <div key={msg.playerId} className="bg-scout-800 border border-scout-700 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-scout-700/50 bg-scout-900/30">
                          <span className="text-sm font-bold text-white">{msg.playerName}</span>
                          <div className="flex items-center gap-1">
                            {msg.phone && (
                              <button
                                onClick={() => handleWhatsApp(index)}
                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                title="Send via WhatsApp"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                            {msg.parentPhone && (
                              <button
                                onClick={() => handleParentWhatsApp(index)}
                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors text-[10px] font-bold"
                                title="Send to parent via WhatsApp"
                              >
                                Parent
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyMessage(index)}
                              className={`p-2 rounded-lg transition-colors ${msg.copied ? 'text-scout-accent bg-scout-accent/10' : 'text-gray-400 hover:bg-scout-700'}`}
                            >
                              {msg.copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={msg.message}
                          onChange={(e) => setOutreachMessages(prev => prev.map((m, i) => i === index ? { ...m, message: e.target.value } : m))}
                          className="w-full bg-transparent p-3 text-gray-300 text-sm resize-none focus:outline-none min-h-[100px]"
                          rows={4}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'REVIEW' && extractedPlayers.length > 0 && (
          <div className="p-5 border-t border-scout-700 shrink-0 flex items-center justify-between">
            <button onClick={() => { setStep('UPLOAD'); setExtractedPlayers([]); setPasteText(''); }} className="text-gray-500 text-sm font-bold hover:text-white transition-colors">
              Back
            </button>
            <button
              onClick={handleSavePlayers}
              className="px-8 py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center gap-2"
            >
              Save {extractedPlayers.length} Players <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 'EMAIL' && !emailSent && (
          <div className="p-5 border-t border-scout-700 shrink-0 flex items-center justify-between">
            <button onClick={() => setStep('OUTREACH')} className="text-gray-500 text-sm font-bold hover:text-white transition-colors">
              Skip to WhatsApp
            </button>
            <p className="text-gray-600 text-[10px]">Sent from your own email</p>
          </div>
        )}

        {step === 'OUTREACH' && outreachMessages.length > 0 && (
          <div className="p-5 border-t border-scout-700 shrink-0 flex items-center justify-between">
            <p className="text-gray-500 text-xs">
              {emailSent ? 'Email sent' : ''}{outreachMessages.filter(m => m.copied).length > 0 ? `${emailSent ? ' • ' : ''}${outreachMessages.filter(m => m.copied).length} copied` : ''}
            </p>
            <button onClick={onClose} className="px-6 py-2.5 bg-scout-700 text-white rounded-xl font-bold text-sm hover:bg-scout-600 transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
