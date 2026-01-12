
import React, { useState, useEffect, useRef } from 'react';
import { Player, UserProfile, OutreachLog, PlayerStatus } from '../types';
import {
    Search, Sparkles, Copy, CheckCircle, MessageCircle, Send, Link,
    Clock, Upload, Loader2, X, Trash2, Smartphone,
    MousePointer, Zap, ArrowRight, Check, Flame, Ghost, HelpCircle,
    ChevronDown, LayoutList, Plus, TrendingUp, Info, Trophy, FileText, Camera,
    RotateCcw, Users, Globe, FileUp, Clipboard
} from 'lucide-react';
import { generateOutreachMessage, extractPlayersFromBulkData, extractRosterFromPhoto, AIUsageLimitError } from '../services/geminiService';
import { CompactErrorBoundary } from './ErrorBoundary';
import { handleMobileFocus } from '../hooks/useMobileFeatures';

interface OutreachTabProps {
  players: Player[];
  user: UserProfile;
  initialPlayerId?: string | null;
  onMessageSent: (id: string, log: Omit<OutreachLog, 'id'>) => void;
  onAddPlayers: (players: Player[]) => void;
  onStatusChange?: (id: string, newStatus: PlayerStatus) => void;
}

const INTENTS = [
  { id: 'first_spark', title: 'First Spark', desc: 'Initial contact message', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'invite_id', title: 'Invite to ID', desc: 'Formal invitation to event', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { id: 'request_video', title: 'Request Video', desc: 'Ask for highlight footage', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { id: 'follow_up', title: 'Follow-up', desc: 'Second spark after no signal', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
];

const OutreachTab: React.FC<OutreachTabProps> = ({ players, user, initialPlayerId, onMessageSent, onAddPlayers, onStatusChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialPlayerId || null);
  const [draftedMessage, setDraftedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [includeSmartLink, setIncludeSmartLink] = useState(true);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [ingestionMode, setIngestionMode] = useState<'LIST' | 'DROPZONE' | 'PROCESSING' | 'REVIEW' | 'LINK'>('LIST');
  const [extractedProspects, setExtractedProspects] = useState<Partial<Player>[]>([]);
  const [rosterUrl, setRosterUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Process the dropped file
    setIngestionMode('PROCESSING');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result?.toString().split(',')[1];
      if (!base64Data) return;

      try {
        let prospects: Partial<Player>[] = [];
        if (file.type.startsWith('image/')) {
          prospects = await extractRosterFromPhoto(base64Data, file.type);
        } else {
          // If it's CSV or text, we can pass it as a bulk string to Gemini
          const text = atob(base64Data);
          prospects = await extractPlayersFromBulkData(text, false);
        }
        setExtractedProspects(prospects);
        setIngestionMode('REVIEW');
      } catch (error) {
        console.error("Extraction failed", error);
        setIngestionMode('DROPZONE');
      }
    };
    reader.readAsDataURL(file);
  };
  
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  // Prevent browser from opening files when dropped outside dropzone
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add listeners to prevent default drag behavior
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  // Grouping for the Sidebar - leads with different activity levels
  const leadPool = players.filter(p => p.status === PlayerStatus.LEAD);
  
  const spotlights = leadPool.filter(p => p.activityStatus === 'spotlight');
  const signals = leadPool.filter(p => p.activityStatus === 'signal');
  const sparks = leadPool.filter(p => p.activityStatus === 'spark');
  const undiscovered = leadPool.filter(p => !p.activityStatus || p.activityStatus === 'undiscovered');

  const filteredUndiscovered = undiscovered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSparks = sparks.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSignals = signals.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSpotlights = spotlights.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIngestionMode('PROCESSING');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64Data = event.target?.result?.toString().split(',')[1];
        if (!base64Data) return;

        try {
            let prospects: Partial<Player>[] = [];
            if (file.type.startsWith('image/')) {
                prospects = await extractRosterFromPhoto(base64Data, file.type);
            } else {
                // If it's CSV or text, we can pass it as a bulk string to Gemini
                const text = atob(base64Data);
                prospects = await extractPlayersFromBulkData(text, false);
            }
            setExtractedProspects(prospects);
            setIngestionMode('REVIEW');
        } catch (error) {
            console.error("Extraction failed", error);
            setIngestionMode('DROPZONE');
        }
    };
    reader.readAsDataURL(file);
  };

  const handleLinkExtraction = async () => {
      if (!rosterUrl.trim()) return;
      setIngestionMode('PROCESSING');
      try {
          // AI extracts from the provided URL content (simulated via intent)
          const prospects = await extractPlayersFromBulkData(`Extract from this roster URL: ${rosterUrl}`, false);
          setExtractedProspects(prospects);
          setIngestionMode('REVIEW');
      } catch (error) {
          console.error("Link extraction failed", error);
          setIngestionMode('LINK');
      }
  };

  const handleIntentClick = async (intentId: string) => {
    if (!selectedPlayer) return;
    setActiveIntent(intentId);
    setIsLoading(true);
    setDraftedMessage('');
    setAiError(null);

    const intent = INTENTS.find(i => i.id === intentId);
    const smartLink = includeSmartLink ? `app.warubi-sports.com/audit?sid=${user.scoutId || 'demo'}&pid=${selectedPlayer.id}` : undefined;

    try {
        const message = await generateOutreachMessage(user.name, selectedPlayer, intent?.title || 'Intro', smartLink);
        setDraftedMessage(message);
        setIsTyping(true);
    } catch (e) {
        // Handle AI usage limit specifically
        if (e instanceof AIUsageLimitError) {
            setAiError(e.message);
        }
        // Use fallback template
        const smartLink = includeSmartLink ? `app.warubi-sports.com/audit?sid=${user.scoutId || 'demo'}&pid=${selectedPlayer.id}` : '';
        setDraftedMessage(`Hi ${selectedPlayer.name},

I'm ${user.name} with Warubi Sports. I work with FC Köln's International Talent Program and over 200 college programs across the US.

I came across your profile and wanted to reach out about some opportunities for a ${selectedPlayer.position || 'player'} with your potential. We've helped place over 200 players this year into pro development programs and college scholarships.

${smartLink ? `Take 2 minutes to complete your free talent assessment:\n${smartLink}\n` : ''}Would love to hear about your goals.

Best,
${user.name}`);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      if (activeIntent && selectedPlayer) {
          handleIntentClick(activeIntent);
      }
  }, [includeSmartLink]);

  const handleCopyAndLog = () => {
    if (!selectedPlayer || !draftedMessage) return;
    
    navigator.clipboard.writeText(draftedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    onMessageSent(selectedPlayer.id, {
        date: new Date().toISOString(),
        method: 'Clipboard',
        templateName: 'Outreach Studio Draft',
        note: draftedMessage.substring(0, 50) + '...'
    });
  };

  const promoteToSpotlight = () => {
      if (selectedPlayer && onStatusChange) {
          onStatusChange(selectedPlayer.id, PlayerStatus.LEAD);
          setSelectedPlayerId(null);
          setDraftedMessage('');
          setActiveIntent(null);
      }
  };

  const handleConfirmIngestion = () => {
    const newPlayers: Player[] = extractedProspects.map((p, i) => ({
        id: `ingested-${Date.now()}-${i}`,
        name: p.name || 'Unknown Ghost',
        age: p.age || 17,
        position: p.position || 'ST',
        status: PlayerStatus.LEAD,
        submittedAt: new Date().toISOString(),
        outreachLogs: [],
        evaluation: null,
        activityStatus: 'undiscovered'
    }));
    onAddPlayers(newPlayers);
    setIngestionMode('LIST');
    setExtractedProspects([]);
  };

  const MessageRenderer = ({ text }: { text: string }) => {
      return (
          <div className="font-mono text-sm md:text-base text-emerald-400/90 leading-relaxed italic whitespace-pre-wrap">
              {text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                      return <span key={i} className="text-white font-black not-italic">{part.slice(2, -2)}</span>;
                  }
                  return part;
              })}
          </div>
      );
  };

  return (
    <div className="flex h-full gap-6 animate-fade-in flex-col overflow-hidden relative z-0">
      
      {/* Workflow Ribbon */}
      <div className="bg-scout-800/50 border border-scout-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-scout-accent/10 rounded-xl flex items-center justify-center text-scout-accent border border-scout-accent/20">
                  <Info size={20} />
              </div>
              <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Talent Spotlight Protocol</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bridging the Gap from Shadow to Lead</p>
              </div>
          </div>
          <div className="flex gap-4 md:gap-12">
              {[
                  { i: <Ghost size={16}/>, l: '1. Undiscovered', s: 'Hidden Talent', c: 'text-gray-500' },
                  { i: <Zap size={16}/>, l: '2. Spark', s: 'Initial Contact', c: 'text-yellow-500' },
                  { i: <Flame size={16} className="animate-pulse"/>, l: '3. Signal', s: 'Click Detected', c: 'text-orange-500' },
                  { i: <Trophy size={16} className="text-scout-accent"/>, l: '4. Spotlight', s: 'Data Verified', c: 'text-scout-accent' }
              ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                      <div className={`flex items-center gap-1.5 font-black uppercase text-[10px] mb-1 ${step.c}`}>
                          {step.i} {step.l}
                      </div>
                      <span className="text-[8px] text-gray-600 font-mono tracking-tighter">{step.s}</span>
                  </div>
              ))}
          </div>
          <button onClick={() => setShowGuide(!showGuide)} className="text-gray-600 hover:text-white transition-colors"><HelpCircle size={18}/></button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* LEFT: UNIFIED SIDEBAR */}
        <CompactErrorBoundary name="Discovery Pool">
        <div className="w-1/3 bg-scout-800 rounded-[2rem] border border-scout-700 flex flex-col overflow-hidden shadow-2xl shrink-0">
            <div className="p-4 border-b border-scout-700 bg-scout-900/50">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Users className="text-scout-highlight" size={18} />
                        <h3 className="font-black text-white uppercase tracking-tighter italic">Discovery Pool</h3>
                    </div>
                    <div className="flex bg-scout-800 p-1 rounded-xl border border-scout-700">
                        <button onClick={() => setIngestionMode('LIST')} className={`p-2 rounded-lg transition-all ${ingestionMode === 'LIST' ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><LayoutList size={16} /></button>
                        <button onClick={() => setIngestionMode('DROPZONE')} className={`p-2 rounded-lg transition-all ${ingestionMode !== 'LIST' ? 'bg-scout-accent text-scout-900' : 'text-gray-500 hover:text-gray-300'}`}><Plus size={16} /></button>
                    </div>
                </div>
                {ingestionMode === 'LIST' && (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input type="text" placeholder="Search uncontacted..." className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-scout-accent transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={handleMobileFocus} />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {ingestionMode === 'LIST' ? (
                    <div className="pb-10">
                        {/* 1. SPOTLIGHTS */}
                        {filteredSpotlights.length > 0 && (
                            <div className="bg-scout-accent/5 pb-2">
                                <div className="px-6 py-4 flex items-center gap-2 border-b border-scout-accent/10">
                                    <Trophy size={14} className="text-scout-accent" />
                                    <h4 className="text-[10px] font-black text-scout-accent uppercase tracking-widest">Spotlight Ready</h4>
                                </div>
                                {filteredSpotlights.map(p => (
                                    <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`p-5 cursor-pointer transition-all border-l-4 ${selectedPlayerId === p.id ? 'border-scout-accent bg-scout-accent/10' : 'border-transparent bg-scout-accent/5'} flex items-center justify-between group`}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{p.name}</p>
                                            <p className="text-[9px] text-scout-accent font-black uppercase">Verified • View Report</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 2. SIGNALS */}
                        {filteredSignals.length > 0 && (
                            <div className="bg-orange-500/5 pb-2">
                                <div className="px-6 py-4 flex items-center gap-2 border-b border-orange-500/10">
                                    <Flame size={14} className="text-orange-500" />
                                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Active Signals</h4>
                                </div>
                                {filteredSignals.map(p => (
                                    <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`p-5 cursor-pointer transition-all border-l-4 signal-pulse ${selectedPlayerId === p.id ? 'border-orange-500 bg-orange-500/10' : 'border-transparent bg-orange-500/5'} flex items-center justify-between group`}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{p.name}</p>
                                            <p className="text-[9px] text-orange-400 font-black uppercase">Interacting • Live</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3. SPARKS */}
                        {filteredSparks.length > 0 && (
                            <div className="pb-2">
                                <div className="px-6 py-4 flex items-center gap-2">
                                    <Zap size={14} className="text-yellow-500" />
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sparks Sent</h4>
                                </div>
                                {filteredSparks.map(p => (
                                    <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`p-5 cursor-pointer transition-all hover:bg-scout-700/30 flex items-center border-l-4 ${selectedPlayerId === p.id ? 'border-yellow-500 bg-yellow-500/5' : 'border-transparent'}`}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{p.name}</p>
                                            <p className="text-[9px] text-gray-500 uppercase font-black">Waiting for Click</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 4. UNDISCOVERED */}
                        <div className="px-6 py-4 border-t border-scout-700/30 flex items-center gap-2 mt-4">
                            <Ghost size={14} className="text-gray-600" />
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Undiscovered</h4>
                        </div>
                        <div className="divide-y divide-scout-700/30">
                            {filteredUndiscovered.map(p => (
                                <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`p-5 cursor-pointer transition-all hover:bg-scout-700/50 flex items-center opacity-60 grayscale border-l-4 ${selectedPlayerId === p.id ? 'border-white/20 bg-white/5 grayscale-0 opacity-100' : 'border-transparent'}`}>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold truncate text-white">{p.name}</h4>
                                        <p className="text-[9px] text-gray-500 font-black uppercase">{p.position} • {p.age}yo</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : ingestionMode === 'DROPZONE' ? (
                    <div className="p-6 h-full flex flex-col animate-fade-in space-y-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`w-full py-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group ${
                                isDragging
                                    ? 'border-scout-accent bg-scout-accent/10 scale-[1.02]'
                                    : 'border-scout-700 hover:border-scout-accent hover:bg-scout-accent/5'
                            }`}
                        >
                            <div className={`w-12 h-12 bg-scout-900 rounded-2xl flex items-center justify-center transition-all ${
                                isDragging ? 'text-scout-accent' : 'text-gray-500 group-hover:text-scout-accent'
                            }`}>
                                <FileUp size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-black uppercase text-xs tracking-widest">
                                    {isDragging ? 'Drop File Here' : 'Upload Roster File'}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {isDragging ? 'Release to upload' : 'Drag & drop or click • Image, PDF, or CSV'}
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setIngestionMode('LINK')}
                            className="w-full py-12 border-2 border-dashed border-scout-700 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-400/5 transition-all cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-scout-900 rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-blue-400 transition-all">
                                <Globe size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-black uppercase text-xs tracking-widest">Paste Roster Link</p>
                                <p className="text-[10px] text-gray-500 mt-1">AI will extract from URL</p>
                            </div>
                        </div>

                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.csv,.txt" onChange={handleFileUpload} />
                        
                        <button onClick={() => setIngestionMode('LIST')} className="w-full py-4 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                             <LayoutList size={14}/> Back to Pool
                        </button>
                    </div>
                ) : ingestionMode === 'LINK' ? (
                    <div className="p-8 h-full flex flex-col animate-fade-in space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Import via Link</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">Provide a URL to a club roster or tournament page. AI will scan the content for player identities.</p>
                            <div className="relative">
                                <Globe className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="https://club-soccer.com/u17-roster"
                                    className="w-full bg-scout-900 border-2 border-scout-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400 transition-all"
                                    value={rosterUrl}
                                    onChange={(e) => setRosterUrl(e.target.value)}
                                    onFocus={handleMobileFocus}
                                />
                            </div>
                            <button 
                                onClick={handleLinkExtraction}
                                disabled={!rosterUrl.trim()}
                                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                            >
                                <Sparkles size={16}/> Extract Talent
                            </button>
                        </div>
                        <button onClick={() => setIngestionMode('DROPZONE')} className="w-full py-4 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                             <ChevronDown size={14} className="rotate-90" /> Other Methods
                        </button>
                    </div>
                ) : ingestionMode === 'REVIEW' ? (
                    <div className="p-6 h-full flex flex-col animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                             <h3 className="text-sm font-black text-white uppercase italic">Discovery Review</h3>
                             <span className="bg-scout-accent text-scout-900 text-[10px] px-2 py-0.5 rounded font-black">{extractedProspects.length} Found</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mb-6">
                            {extractedProspects.map((p, i) => (
                                <div key={i} className="bg-scout-900/50 p-3 rounded-xl border border-scout-700 flex justify-between items-center">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{p.name || 'Unknown'}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">{p.position || 'ST'} • {p.age || '17'}yo</p>
                                    </div>
                                    <button onClick={() => setExtractedProspects(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <button onClick={handleConfirmIngestion} className="w-full bg-scout-accent text-scout-900 font-black py-4 rounded-2xl shadow-glow uppercase text-xs tracking-widest">
                                Confirm & Add to Pool
                            </button>
                            <button onClick={() => setIngestionMode('DROPZONE')} className="w-full text-gray-500 hover:text-white text-[10px] font-black uppercase">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                        <Loader2 className="w-12 h-12 text-scout-accent animate-spin" />
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter">AI Extraction Engine...</h3>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest">Structuring talent data</p>
                    </div>
                )}
            </div>
        </div>
        </CompactErrorBoundary>

        {/* RIGHT: COMMAND CONSOLE */}
        <CompactErrorBoundary name="Message Console">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">
            {!selectedPlayer ? (
                <div className="flex-1 bg-scout-800/30 rounded-[3rem] border border-scout-700 border-dashed flex flex-col items-center justify-center text-center p-12 opacity-50">
                    <MousePointer size={64} className="text-gray-700 mb-6" />
                    <h3 className="text-2xl font-black text-gray-500 uppercase tracking-tighter italic">Select Talent to Spark</h3>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-4 animate-fade-in overflow-hidden">
                    {/* SPOTLIGHT PROMOTION BANNER */}
                    {(selectedPlayer.activityStatus === 'signal' || selectedPlayer.activityStatus === 'spotlight') && (
                        <div className="bg-emerald-500/10 border-2 border-scout-accent/30 rounded-3xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 overflow-hidden group">
                             <div className="flex items-center gap-4 relative z-10">
                                 <div className="w-10 h-10 bg-scout-accent/20 rounded-full flex items-center justify-center text-scout-accent border border-scout-accent/30">
                                     {selectedPlayer.activityStatus === 'spotlight' ? <Trophy size={20} /> : <Flame size={20} className="animate-pulse-fast" />}
                                 </div>
                                 <div>
                                     <h4 className="text-base font-black text-white uppercase tracking-tighter italic leading-none">
                                         {selectedPlayer.activityStatus === 'spotlight' ? 'Spotlight Ready' : 'Signal Detected'}
                                     </h4>
                                     <p className="text-[10px] text-gray-400 font-medium mt-1">
                                         {selectedPlayer.activityStatus === 'spotlight' ? 'Player has completed the assessment.' : 'Player clicked the Spark link.'}
                                     </p>
                                 </div>
                             </div>
                             <button 
                                onClick={promoteToSpotlight}
                                className="px-6 py-2 bg-scout-accent hover:bg-emerald-600 text-scout-900 font-black rounded-xl shadow-glow relative z-10 transition-all flex items-center gap-2 uppercase text-[10px] tracking-widest"
                             >
                                <Trophy size={14}/> Promote to Pipeline
                             </button>
                        </div>
                    )}

                    {/* CONSOLE HEADER */}
                    <div className={`p-4 md:p-6 bg-scout-800 border-2 rounded-[2.5rem] shrink-0 transition-all duration-500 ${selectedPlayer.activityStatus === 'spotlight' ? 'border-scout-accent shadow-glow' : 'border-scout-700'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4 md:gap-6 items-center">
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-scout-900 border-2 border-scout-700 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl">
                                    {selectedPlayer.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic leading-tight">{selectedPlayer.name}</h2>
                                    <div className="flex gap-2 mt-1.5 flex-wrap">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest border border-gray-700 px-1.5 py-0.5 rounded">{selectedPlayer.position}</span>
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest border border-gray-700 px-1.5 py-0.5 rounded">{selectedPlayer.age} Years Old</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${selectedPlayer.activityStatus === 'spotlight' ? 'bg-scout-accent/10 text-scout-accent' : 'bg-gray-700 text-gray-400'}`}>
                                            {selectedPlayer.activityStatus === 'spotlight' ? 'Spotlight Verified' : selectedPlayer.activityStatus === 'signal' ? 'Signal Active' : selectedPlayer.activityStatus === 'spark' ? 'Spark Sent' : 'Undiscovered Ghost'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPlayerId(null)}
                                className="p-2 text-gray-500 hover:text-white hover:bg-scout-700 rounded-xl transition-colors"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* INTENT BAR */}
                    <div className="grid grid-cols-4 gap-3 shrink-0 relative z-10">
                        {INTENTS.map(intent => (
                            <button 
                                key={intent.id}
                                onClick={() => handleIntentClick(intent.id)}
                                disabled={isLoading}
                                className={`p-3 md:p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${intent.color} ${activeIntent === intent.id ? 'ring-2 ring-white/50 border-white' : ''} group relative overflow-hidden`}
                            >
                                <div className="font-black text-[10px] md:text-xs uppercase tracking-tight relative z-10">{intent.title}</div>
                                <p className="text-[8px] md:text-[9px] opacity-70 mt-1 relative z-10 leading-tight hidden md:block">{intent.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* AI TERMINAL */}
                    <div className="flex-1 bg-scout-950 border border-scout-700 rounded-[2rem] p-6 md:p-8 relative flex flex-col shadow-inner overflow-hidden">
                        <div className="absolute top-4 left-6 flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-scout-warning/50"></div>
                            <div className="w-2 h-2 rounded-full bg-scout-highlight/50"></div>
                            <div className="w-2 h-2 rounded-full bg-scout-accent/50"></div>
                        </div>

                        {/* Terminal Header Controls */}
                        <div className="absolute top-4 right-6 flex items-center gap-4 z-10">
                            <div className="text-[9px] font-mono text-gray-700 uppercase tracking-widest hidden lg:block">Outreach v3.0</div>
                        </div>

                        {/* AI LIMIT WARNING */}
                        {aiError && (
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                                <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-amber-400 mb-1">AI Credits Depleted</p>
                                    <p className="text-[10px] text-amber-300/70">{aiError}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Using template message instead.</p>
                                </div>
                                <button onClick={() => setAiError(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                            </div>
                        )}

                        {/* CONTENT AREA - SCROLLABLE */}
                        <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar">
                            {isLoading ? (
                                <div className="flex items-center gap-3 h-full justify-center text-gray-600 font-mono">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span className="text-sm">Drafting tactical spark...</span>
                                </div>
                            ) : draftedMessage ? (
                                <MessageRenderer text={draftedMessage} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <MessageCircle size={64} className="mb-4" />
                                    <p className="uppercase tracking-[0.3em] font-black text-xs">Select Intent to Spark Player</p>
                                </div>
                            )}
                        </div>

                        {/* ACTION FOOTER */}
                        {draftedMessage && !isLoading && (
                            <div className="pt-6 flex gap-3 border-t border-scout-700 mt-4 shrink-0 bg-scout-950/80 backdrop-blur-sm relative z-20">
                                <button 
                                    onClick={handleCopyAndLog}
                                    className="flex-[2] bg-white hover:bg-gray-100 text-scout-900 font-black py-3 md:py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 md:gap-3 uppercase tracking-widest text-xs md:text-sm"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />} {copied ? 'Logged' : 'Copy Spark'}
                                </button>
                                <button 
                                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(draftedMessage)}`)}
                                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-3 md:py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase text-[10px]"
                                >
                                    <MessageCircle size={16}/> <span className="hidden md:inline">WhatsApp</span>
                                </button>
                                <button 
                                    onClick={() => window.open(`mailto:?body=${encodeURIComponent(draftedMessage)}`)}
                                    className="flex-1 bg-scout-700 hover:bg-scout-600 text-white font-black py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase text-[10px]"
                                >
                                    <Send size={16}/> <span className="hidden md:inline">Email</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        </CompactErrorBoundary>
      </div>
    </div>
  );
};

export default OutreachTab;
