import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
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

// --- Client-side parsers for structured data (no AI needed) ---

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /\+?[\d\s\-().]{7,}/;

/** Guess which column maps to which field based on header text */
const guessColumn = (header: string): keyof ExtractedPlayer | null => {
  const h = header.toLowerCase().trim();
  if (/^(name|player|full.?name|first.*last|athlete)/.test(h)) return 'name';
  if (/^(first|fname)/.test(h)) return 'name'; // will concat with last
  if (/^(email|e-mail|player.*email)$/.test(h)) return 'email';
  if (/^(phone|cell|mobile|tel|player.*phone)$/.test(h)) return 'phone';
  if (/^(pos|position)/.test(h)) return 'position';
  if (/^(age|birth|dob|year)/.test(h)) return 'age';
  if (/^(club|team|org|school)/.test(h)) return 'club';
  if (/^(parent.*name|guardian|father|mother|parent$)/.test(h)) return 'parentName';
  if (/^(parent.*email|guardian.*email)/.test(h)) return 'parentEmail';
  if (/^(parent.*phone|guardian.*phone)/.test(h)) return 'parentPhone';
  if (/^(note|comment|info)/.test(h)) return 'notes';
  return null;
};

/** Parse rows from a 2D array (Excel/CSV). Auto-detects headers vs headerless. */
const parseRows = (rows: string[][]): ExtractedPlayer[] => {
  if (rows.length === 0) return [];

  // Check if first row looks like headers
  const firstRow = rows[0];
  const hasHeaders = firstRow.some(cell => {
    const lower = (cell || '').toLowerCase().trim();
    return /^(name|email|phone|position|age|club|team|player|first|last|parent|guardian)/.test(lower);
  });

  let dataRows: string[][];
  let columnMap: Map<number, keyof ExtractedPlayer>;

  if (hasHeaders) {
    columnMap = new Map();
    // Also track first/last name columns
    let firstNameCol = -1;
    let lastNameCol = -1;
    firstRow.forEach((header, i) => {
      const h = header.toLowerCase().trim();
      if (/^(first|fname)/.test(h)) { firstNameCol = i; return; }
      if (/^(last|lname|surname)/.test(h)) { lastNameCol = i; return; }
      const field = guessColumn(header);
      if (field) columnMap.set(i, field);
    });
    // If first+last found but no 'name', merge them
    if (firstNameCol >= 0 && !Array.from(columnMap.values()).includes('name')) {
      columnMap.set(firstNameCol, 'name');
      if (lastNameCol >= 0) columnMap.set(lastNameCol, 'name'); // handled in merge below
    }
    dataRows = rows.slice(1);

    return dataRows.map(row => {
      const p: ExtractedPlayer = { name: '', position: 'CM', age: 0, club: '', email: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', notes: '' };
      columnMap.forEach((field, col) => {
        const val = (row[col] || '').trim();
        if (!val) return;
        if (field === 'age') {
          const num = parseInt(val);
          if (!isNaN(num) && num > 0 && num < 100) p.age = num;
        } else if (field === 'name' && p.name) {
          // Merge first + last
          p.name = p.name + ' ' + val;
        } else {
          (p as any)[field] = val;
        }
      });
      // If first+last columns exist
      if (firstNameCol >= 0 && lastNameCol >= 0) {
        const first = (row[firstNameCol] || '').trim();
        const last = (row[lastNameCol] || '').trim();
        p.name = (first + ' ' + last).trim();
      }
      return p;
    }).filter(p => p.name || p.email);
  } else {
    // No headers — try to parse each row intelligently
    return rows.map(row => {
      const p: ExtractedPlayer = { name: '', position: 'CM', age: 0, club: '', email: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', notes: '' };
      for (const cell of row) {
        const val = (cell || '').trim();
        if (!val) continue;
        if (!p.email && EMAIL_RE.test(val)) { p.email = val.match(EMAIL_RE)![0]; continue; }
        if (!p.phone && PHONE_RE.test(val) && !/^\d{4}$/.test(val)) { p.phone = val; continue; }
        const num = parseInt(val);
        if (!p.age && !isNaN(num) && num >= 10 && num <= 40) { p.age = num; continue; }
        if (!p.name && /^[A-Za-z\s.\-']{2,}$/.test(val) && val.length > 2) { p.name = val; continue; }
        if (!p.club) { p.club = val; continue; }
      }
      return p;
    }).filter(p => p.name || p.email);
  }
};

/** Parse plain text: emails list, CSV-like, or name list */
const parseTextLocally = (text: string): ExtractedPlayer[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return [];

  // Check if it looks like CSV (has commas or tabs)
  const hasDelimiter = lines.some(l => l.includes(',') || l.includes('\t'));
  if (hasDelimiter) {
    const delim = lines[0].includes('\t') ? '\t' : ',';
    const rows = lines.map(l => l.split(delim).map(c => c.trim()));
    return parseRows(rows);
  }

  // Otherwise: one item per line (email list, name list, etc.)
  return lines.map(line => {
    const p: ExtractedPlayer = { name: '', position: 'CM', age: 0, club: '', email: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', notes: '' };
    if (EMAIL_RE.test(line)) {
      p.email = line.match(EMAIL_RE)![0];
      // Try to derive name from email prefix
      const prefix = p.email.split('@')[0].replace(/[0-9._-]+$/, '').replace(/[._-]/g, ' ');
      if (prefix.length > 2) p.name = prefix.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else if (PHONE_RE.test(line)) {
      p.phone = line;
    } else {
      p.name = line;
    }
    return p;
  }).filter(p => p.name || p.email);
};

/** Parse Excel/XLSX/XLS file client-side */
const parseExcelFile = async (file: File): Promise<ExtractedPlayer[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  // Filter empty rows
  const nonEmpty = rows.filter(r => r.some(c => String(c || '').trim()));
  return parseRows(nonEmpty.map(r => r.map(c => String(c || ''))));
};

/** Detect if text can be parsed locally (structured) vs needs AI (unstructured) */
const canParseLocally = (text: string): boolean => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return false;
  // If most lines have emails, it's an email list
  const emailLines = lines.filter(l => EMAIL_RE.test(l)).length;
  if (emailLines / lines.length > 0.5) return true;
  // If most lines have commas/tabs, it's CSV
  const csvLines = lines.filter(l => l.includes(',') || l.includes('\t')).length;
  if (csvLines / lines.length > 0.5) return true;
  // If it's just a simple list of names (one per line, no complex text)
  const simpleLines = lines.filter(l => l.length < 80 && !l.includes('.') || EMAIL_RE.test(l)).length;
  if (simpleLines / lines.length > 0.7 && lines.length > 3) return true;
  return false;
};

// --- End client-side parsers ---

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
  inline?: boolean;
}

export const BulkOutreachFlow: React.FC<BulkOutreachFlowProps> = ({
  scoutId,
  scoutName,
  scoutBio,
  onClose,
  inline = false,
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

  const { addProspectsBatch, updateProspect } = useProspects(scoutId);
  const { logOutreach } = useOutreach(scoutId);
  const assessmentLink = scoutId ? `https://app.warubi-sports.com?ref=${scoutId}` : '';

  const resetState = () => {
    setStep('UPLOAD');
    setExtractedPlayers([]);
    setSavedPlayers([]);
    setOutreachMessages([]);
    setIsExtracting(false);
    setIsSaving(false);
    setIsGenerating(false);
    setExtractionFailed(false);
    setLastFile(null);
    setPasteText('');
  };

  const handleClose = () => {
    if (step !== 'UPLOAD' && extractedPlayers.length > 0) {
      if (!confirm('Close? Unsaved data will be lost.')) return;
    }
    resetState();
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
      const isExcel = /\.(xlsx?|xls)$/i.test(file.name) || file.type.includes('spreadsheet') || file.type.includes('excel');
      const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

      let normalized: ExtractedPlayer[];

      if (isExcel) {
        // Client-side Excel parsing — instant, handles 10k+ rows
        normalized = await parseExcelFile(file);
      } else if (isCsv) {
        const text = await file.text();
        normalized = parseTextLocally(text);
      } else if (isImage) {
        const base64 = await fileToBase64(file);
        const players = await withTimeout(extractRosterFromPhoto(base64, file.type), 30000, 'Extraction');
        normalized = normalizeExtracted(players);
      } else if (isPdf) {
        const base64 = await fileToBase64(file);
        const players = await withTimeout(extractPlayersFromBulkData(base64, true, 'application/pdf'), 30000, 'Extraction');
        normalized = normalizeExtracted(players);
      } else {
        // Text files — try local parse first, fall back to AI
        const text = await file.text();
        if (canParseLocally(text)) {
          normalized = parseTextLocally(text);
        } else {
          const players = await withTimeout(extractPlayersFromBulkData(text), 30000, 'Extraction');
          normalized = normalizeExtracted(players);
        }
      }

      if (normalized.length === 0) {
        setExtractionFailed(true);
        toast.error('No players found', { description: 'Could not find player data. Try a different format or paste below.' });
      } else {
        setExtractedPlayers(normalized);
        setStep('REVIEW');
        if (normalized.length > 100) toast.success(`${normalized.length} contacts extracted`, { description: 'Client-side parsing — no AI needed.' });
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
      let normalized: ExtractedPlayer[];
      if (canParseLocally(pasteText)) {
        // Instant client-side parse for structured data
        normalized = parseTextLocally(pasteText);
      } else {
        // Fall back to AI for unstructured text
        const players = await withTimeout(extractPlayersFromBulkData(pasteText), 30000, 'Extraction');
        normalized = normalizeExtracted(players);
      }
      if (normalized.length === 0) {
        setExtractionFailed(true);
        toast.error('No players found', { description: 'Could not find player data in the text you pasted.' });
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

  // SAVING — chunked with progress tracking
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 });

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

      // For large imports, save in app-level chunks with progress
      const CHUNK = 500;
      const allSaved: Player[] = [];
      setSaveProgress({ saved: 0, total: playersToSave.length });

      for (let i = 0; i < playersToSave.length; i += CHUNK) {
        const chunk = playersToSave.slice(i, i + CHUNK);
        try {
          const result = await addProspectsBatch(chunk);
          allSaved.push(...result);
          setSaveProgress({ saved: allSaved.length, total: playersToSave.length });
        } catch (err) {
          console.error(`Chunk ${i}-${i + chunk.length} failed:`, err);
          // Continue with next chunk — don't lose what we have
          toast.error(`Batch failed at ${i + 1}-${i + chunk.length}. ${allSaved.length} saved so far.`);
        }
      }

      setSavedPlayers(allSaved);

      if (allSaved.length > 0) {
        toast.success(`${allSaved.length.toLocaleString()} player${allSaved.length > 1 ? 's' : ''} saved`);
        // Go straight to Email if players have emails
        const hasEmails = allSaved.some(p => p.email);
        if (hasEmails) {
          setEmailSubject('Quick question about your soccer future');
          setEmailBody(`Hi,\n\nI'm ${scoutName} with Warubi Sports. I work with European academies including FC Köln's ITP program, Bundesliga clubs, and 200+ college programs in the US to help players find the right opportunity.\n\nI came across your profile and think you've got real potential. If playing in the US or at a European academy is something you're interested in, I'd love to chat about what that could look like for you.${assessmentLink ? `\n\nTake 2 minutes to see where you'd fit — it's free:\n${assessmentLink}` : ''}\n\nNo pressure — just want to see if it's a good fit.\n\nBest,\n${scoutName}`);
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
      await updateProspect(msg.playerId, { status: PlayerStatus.CONTACT_REQUESTED, lastContactedAt: new Date().toISOString(), activityStatus: 'spark' });
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
  const [emailPersona, setEmailPersona] = useState<'scout' | 'coach'>('scout');
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

    // Log outreach + bump to Contacted — batched for large lists
    const now = new Date().toISOString();
    await Promise.all(emailableMessages.map(m =>
      logOutreach(m.playerId, 'Email', `Bulk: ${selectedTemplate}`, body)
    ));
    for (let i = 0; i < emailableMessages.length; i += 50) {
      await Promise.all(emailableMessages.slice(i, i + 50).map(m =>
        updateProspect(m.playerId, { status: PlayerStatus.CONTACT_REQUESTED, lastContactedAt: now, activityStatus: 'spark' })
      ));
    }

    setEmailSent(true);
  };

  const templates: { value: OutreachTemplate; label: string; desc: string }[] = [
    { value: 'First Spark', label: 'First Spark', desc: 'Initial contact' },
    { value: 'Invite to ID', label: 'Invite to ID', desc: 'Event invitation' },
    { value: 'Follow-up', label: 'Follow-up', desc: 'Second touch' },
    { value: 'Request Video', label: 'Request Video', desc: 'Ask for footage' },
  ];

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (inline) {
      return <div className="bg-scout-900 rounded-2xl border border-scout-700 overflow-hidden">{children}</div>;
    }
    return (
      <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full md:max-w-3xl md:mx-4 bg-scout-900 rounded-t-2xl md:rounded-2xl border border-scout-700 max-h-[90vh] flex flex-col overflow-hidden">{children}</div>
      </div>
    );
  };

  return (
    <Wrapper>
        {/* Header */}
        <div className={`flex items-center justify-between ${inline ? 'p-4' : 'p-5'} border-b border-scout-700 shrink-0`}>
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
          {inline ? (
            <div className="flex items-center gap-2">
              {step !== 'UPLOAD' && (
                <button onClick={() => { setStep('UPLOAD'); setExtractedPlayers([]); setSavedPlayers([]); setOutreachMessages([]); setEmailSent(false); }}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase">Reset</button>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-scout-700 rounded-lg text-gray-500 hover:text-white transition-colors" title="Collapse">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleClose} className="p-2 hover:bg-scout-800 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          )}
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
                  accept=".csv,.txt,.pdf,.xlsx,.xls,image/*"
                  className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                />
                {isExtracting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-scout-accent animate-spin" />
                    <p className="text-gray-400 text-sm">Extracting players...</p>
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
                    <p className="text-gray-500 text-xs">Excel, CSV, PDF, or photo of a roster</p>
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
              ) : extractedPlayers.length > 100 ? (
                /* Large import summary — don't render 10k form cards */
                <div className="space-y-4">
                  <div className="bg-scout-accent/10 border border-scout-accent/30 rounded-xl p-5 text-center">
                    <p className="text-3xl font-black text-scout-accent">{extractedPlayers.length.toLocaleString()}</p>
                    <p className="text-sm font-bold text-white mt-1">Players Ready to Import</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-scout-800 border border-scout-700 rounded-xl p-4 text-center">
                      <p className="text-xl font-black text-blue-400">{extractedPlayers.filter(p => p.email).length.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">With Email</p>
                    </div>
                    <div className="bg-scout-800 border border-scout-700 rounded-xl p-4 text-center">
                      <p className="text-xl font-black text-green-400">{extractedPlayers.filter(p => p.phone).length.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">With Phone</p>
                    </div>
                    <div className="bg-scout-800 border border-scout-700 rounded-xl p-4 text-center">
                      <p className="text-xl font-black text-amber-400">{extractedPlayers.filter(p => p.position).length.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">With Position</p>
                    </div>
                    <div className="bg-scout-800 border border-scout-700 rounded-xl p-4 text-center">
                      <p className="text-xl font-black text-purple-400">{extractedPlayers.filter(p => p.club).length.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">With Club</p>
                    </div>
                  </div>
                  {/* Preview first 5 */}
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Preview</p>
                    {extractedPlayers.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-scout-700/50 text-sm">
                        <span className="text-white font-bold flex-1 truncate">{p.name}</span>
                        <span className="text-gray-500 text-xs">{p.position}</span>
                        <span className="text-gray-600 text-xs truncate max-w-[120px]">{p.email || p.phone || ''}</span>
                      </div>
                    ))}
                    {extractedPlayers.length > 5 && (
                      <p className="text-gray-600 text-xs text-center mt-2">
                        + {(extractedPlayers.length - 5).toLocaleString()} more
                      </p>
                    )}
                  </div>
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
              <p className="text-gray-400 text-sm">Saving {extractedPlayers.length.toLocaleString()} players to your pipeline...</p>
              {saveProgress.total > 500 && (
                <div className="w-64 space-y-2">
                  <div className="h-2 bg-scout-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-scout-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((saveProgress.saved / saveProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs text-center">
                    {saveProgress.saved.toLocaleString()} / {saveProgress.total.toLocaleString()}
                  </p>
                </div>
              )}
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

                  {/* Persona toggle */}
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Sending as</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setEmailPersona('scout');
                          setEmailSubject('Quick question about your soccer future');
                          setEmailBody(`Hi,\n\nI'm ${scoutName} with Warubi Sports. I work with European academies including FC Köln's ITP program, Bundesliga clubs, and 200+ college programs in the US to help players find the right opportunity.\n\nI came across your profile and think you've got real potential. If playing in the US or at a European academy is something you're interested in, I'd love to chat about what that could look like for you.${assessmentLink ? `\n\nTake 2 minutes to see where you'd fit — it's free:\n${assessmentLink}` : ''}\n\nNo pressure — just want to see if it's a good fit.\n\nBest,\n${scoutName}`);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${emailPersona === 'scout'
                          ? 'border-scout-accent bg-scout-accent/10 text-white'
                          : 'border-scout-700 bg-scout-800 text-gray-400 hover:border-scout-600'
                        }`}
                      >
                        <span className="text-sm font-bold block">Scout</span>
                        <span className="text-[10px] text-gray-500">Warubi Sports recruiter</span>
                      </button>
                      <button
                        onClick={() => {
                          setEmailPersona('coach');
                          setEmailSubject('Recruiting inquiry from ' + scoutName);
                          setEmailBody(`Hi,\n\nI'm ${scoutName} and I'm reaching out because I like what I've seen from you as a player.\n\nWe're actively building our roster and looking for the right additions. I think you could be a great fit and I'd love to learn more about your goals and where you are in your recruiting process.${assessmentLink ? `\n\nHere's a free tool to see where you'd fit — takes 2 minutes:\n${assessmentLink}` : ''}\n\nWould you be open to a quick call this week?\n\nBest,\n${scoutName}`);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${emailPersona === 'coach'
                          ? 'border-scout-accent bg-scout-accent/10 text-white'
                          : 'border-scout-700 bg-scout-800 text-gray-400 hover:border-scout-600'
                        }`}
                      >
                        <span className="text-sm font-bold block">Coach</span>
                        <span className="text-[10px] text-gray-500">College program recruiter</span>
                      </button>
                    </div>
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
                    onClick={async () => {
                      const emails = savedPlayers.filter(p => p.email).map(p => p.email!);
                      const batches: string[][] = [];
                      for (let i = 0; i < emails.length; i += BATCH_SIZE) batches.push(emails.slice(i, i + BATCH_SIZE));
                      for (const batch of batches) {
                        window.open(`mailto:?bcc=${encodeURIComponent(batch.join(','))}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_blank');
                      }
                      const emailPlayers = savedPlayers.filter(p => p.email);
                      // Log outreach + bump status in parallel batches
                      const now = new Date().toISOString();
                      await Promise.all(emailPlayers.map(p =>
                        logOutreach(p.id, 'Email', 'Bulk: First Spark', emailBody)
                      ));
                      // Batch status updates — don't await individually
                      for (let i = 0; i < emailPlayers.length; i += 50) {
                        await Promise.all(emailPlayers.slice(i, i + 50).map(p =>
                          updateProspect(p.id, { status: PlayerStatus.CONTACT_REQUESTED, lastContactedAt: now, activityStatus: 'spark' })
                        ));
                      }
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
                    Outreach Sent!
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">
                    {savedPlayers.filter(p => p.email).length} players emailed. Check your mail app and hit send.
                  </p>
                  <p className="text-gray-500 text-xs mb-6">
                    Players moved to <span className="text-scout-accent font-bold">Contacted</span>. Check back in a few days for warm leads.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {savedPlayers.some(p => p.phone && !p.email) && (
                      <button onClick={() => setStep('OUTREACH')} className="px-6 py-3 bg-scout-800 border border-scout-700 text-white rounded-xl font-bold text-sm hover:border-scout-600 transition-colors">
                        WhatsApp {savedPlayers.filter(p => p.phone && !p.email).length} Without Email
                      </button>
                    )}
                    <button onClick={() => { setStep('UPLOAD'); setExtractedPlayers([]); setSavedPlayers([]); setOutreachMessages([]); setEmailSent(false); }} className="px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm">
                      Import More
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
    </Wrapper>
  );
};
