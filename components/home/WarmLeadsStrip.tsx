import React, { useMemo } from 'react';
import { Flame, ArrowRight, MessageSquare, Share2 } from 'lucide-react';
import { Player } from '../../types';

interface WarmLeadsStripProps {
  players: Player[];
}

export const WarmLeadsStrip: React.FC<WarmLeadsStripProps> = ({ players }) => {
  const warmLeads = useMemo(() => {
    return players
      .filter(p => p.activityStatus && p.activityStatus !== 'undiscovered')
      .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0));
  }, [players]);

  if (warmLeads.length === 0) {
    return (
      <div className="bg-scout-800/50 border border-scout-700 rounded-xl p-5 text-center">
        <Flame size={28} className="mx-auto text-gray-600 mb-2" />
        <p className="text-sm font-bold text-gray-400">No warm leads yet</p>
        <p className="text-[10px] text-gray-500 mt-1">
          When players complete their ExposureEngine assessment, they'll appear here — ready for follow-up.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Flame size={16} className="text-orange-400" />
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Warm Leads</h3>
        <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full">{warmLeads.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {warmLeads.map((player) => (
          <div
            key={player.id}
            className="shrink-0 w-48 bg-scout-800 border border-scout-700 rounded-xl p-3 hover:border-scout-accent/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center text-xs font-black text-orange-400 shrink-0">
                  {player.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{player.name}</p>
                  <p className="text-[10px] text-gray-500">{player.position || 'Unknown'}</p>
                </div>
              </div>
            </div>
            {player.evaluation?.score != null && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-scout-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                    style={{ width: `${player.evaluation.score}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-orange-400">{player.evaluation.score}</span>
              </div>
            )}
            <div className="flex gap-1.5">
              {player.phone && (
                <a
                  href={`https://wa.me/${player.phone.replace(/[^\d+]/g, '').replace(/^\+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[10px] font-bold text-center hover:bg-green-500/20 transition-colors"
                >
                  WhatsApp
                </a>
              )}
              {player.email && (
                <a
                  href={`mailto:${player.email}`}
                  className="flex-1 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-bold text-center hover:bg-blue-500/20 transition-colors"
                >
                  Email
                </a>
              )}
              {!player.phone && !player.email && (
                <span className="flex-1 py-1.5 text-gray-600 text-[10px] text-center">No contact info</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
