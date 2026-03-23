import React, { useRef, useState } from 'react';
import { Share2, MessageCircle, Mail, Copy, Check, X, Users, DollarSign, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardContext } from './DashboardLayout';
import { FunnelStrip } from './home/FunnelStrip';
import { WarmLeadsStrip } from './home/WarmLeadsStrip';
import { BulkOutreachFlow } from './BulkOutreachFlow';
import { FirstRunGuide } from './home/FirstRunGuide';

const HomeContent: React.FC = () => {
  const { user, players, handleCopyLink, linkCopied, earnings } = useDashboardContext();
  const navigate = useNavigate();

  const importRef = useRef<HTMLDivElement>(null);
  const scrollToImport = () => importRef.current?.scrollIntoView({ behavior: 'smooth' });

  const [shareOpen, setShareOpen] = useState(false);
  const assessmentLink = user.scoutId ? `https://app.warubi-sports.com?ref=${user.scoutId}` : '';

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ExposureEngine — Free Career Analysis', text: "Free Career Analysis for Soccer Players", url: assessmentLink });
        return;
      } catch { /* cancelled */ }
    }
    setShareOpen(prev => !prev);
  };

  const shareVia = (url: string) => { window.open(url, '_blank'); setShareOpen(false); };

  const contacted = players.filter(p => p.outreachLogs?.length > 0 || p.lastContactedAt).length;
  const eeActivity = players.filter(p => p.activityStatus && p.activityStatus !== 'undiscovered').length;
  const hasData = contacted >= 3 || eeActivity >= 3;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Earnings strip — always visible when scout has agreement */}
      {earnings.hasAgreement && (
        <button
          onClick={() => navigate('/dashboard/my-business')}
          className="w-full bg-scout-800 border border-scout-700 rounded-xl p-4 flex items-center gap-4 hover:border-scout-accent/40 active:scale-[0.99] transition-all text-left group"
        >
          <div className="p-2.5 bg-scout-accent/10 rounded-xl">
            <DollarSign size={20} className="text-scout-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">
                {earnings.currency === 'USD' ? '$' : '€'}{earnings.total.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">pipeline value</span>
            </div>
            <div className="flex gap-3 mt-1 text-[11px]">
              <span className="text-scout-accent font-bold">{earnings.currency === 'USD' ? '$' : '€'}{earnings.placed.toLocaleString()} earned</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400">{earnings.placedCount} placed</span>
              {earnings.pipelineCount > 0 && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-400">{earnings.pipelineCount} in pipeline</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-600 group-hover:text-scout-accent transition-colors shrink-0" />
        </button>
      )}

      {/* No agreement — nudge to activate */}
      {!earnings.hasAgreement && players.length > 0 && (
        <button
          onClick={() => navigate('/dashboard/my-business')}
          className="w-full bg-scout-800/50 border border-dashed border-scout-700 rounded-xl p-4 flex items-center gap-3 hover:border-scout-accent/30 active:scale-[0.99] transition-all text-left group"
        >
          <TrendingUp size={18} className="text-gray-500" />
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400">Activate your license to track earnings</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Every player you place earns you compensation</p>
          </div>
          <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
        </button>
      )}

      {/* Funnel metrics — only show when there's actual data */}
      {hasData && <FunnelStrip players={players} />}

      {/* First-run guide for new scouts (0 players) */}
      {players.length === 0 && assessmentLink && (
        <FirstRunGuide
          assessmentLink={assessmentLink}
          onCopyLink={handleCopyLink}
          linkCopied={linkCopied}
          onStartImport={scrollToImport}
          hasPlayers={false}
        />
      )}

      {/* EE Link — share action */}
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
          {shareOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-scout-800 border border-scout-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              <button onClick={() => shareVia(`https://wa.me/?text=${encodeURIComponent(`Check this out — free career analysis for soccer players: ${assessmentLink}`)}`)} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors">
                <MessageCircle size={18} className="text-green-400" /> WhatsApp
              </button>
              <button onClick={() => shareVia(`mailto:?subject=${encodeURIComponent('Free Career Analysis — ExposureEngine')}&body=${encodeURIComponent(`Hey,\n\nCheck out this free tool:\n\n${assessmentLink}\n\nLet me know what you think.`)}`)} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors">
                <Mail size={18} className="text-blue-400" /> Email
              </button>
              <button onClick={() => shareVia(`sms:?&body=${encodeURIComponent(`Free career analysis for soccer players: ${assessmentLink}`)}`)} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors">
                <MessageCircle size={18} className="text-yellow-400" /> SMS
              </button>
              <button onClick={() => { handleCopyLink(); setShareOpen(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-scout-700 transition-colors border-t border-scout-700">
                {linkCopied ? <><Check size={18} className="text-scout-accent" /> Copied!</> : <><Copy size={18} className="text-gray-400" /> Copy Link</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Import & Send */}
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

      {/* View all players link */}
      {players.length > 0 && (
        <button
          onClick={() => navigate('/dashboard/players/all')}
          className="w-full py-3 text-center text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <Users size={14} /> View All {players.length} Players
        </button>
      )}
    </div>
  );
};

export default HomeContent;
