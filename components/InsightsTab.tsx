import React, { useMemo } from 'react';
import { Player, PlayerStatus } from '../types';
import { Users, TrendingUp, Globe, Target } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    AreaChart, Area, CartesianGrid
} from 'recharts';

interface InsightsTabProps {
    players: Player[];
}

const STAGE_COLORS: Record<string, string> = {
    Lead: '#6b7280',
    Contacted: '#3b82f6',
    Interested: '#f59e0b',
    Offered: '#a855f7',
    Placed: '#10b981',
    Archived: '#374151',
};

const STAGE_ORDER = ['Lead', 'Contacted', 'Interested', 'Offered', 'Placed'];

const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-scout-800 border border-scout-600 rounded-lg px-3 py-2 text-sm shadow-xl">
            <p className="text-gray-300 font-medium">{label}</p>
            <p className="text-white font-bold">{payload[0].value}</p>
        </div>
    );
};

export const InsightsTab: React.FC<InsightsTabProps> = ({ players }) => {
    const activePlayers = useMemo(() =>
        players.filter(p => p.status !== PlayerStatus.ARCHIVED),
        [players]
    );

    // Summary stats
    const stats = useMemo(() => {
        const total = activePlayers.length;
        const placed = activePlayers.filter(p => p.status === PlayerStatus.PLACED).length;
        const euPassport = activePlayers.filter(p => p.hasEuPassport).length;
        const withEval = activePlayers.filter(p => p.evaluation?.score);
        const avgScore = withEval.length
            ? Math.round(withEval.reduce((s, p) => s + (p.evaluation?.score || 0), 0) / withEval.length)
            : 0;
        return {
            total,
            conversionPct: total ? Math.round((placed / total) * 100) : 0,
            euPct: total ? Math.round((euPassport / total) * 100) : 0,
            avgScore,
        };
    }, [activePlayers]);

    // Pipeline funnel
    const pipeline = useMemo(() => {
        const counts: Record<string, number> = {};
        STAGE_ORDER.forEach(s => counts[s] = 0);
        activePlayers.forEach(p => {
            if (counts[p.status] !== undefined) counts[p.status]++;
        });
        const max = Math.max(...Object.values(counts), 1);
        return STAGE_ORDER.map((stage, i) => {
            const count = counts[stage];
            const next = i < STAGE_ORDER.length - 1 ? counts[STAGE_ORDER[i + 1]] : null;
            const convRate = next !== null && count > 0 ? Math.round((next / count) * 100) : null;
            return { stage, count, pct: (count / max) * 100, convRate };
        });
    }, [activePlayers]);

    // Nationality breakdown — only players with actual nationality set
    const nationalities = useMemo(() => {
        const map: Record<string, number> = {};
        activePlayers.forEach(p => {
            if (p.nationality) map[p.nationality] = (map[p.nationality] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
    }, [activePlayers]);

    // Position spread — only players with actual position set
    const positions = useMemo(() => {
        const map: Record<string, number> = {};
        activePlayers.forEach(p => {
            if (p.position) map[p.position] = (map[p.position] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [activePlayers]);

    // Age distribution — only players with age
    const ages = useMemo(() => {
        const map: Record<number, number> = {};
        activePlayers.forEach(p => {
            if (p.age) map[p.age] = (map[p.age] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([age, count]) => ({ name: age.toString(), count }));
    }, [activePlayers]);

    // Grad year — only players with actual grad year
    const gradYears = useMemo(() => {
        const map: Record<string, number> = {};
        activePlayers.forEach(p => {
            if (p.gradYear) map[p.gradYear] = (map[p.gradYear] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, count]) => ({ name, count }));
    }, [activePlayers]);

    // Pipeline activity (players added per month)
    const activity = useMemo(() => {
        const map: Record<string, number> = {};
        players.forEach(p => {
            if (p.submittedAt) {
                const d = new Date(p.submittedAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                map[key] = (map[key] || 0) + 1;
            }
        });
        return Object.entries(map)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, count]) => {
                const [y, m] = month.split('-');
                const label = new Date(Number(y), Number(m) - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
                return { name: label, count };
            });
    }, [players]);

    if (activePlayers.length < 3) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-scout-700 flex items-center justify-center mx-auto">
                        <TrendingUp size={28} className="text-gray-500" />
                    </div>
                    <p className="text-lg font-bold text-white">Add players to see insights</p>
                    <p className="text-sm text-gray-500">You need at least 3 players for meaningful data.</p>
                </div>
            </div>
        );
    }

    const summaryCards = [
        { label: 'Total Players', value: stats.total, icon: Users, color: 'text-scout-accent' },
        { label: 'Conversion Rate', value: `${stats.conversionPct}%`, icon: TrendingUp, color: 'text-emerald-400' },
        { label: 'EU Passport', value: `${stats.euPct}%`, icon: Globe, color: 'text-blue-400' },
        { label: 'Avg Eval Score', value: stats.avgScore || '—', icon: Target, color: 'text-amber-400' },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            <h2 className="text-xl font-black text-white tracking-tight">Insights</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {summaryCards.map(c => (
                    <div key={c.label} className="bg-scout-800 border border-scout-700 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <c.icon size={16} className={c.color} />
                            <span className="text-[10px] font-bold uppercase text-gray-500">{c.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Pipeline Funnel */}
            <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 md:p-5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Pipeline Funnel</h3>
                <div className="space-y-3">
                    {pipeline.map(s => (
                        <div key={s.stage} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-300">{s.stage}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-white">{s.count}</span>
                                    {s.convRate !== null && (
                                        <span className="text-[10px] text-gray-500">{s.convRate}% &rarr;</span>
                                    )}
                                </div>
                            </div>
                            <div className="h-3 bg-scout-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.max(s.pct, 2)}%`,
                                        backgroundColor: STAGE_COLORS[s.stage],
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts Grid — only show sections with real data */}
            {(nationalities.length > 0 || positions.length > 0 || ages.length > 1 || gradYears.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nationalities.length > 0 && (
                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 md:p-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Top Nationalities</h3>
                    <ResponsiveContainer width="100%" height={nationalities.length * 32 + 16}>
                        <BarChart data={nationalities} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={false} />
                            <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={18} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                )}

                {positions.length > 0 && (
                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 md:p-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Position Spread</h3>
                    <ResponsiveContainer width="100%" height={positions.length * 32 + 16}>
                        <BarChart data={positions} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={false} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                )}

                {ages.length > 1 && (
                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 md:p-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Age Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={ages} margin={{ left: -20, right: 8, top: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={false} />
                            <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                )}

                {gradYears.length > 0 && (
                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 md:p-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Grad Year</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={gradYears} margin={{ left: -20, right: 8, top: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={false} />
                            <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                )}
            </div>
            )}

            {/* Pipeline Activity */}
            {activity.length > 1 && (
                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 md:p-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Pipeline Activity</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={activity} margin={{ left: -20, right: 8, top: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={false} />
                            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#activityGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Bottom spacer for mobile nav */}
            <div className="h-24 md:h-0" />
        </div>
    );
};

export default InsightsTab;
