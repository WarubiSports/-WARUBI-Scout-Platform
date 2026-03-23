import React, { useMemo } from 'react';
import { Send, MousePointerClick, CheckCircle2, Flame } from 'lucide-react';
import { Player } from '../../types';

interface FunnelStripProps {
  players: Player[];
}

export const FunnelStrip: React.FC<FunnelStripProps> = ({ players }) => {
  const metrics = useMemo(() => {
    const contacted = players.filter(p => p.outreachLogs?.length > 0 || p.lastContactedAt).length;
    const openedEE = players.filter(p => p.activityStatus && p.activityStatus !== 'undiscovered').length;
    const completedEE = players.filter(p => p.activityStatus === 'spotlight' || p.activityStatus === 'signal').length;
    const warmLeads = players.filter(p => (p.activityStatus === 'spotlight' || p.activityStatus === 'signal') && p.status === 'Lead').length;
    return { contacted, openedEE, completedEE, warmLeads };
  }, [players]);

  const pills = [
    { label: 'Contacted', value: metrics.contacted, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Opened EE', value: metrics.openedEE, icon: MousePointerClick, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Completed', value: metrics.completedEE, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Warm Leads', value: metrics.warmLeads, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {pills.map((pill) => (
        <div key={pill.label} className={`${pill.bg} rounded-xl p-3 text-center border border-white/5`}>
          <pill.icon size={16} className={`${pill.color} mx-auto mb-1`} />
          <div className={`text-xl font-black ${pill.color}`}>{pill.value}</div>
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{pill.label}</div>
        </div>
      ))}
    </div>
  );
};
