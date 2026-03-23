import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Zap, MapPin, Loader2, Share2, MessageCircle, Mail, Copy, Check, X } from 'lucide-react';
import { useDashboardContext } from './DashboardLayout';
import { FunnelStrip } from './home/FunnelStrip';
import { WarmLeadsStrip } from './home/WarmLeadsStrip';
import { BulkOutreachFlow } from './BulkOutreachFlow';
import { FirstRunGuide } from './home/FirstRunGuide';

const PlayersContent = lazy(() => import('./PlayersContent'));

type HomeMode = 'blast' | 'field';

const STORAGE_KEY = 'scoutbuddy_home_mode';

const HomeContent: React.FC = () => {
  const { user, players, submissionLink, handleCopyLink, linkCopied } = useDashboardContext();

  const [mode, setMode] = useState<HomeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'field' ? 'field' : 'blast') as HomeMode;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const importRef = useRef<HTMLDivElement>(null);
  const scrollToImport = () => importRef.current?.scrollIntoView({ behavior: 'smooth' });

  const [shareOpen, setShareOpen] = useState(false);

  const handleShareLink = async () => {
    const text = "Free Career Analysis for Soccer Players — see where you'd fit at the college or academy level.";
    // Try native share (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ExposureEngine — Free Career Analysis', text, url: assessmentLink });
        return;
      } catch { /* user cancelled or not supported */ }
    }
    // Fallback: show share menu
    setShareOpen(prev => !prev);
  };

  const shareViaWhatsApp = () => {
    const msg = encodeURIComponent(`Check this out — free career analysis for soccer players: ${assessmentLink}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
    setShareOpen(false);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Free Career Analysis — ExposureEngine');
    const body = encodeURIComponent(`Hey,

Check out this free tool — it shows players where they'd fit at the college or academy level:

${assessmentLink}

Let me know what you think.`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShareOpen(false);
  };

  const shareViaSMS = () => {
    const msg = encodeURIComponent(`Free career analysis for soccer players: ${assessmentLink}`);
    window.open(`sms:?&body=${msg}`);
    setShareOpen(false);
  };

  const assessmentLink = user.scoutId ? `https://app.warubi-sports.com?ref=${user.scoutId}` : '';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Funnel metrics */}
      <FunnelStrip players={players} />

      {/* Mode toggle */}
      <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex">
        <button
          onClick={() => setMode('blast')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all ${
            mode === 'blast'
              ? 'bg-scout-accent text-scout-900 shadow-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap size={18} />
          Blast Mode
        </button>
        <button
          onClick={() => setMode('field')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all ${
            mode === 'field'
              ? 'bg-scout-accent text-scout-900 shadow-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MapPin size={18} />
          Field Mode
        </button>
      </div>

      {/* Mode content */}
      {mode === 'blast' ? (
        <div className="space-y-4">
          {/* First-run guide for new scouts */}
          {players.length === 0 && assessmentLink && (
            <FirstRunGuide
              assessmentLink={assessmentLink}
              onCopyLink={handleCopyLink}
              linkCopied={linkCopied}
              onStartImport={scrollToImport}
              hasPlayers={false}
            />
          )}

          {/* EE Link banner — tap to share */}
          {players.length > 0 && assessmentLink && (
            <div className="relative">
              <button
                onClick={handleShareLink}
                className="w-full bg-gradient-to-r from-scout-accent/10 to-transparent border border-scout-accent/30 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-scout-accent/60 active:scale-[0.99] transition-all cursor-pointer text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-scout-accent uppercase tracking-wider mb-0.5">Your ExposureEngine Link</p>
                  <p className="text-[10px] text-gray-400 truncate">{assessmentLink}</p>
                </div>
                <div className="shrink-0 px-4 py-2 bg-scout-accent text-scout-900 rounded-lg text-xs font-black flex items-center gap-1.5">
                  <Share2 size={14} /> Share Now
                </div>
              </button>

              {/* Share dropdown */}
              {shareOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-scout-800 border border-scout-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <button onClick={shareViaWhatsApp} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors">
                    <MessageCircle size={18} className="text-green-400" /> WhatsApp
                  </button>
                  <button onClick={shareViaEmail} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors">
                    <Mail size={18} className="text-blue-400" /> Email
                  </button>
                  <button onClick={shareViaSMS} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors">
                    <MessageCircle size={18} className="text-yellow-400" /> SMS
                  </button>
                  <button onClick={() => { handleCopyLink(); setShareOpen(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors border-t border-scout-700">
                    {linkCopied ? <><Check size={18} className="text-scout-accent" /> Copied!</> : <><Copy size={18} className="text-gray-400" /> Copy Link</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inline bulk import + outreach flow */}
          <div ref={importRef}>
            <BulkOutreachFlow
              scoutId={user.scoutId}
              scoutName={user.name}
              scoutBio={user.bio}
              onClose={() => {}}
              inline
            />
          </div>

          {/* Warm leads */}
          <WarmLeadsStrip players={players} />
        </div>
      ) : (
        <Suspense fallback={<div className="flex items-center justify-center py-12 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>}>
          <PlayersContent />
        </Suspense>
      )}
    </div>
  );
};

export default HomeContent;
