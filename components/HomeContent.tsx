import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Zap, MapPin, Loader2 } from 'lucide-react';
import { useDashboardContext } from './DashboardLayout';
import { FunnelStrip } from './home/FunnelStrip';
import { WarmLeadsStrip } from './home/WarmLeadsStrip';

const PlayersContent = lazy(() => import('./PlayersContent'));

type HomeMode = 'blast' | 'field';

const STORAGE_KEY = 'scoutbuddy_home_mode';

const HomeContent: React.FC = () => {
  const { user, players, openBulkOutreach, submissionLink, handleCopyLink, linkCopied } = useDashboardContext();

  const [mode, setMode] = useState<HomeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'field' ? 'field' : 'blast') as HomeMode;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const assessmentLink = user.scoutId ? `https://app.warubi-sports.com?ref=${user.scoutId}` : '';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Funnel metrics — always visible */}
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
          {/* EE Link banner */}
          {assessmentLink && (
            <div className="bg-gradient-to-r from-scout-accent/10 to-transparent border border-scout-accent/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-scout-accent uppercase tracking-wider mb-0.5">Your ExposureEngine Link</p>
                <p className="text-[10px] text-gray-400 truncate">{assessmentLink}</p>
                <p className="text-[10px] text-gray-500 mt-1">Auto-included in every email you send</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="shrink-0 px-4 py-2 bg-scout-accent/20 border border-scout-accent/40 rounded-lg text-scout-accent text-xs font-bold hover:bg-scout-accent/30 transition-colors"
              >
                {linkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Big blast CTA */}
          <button
            onClick={openBulkOutreach}
            className="w-full py-6 bg-gradient-to-br from-scout-accent to-emerald-500 text-scout-900 rounded-2xl font-black uppercase text-lg flex items-center justify-center gap-3 shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Zap size={24} />
            Import Roster & Blast Outreach
          </button>
          <p className="text-center text-gray-500 text-[10px]">
            Upload a roster, review, and email all players in under 30 seconds
          </p>

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
