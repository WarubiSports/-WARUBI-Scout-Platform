import React from 'react';
import { AlertCircle } from 'lucide-react';
import { PlayerStatus } from '../../types';
import { PlayerWithScout } from '../../hooks/useAllProspects';
import type { Scout } from '../../lib/database.types';

interface InsightsTabProps {
    scouts: Scout[];
    allProspects: PlayerWithScout[];
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ scouts, allProspects }) => {
    const stages = ['Lead', 'Request Trial', 'Send Contract', 'Offered', 'Placed'] as const;
    const stageColors: Record<string, string> = { Lead: '#6b7280', 'Request Trial': '#3b82f6', 'Send Contract': '#f59e0b', Offered: '#a855f7', Placed: '#10b981' };

    // Build per-scout funnel data
    type ScoutFunnel = { id: string; name: string; region: string; total: number; lead: number; trial: number; contract: number; offered: number; placed: number; archived: number; convRate: number; trialRate: number; avgScore: number };
    const scoutFunnels: ScoutFunnel[] = (() => {
        const map: Record<string, ScoutFunnel> = {};
        scouts.forEach(s => {
            map[s.id] = { id: s.id, name: s.name, region: s.region || '—', total: 0, lead: 0, trial: 0, contract: 0, offered: 0, placed: 0, archived: 0, convRate: 0, trialRate: 0, avgScore: 0 };
        });
        const scoreAccum: Record<string, { sum: number; count: number }> = {};
        allProspects.forEach(p => {
            if (!map[p.scoutId]) map[p.scoutId] = { id: p.scoutId, name: p.scoutName, region: '—', total: 0, lead: 0, trial: 0, contract: 0, offered: 0, placed: 0, archived: 0, convRate: 0, trialRate: 0, avgScore: 0 };
            const f = map[p.scoutId];
            f.total++;
            if (p.status === PlayerStatus.LEAD) f.lead++;
            else if (p.status === PlayerStatus.REQUEST_TRIAL) f.trial++;
            else if (p.status === PlayerStatus.SEND_CONTRACT) f.contract++;
            else if (p.status === PlayerStatus.OFFERED) f.offered++;
            else if (p.status === PlayerStatus.PLACED) f.placed++;
            else if (p.status === PlayerStatus.ARCHIVED) f.archived++;
            if (p.evaluation?.score) {
                if (!scoreAccum[p.scoutId]) scoreAccum[p.scoutId] = { sum: 0, count: 0 };
                scoreAccum[p.scoutId].sum += p.evaluation.score;
                scoreAccum[p.scoutId].count++;
            }
        });
        return Object.values(map).map(f => {
            const nonLead = f.total - f.lead - f.archived;
            f.convRate = f.total > 0 ? Math.round((f.placed / f.total) * 100) : 0;
            f.trialRate = f.total > 0 ? Math.round(((f.trial + f.contract + f.offered + f.placed) / f.total) * 100) : 0;
            const sc = scoreAccum[f.id];
            f.avgScore = sc ? Math.round(sc.sum / sc.count) : 0;
            return f;
        }).sort((a, b) => b.placed - a.placed || b.convRate - a.convRate || b.total - a.total);
    })();

    // Global pipeline
    const globalStages: Record<string, number> = {};
    stages.forEach(s => globalStages[s] = 0);
    allProspects.forEach(p => { if (globalStages[p.status] !== undefined) globalStages[p.status]++; });
    const totalPlaced = globalStages['Placed'];
    const totalActive = allProspects.filter(p => p.status !== PlayerStatus.ARCHIVED).length;

    // Funnel drop-off rates
    const funnelSteps = stages.map(s => globalStages[s]);
    const funnelCumulative = stages.map((_, i) => funnelSteps.slice(i).reduce((a, b) => a + b, 0));

    // Nationality summary
    const natMap: Record<string, number> = {};
    allProspects.forEach(p => { const n = p.nationality || 'Unknown'; natMap[n] = (natMap[n] || 0) + 1; });
    const topNats = Object.entries(natMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Stale leads (leads with no status change, submitted > 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const staleLeads = allProspects.filter(p =>
        p.status === PlayerStatus.LEAD &&
        new Date(p.submittedAt) < thirtyDaysAgo
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">Scout Conversion Dashboard</h2>

            {/* Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Submitted</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{allProspects.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase">In Pipeline</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{totalActive - totalPlaced}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Placed</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{totalPlaced}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Conversion</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{allProspects.length ? Math.round((totalPlaced / allProspects.length) * 100) : 0}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Stale Leads</p>
                    <p className={`text-3xl font-bold mt-1 ${staleLeads.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{staleLeads.length}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">30+ days, still Lead</p>
                </div>
            </div>

            {/* Pipeline Funnel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Pipeline Funnel</h3>
                    <div className="space-y-3">
                        {stages.map((stage, i) => {
                            const count = globalStages[stage];
                            const cumulative = funnelCumulative[i];
                            const pct = allProspects.length > 0 ? Math.round((cumulative / allProspects.length) * 100) : 0;
                            const dropOff = i > 0 ? funnelCumulative[i - 1] - cumulative : 0;
                            return (
                                <div key={stage}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-semibold text-gray-600">{stage}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">{count}</span>
                                            <span className="text-gray-400">({pct}% reach here)</span>
                                            {dropOff > 0 && <span className="text-red-400 text-[10px]">-{dropOff}</span>}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stageColors[stage] }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Top Nationalities</h3>
                    <div className="space-y-2">
                        {topNats.map(([nat, count]) => (
                            <div key={nat} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{nat}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900">{count}</span>
                                    <span className="text-xs text-gray-400">{Math.round((count / allProspects.length) * 100)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scout Conversion Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Scout Conversion Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                                <th className="text-left py-2 font-semibold">#</th>
                                <th className="text-left py-2 font-semibold">Scout</th>
                                <th className="text-left py-2 font-semibold">Region</th>
                                <th className="text-right py-2 font-semibold">Total</th>
                                <th className="text-right py-2 font-semibold">Lead</th>
                                <th className="text-right py-2 font-semibold">Trial</th>
                                <th className="text-right py-2 font-semibold">Contract</th>
                                <th className="text-right py-2 font-semibold">Offered</th>
                                <th className="text-right py-2 font-semibold text-emerald-700">Placed</th>
                                <th className="text-right py-2 font-semibold">Trial %</th>
                                <th className="text-right py-2 font-semibold">Conv %</th>
                                <th className="text-right py-2 font-semibold">Avg Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scoutFunnels.map((s, i) => (
                                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-2.5 text-sm text-gray-400 font-bold">{i + 1}</td>
                                    <td className="py-2.5 text-sm font-semibold text-gray-900">{s.name}</td>
                                    <td className="py-2.5 text-sm text-gray-500">{s.region}</td>
                                    <td className="py-2.5 text-sm text-right text-gray-700 font-medium">{s.total}</td>
                                    <td className="py-2.5 text-sm text-right text-gray-500">{s.lead}</td>
                                    <td className="py-2.5 text-sm text-right text-blue-600">{s.trial}</td>
                                    <td className="py-2.5 text-sm text-right text-amber-600">{s.contract}</td>
                                    <td className="py-2.5 text-sm text-right text-purple-600">{s.offered}</td>
                                    <td className="py-2.5 text-sm text-right font-bold text-emerald-600">{s.placed}</td>
                                    <td className="py-2.5 text-sm text-right">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${s.trialRate >= 50 ? 'bg-blue-50 text-blue-700' : s.trialRate >= 25 ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'}`}>
                                            {s.trialRate}%
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-sm text-right">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${s.convRate >= 20 ? 'bg-emerald-50 text-emerald-700' : s.convRate >= 10 ? 'bg-gray-100 text-gray-600' : s.total > 0 ? 'bg-red-50 text-red-600' : 'text-gray-300'}`}>
                                            {s.convRate}%
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-sm text-right text-gray-500">{s.avgScore || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stale Leads Alert */}
            {staleLeads.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                    <h3 className="text-sm font-bold text-amber-800 uppercase mb-3 flex items-center gap-2">
                        <AlertCircle size={16} /> Stale Leads — 30+ Days Without Progress
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {staleLeads.slice(0, 12).map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                                <div>
                                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{p.scoutName}</span>
                                </div>
                                <span className="text-[10px] text-amber-600 font-medium">
                                    {Math.round((Date.now() - new Date(p.submittedAt).getTime()) / (1000 * 60 * 60 * 24))}d
                                </span>
                            </div>
                        ))}
                        {staleLeads.length > 12 && (
                            <div className="flex items-center justify-center text-sm text-amber-600 font-medium">
                                +{staleLeads.length - 12} more
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
