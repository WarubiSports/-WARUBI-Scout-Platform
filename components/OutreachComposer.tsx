import React, { useState, useEffect } from 'react';
import { Player, UserProfile, OutreachLog } from '../types';
import {
  X, Copy, CheckCircle, MessageCircle, Send, Loader2,
  Zap, Globe, Link,
} from 'lucide-react';
import { generateOutreachMessage, AIUsageLimitError, OutreachOptions } from '../services/geminiService';
import { haptic } from '../hooks/useMobileFeatures';

const INTENTS = [
  { id: 'first_spark', title: 'First Spark', desc: 'Initial contact', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'invite_id', title: 'Invite to ID', desc: 'Event invitation', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { id: 'request_video', title: 'Request Video', desc: 'Highlight footage', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { id: 'follow_up', title: 'Follow-up', desc: 'Second spark', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
];

interface OutreachComposerProps {
  player: Player;
  user: UserProfile;
  onMessageSent: (id: string, log: Omit<OutreachLog, 'id'>) => void;
  onClose: () => void;
}

const MessageRenderer = ({ text }: { text: string }) => (
  <div className="font-mono text-sm text-emerald-400/90 leading-relaxed italic whitespace-pre-wrap">
    {text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="text-white font-black not-italic">{part.slice(2, -2)}</span>;
      }
      return part;
    })}
  </div>
);

