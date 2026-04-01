import React, { useState, useMemo } from 'react';
import { Calendar, FileUp, Plus, Loader2, Users, AlertTriangle } from 'lucide-react';
import { useDashboardContext } from '../DashboardLayout';
import { Player, PlayerStatus } from '../../types';
import { POSITIONS } from '../submission/FormComponents';

const UploadScreen: React.FC = () => {
  const { players, user, onAddPlayer, events, setIsSubmissionOpen, setSubmissionInitialMode } = useDashboardContext();
  const [quickName, setQuickName] = useState('');
  const [quickPos, setQuickPos] = useState('CM');
  const [adding, setAdding] = useState(false);
  const [dupeWarning, setDupeWarning] = useState<string | null>(null);

  const recentPlayers = useMemo(() =>
    [...players]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 20),
    [players]
  );

  // Check for duplicate names (case-insensitive)
  const findDuplicate = (name: string): Player | undefined => {
    const normalized = name.trim().toLowerCase();
    return players.find(p => p.name.toLowerCase() === normalized);
  };

  const handleQuickAdd = async () => {
    if (!quickName.trim() || adding) return;

    // Duplicate check
    const existing = findDuplicate(quickName);
    if (existing && !dupeWarning) {
      setDupeWarning(`"${existing.name}" already exists (${existing.position}). Tap + again to add anyway.`);
      return;
    }

    setAdding(true);
    setDupeWarning(null);
    const player: Player = {
      id: `player-${Date.now()}`,
      name: quickName.trim(),
      age: 17,
      position: quickPos,
      status: PlayerStatus.LEAD,
      submittedAt: new Date().toISOString(),
      outreachLogs: [],
      evaluation: { score: 0, tier: 'Pending' as const, summary: 'Quick add', strengths: [], concerns: [], collegeProjection: '' },
    };
    try {
      await onAddPlayer(player);
      setQuickName('');
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleBulkUpload = () => {
    setSubmissionInitialMode('BULK');
    setIsSubmissionOpen(true);
  };

  const handleFromEvent = () => {
    // Open bulk import with event context
    setSubmissionInitialMode('BULK');
    setIsSubmissionOpen(true);
  };

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with XP */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Upload</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-scout-accent/10 border border-scout-accent/30 rounded-full">
          <span className="text-scout-accent font-black text-sm">{players.length}</span>
          <span className="text-gray-500 text-xs font-bold">Players</span>
        </div>
      </div>

      {/* Quick Add */}
      <div className="bg-scout-800 border border-scout-700 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus size={16} className="text-scout-accent" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Quick Add</h3>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Player name"
            value={quickName}
            onChange={(e) => { setQuickName(e.target.value); setDupeWarning(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            className="flex-[2] bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-scout-accent"
          />
          <select
            value={quickPos}
            onChange={(e) => setQuickPos(e.target.value)}
            className="flex-1 bg-scout-900 border border-scout-700 rounded-xl px-3 py-3 text-white font-bold focus:outline-none focus:border-scout-accent"
          >
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            onClick={handleQuickAdd}
            disabled={!quickName.trim() || adding}
            className="px-5 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm active:scale-95 disabled:opacity-50"
          >
            {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </div>
        {dupeWarning && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs text-amber-400">{dupeWarning}</span>
          </div>
        )}
      </div>

      {/* Two big entry cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={handleFromEvent}
          className="bg-scout-800 border border-scout-700 rounded-2xl p-6 text-left hover:border-scout-accent/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
            <Calendar size={24} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-black text-white mb-1">From Event</h3>
          <p className="text-[10px] text-gray-500 leading-relaxed">Upload roster from a showcase or ID day</p>
          {upcomingEvents.length > 0 && (
            <p className="text-[10px] text-purple-400 mt-2 font-bold">{upcomingEvents.length} upcoming</p>
          )}
        </button>

        <button
          onClick={handleBulkUpload}
          className="bg-scout-800 border border-scout-700 rounded-2xl p-6 text-left hover:border-scout-accent/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
            <FileUp size={24} className="text-blue-400" />
          </div>
          <h3 className="text-sm font-black text-white mb-1">Direct Upload</h3>
          <p className="text-[10px] text-gray-500 leading-relaxed">Excel, CSV, photo, or PDF roster</p>
        </button>
      </div>

      {/* Recent uploads */}
      {recentPlayers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-gray-500" />
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Recent ({recentPlayers.length})</h3>
          </div>
          <div className="space-y-1.5">
            {recentPlayers.map((p) => {
              const contacted = p.lastContactedAt || p.outreachLogs?.length > 0;
              const statusColor = contacted
                ? 'bg-scout-accent/10 border-scout-accent/30 text-scout-accent'
                : 'bg-scout-900 border-scout-700 text-gray-600';
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-scout-800 border border-scout-700/50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-scout-700/50 border border-scout-600/30 flex items-center justify-center text-xs font-black text-gray-400 shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white truncate block">{p.name}</span>
                    <span className="text-[10px] text-gray-500">
                      {p.position}{p.club ? ` · ${p.club}` : ''}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {contacted ? 'SENT' : 'NEW'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadScreen;