const OutreachComposer: React.FC<OutreachComposerProps> = ({ player, user, onMessageSent, onClose }) => {
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [draftedMessage, setDraftedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outreachLang, setOutreachLang] = useState<'en' | 'de'>('en');
  const [includeSmartLink, setIncludeSmartLink] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleIntentClick = async (intentId: string) => {
    setActiveIntent(intentId);
    setIsLoading(true);
    setDraftedMessage('');
    setAiError(null);

    const intent = INTENTS.find(i => i.id === intentId);
    const smartLink = includeSmartLink ? `app.warubi-sports.com/audit?sid=${user.scoutId || 'demo'}&pid=${player.id}` : undefined;
    const outreachOptions: OutreachOptions = { scoutBio: user.bio, language: outreachLang };

    try {
      const message = await generateOutreachMessage(user.name, player, intent?.title || 'Intro', smartLink, outreachOptions);
      setDraftedMessage(message);
    } catch (e) {
      if (e instanceof AIUsageLimitError) {
        setAiError(e.message);
      }
      // Fallback template
      const position = player.position || 'player';
      const name = player.name;
      const hasCollege = user.bio?.toLowerCase().includes('college') || user.bio?.toLowerCase().includes('university');

      if (outreachLang === 'de') {
        setDraftedMessage(hasCollege
          ? `Hey ${name},\n\nich bin ${user.name} und arbeite mit Warubi Sports zusammen. Ich hab selbst College-Fußball in den USA gespielt und helfe jetzt Spielern wie dir, den richtigen Weg dorthin zu finden.\n\nDein Profil ist mir aufgefallen und ich denke, du hast echtes Potenzial als ${position}. Falls dich ein Wechsel in die USA interessiert, würde ich mich gerne mal mit dir unterhalten, wie das aussehen könnte.\n\n${smartLink ? `Hier kannst du deine kostenlose Talent-Einschätzung machen:\n${smartLink}\n` : ''}Kein Druck - will nur schauen, ob es passt.\n\nBeste Grüße,\n${user.name}`
          : `Hey ${name},\n\nich bin ${user.name} von Warubi Sports. Ich arbeite mit College-Trainern in den USA und dem International Talent Program von FC Köln zusammen, um Spielern die richtige Möglichkeit zu finden.\n\nDein Profil ist mir aufgefallen und ich denke, du hast echtes Potenzial als ${position}. Falls dich ein Wechsel in die USA interessiert, würde ich mich gerne mal mit dir unterhalten, wie das aussehen könnte.\n\n${smartLink ? `Hier kannst du deine kostenlose Talent-Einschätzung machen:\n${smartLink}\n` : ''}Kein Druck - will nur schauen, ob es passt.\n\nBeste Grüße,\n${user.name}`
        );
      } else {
        setDraftedMessage(hasCollege
          ? `Hey ${name},\n\nI'm ${user.name} and I work with Warubi Sports. I played college soccer in the US and now help players like you find the right path there.\n\nI came across your profile and think you've got real potential as a ${position}. If playing in the US is something you're interested in, I'd love to chat about what that could look like for you.\n\n${smartLink ? `Take 2 minutes to complete your free talent assessment:\n${smartLink}\n` : ''}No pressure - just want to see if it's a good fit.\n\nBest,\n${user.name}`
          : `Hey ${name},\n\nI'm ${user.name} with Warubi Sports. I work with college coaches across the US and FC Köln's International Talent Program to help players find the right opportunity.\n\nI came across your profile and think you've got real potential as a ${position}. If playing in the US is something you're interested in, I'd love to chat about what that could look like for you.\n\n${smartLink ? `Take 2 minutes to complete your free talent assessment:\n${smartLink}\n` : ''}No pressure - just want to see if it's a good fit.\n\nBest,\n${user.name}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate when smart link toggled
  useEffect(() => {
    if (activeIntent) handleIntentClick(activeIntent);
  }, [includeSmartLink]);

  const handleCopyAndLog = () => {
    if (!draftedMessage) return;
    navigator.clipboard.writeText(draftedMessage);
    setCopied(true);
    haptic.success();
    setTimeout(() => setCopied(false), 2000);

    onMessageSent(player.id, {
      date: new Date().toISOString(),
      method: 'Clipboard',
      templateName: 'Outreach Studio Draft',
      note: draftedMessage.substring(0, 50) + '...',
    });
  };

  const handleWhatsApp = () => {
    if (!draftedMessage) return;
    const phone = player.phone?.replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(draftedMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(draftedMessage)}`;
    window.open(url);

    onMessageSent(player.id, {
      date: new Date().toISOString(),
      method: 'WhatsApp',
      templateName: 'Outreach Studio Draft',
      note: draftedMessage.substring(0, 50) + '...',
    });
  };

  const handleEmail = () => {
    if (!draftedMessage) return;
    const email = player.email || '';
    window.open(`mailto:${email}?body=${encodeURIComponent(draftedMessage)}`);

    onMessageSent(player.id, {
      date: new Date().toISOString(),
      method: 'Email',
      templateName: 'Outreach Studio Draft',
      note: draftedMessage.substring(0, 50) + '...',
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[120]" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg z-[130] flex flex-col bg-scout-900 border-l border-scout-700 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-scout-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-scout-accent/20 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-scout-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-black text-sm truncate">{player.name}</h2>
              <p className="text-gray-400 text-xs">{player.position} · {player.age}yo{player.club ? ` · ${player.club}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-scout-800 text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-scout-700/50 shrink-0">
          {/* Language toggle */}
          <button
            onClick={() => { setOutreachLang(l => l === 'en' ? 'de' : 'en'); if (activeIntent) handleIntentClick(activeIntent); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-scout-800 text-xs font-bold text-gray-300 hover:text-white transition-colors"
          >
            <Globe size={12} />
            {outreachLang === 'en' ? 'EN' : 'DE'}
          </button>

          {/* Smart link toggle */}
          <button
            onClick={() => setIncludeSmartLink(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${includeSmartLink ? 'bg-scout-accent/20 text-scout-accent' : 'bg-scout-800 text-gray-400'}`}
          >
            <Link size={12} />
            Smart Link
          </button>
        </div>

        {/* Intent buttons */}
        <div className="grid grid-cols-4 gap-2 px-5 py-4 shrink-0">
          {INTENTS.map(intent => (
            <button
              key={intent.id}
              onClick={() => handleIntentClick(intent.id)}
              disabled={isLoading}
              className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${intent.color} ${activeIntent === intent.id ? 'ring-2 ring-white/50 border-white' : ''}`}
            >
              <div className="font-black text-[10px] uppercase tracking-tight">{intent.title}</div>
              <p className="text-[8px] opacity-70 mt-0.5 leading-tight">{intent.desc}</p>
            </button>
          ))}
        </div>

        {/* Message area */}
        <div className="flex-1 mx-5 mb-4 bg-scout-950 border border-scout-700 rounded-2xl p-5 flex flex-col overflow-hidden">
          {/* AI error */}
          {aiError && (
            <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
              {aiError} — using fallback template
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center gap-3 h-full justify-center text-gray-600 font-mono">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm">Drafting spark...</span>
              </div>
            ) : draftedMessage ? (
              <MessageRenderer text={draftedMessage} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <MessageCircle size={48} className="mb-3" />
                <p className="uppercase tracking-[0.2em] font-black text-[10px]">Select intent above</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {draftedMessage && !isLoading && (
            <div className="pt-4 flex gap-2 border-t border-scout-700 mt-3 shrink-0">
              <button
                onClick={handleCopyAndLog}
                className="flex-[2] bg-white hover:bg-gray-100 text-scout-900 font-black py-3 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copied ? 'Logged' : 'Copy'}
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 uppercase text-[10px]"
              >
                <MessageCircle size={14} /> WA
              </button>
              <button
                onClick={handleEmail}
                className="flex-1 bg-scout-700 hover:bg-scout-600 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 uppercase text-[10px]"
              >
                <Send size={14} /> Email
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OutreachComposer;
