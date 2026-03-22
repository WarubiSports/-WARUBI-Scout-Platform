import React, { useMemo, useState } from 'react';
import { DollarSign, CheckCircle, Clock, Target, AlertCircle, Calendar, TrendingUp, Users, Globe, BarChart3, Copy, Check, Link, Megaphone } from 'lucide-react';
import NetworkOutreachModal from './NetworkOutreachModal';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    AreaChart, Area, CartesianGrid
} from 'recharts';
import { Player, PlayerStatus } from '../types';
import { useEarnings } from '../hooks/useEarnings';
import { PROGRAM_DURATIONS } from '../constants';

interface MyBusinessTabProps {
    players: Player[];
    scoutId: string | undefined;
    scoutName?: string;
}

const formatCurrency = (amount: number, currency: 'EUR' | 'USD') => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'de-DE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const getDurationLabel = (duration: string | undefined): string => {
    if (!duration) return 'Not set';
    const found = PROGRAM_DURATIONS.find(d => d.value === duration);
    return found ? found.shortLabel : duration;
};

const STAGE_COLORS: Record<string, string> = {
    Lead: '#6b7280',
    'Request Trial': '#3b82f6',
    'Send Contract': '#f59e0b',
    Offered: '#a855f7',
    Placed: '#10b981',
};

const STAGE_ORDER = ['Lead', 'Request Trial', 'Send Contract', 'Offered', 'Placed'];

const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-scout-800 border border-scout-600 rounded-lg px-3 py-2 text-sm shadow-xl">
            <p className="text-gray-300 font-medium">{label}</p>
            <p className="text-white font-bold">{payload[0].value}</p>
        </div>
    );
};

type Section = 'earnings' | 'pipeline';

const MyBusinessTab: React.FC<MyBusinessTabProps> = ({ players, scoutId, scoutName = '' }) => {
    const earnings = useEarnings(scoutId, players);
    const [section, setSection] = useState<Section>('earnings');
    const [linkCopied, setLinkCopied] = useState(false);
    const [networkModalOpen, setNetworkModalOpen] = useState(false);

    const submissionLink = scoutId ? `https://warubi-scout-platform.vercel.app/submit/${scoutId}` : '';

    const copySubmissionLink = () => {
        if (!submissionLink) return;
        navigator.clipboard.writeText(submissionLink);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const activePlayers = useMemo(() =>
        players.filter(p => p.status !== PlayerStatus.ARCHIVED),
        [players]
    );

    // Pipeline stats
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
            placed,
            conversionPct: total ? Math.round((placed / total) * 100) : 0,
            euPct: total ? Math.round((euPassport / total) * 100) : 0,
            avgScore,
        };
    }, [activePlayers]);

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

    const positions = useMemo(() => {
        const map: Record<string, number> = {};
        activePlayers.forEach(p => {
            if (p.position) map[p.position] = (map[p.position] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [activePlayers]);

    const ages = useMemo(() => {
        const map: Record<number, number> = {};
        activePlayers.forEach(p => {
            if (p.age) map[p.age] = (map[p.age] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([age, count]) => ({ name: age.toString(), count }));
    }, [activePlayers]);

    const gradYears = useMemo(() => {
        const map: Record<string, number> = {};
        activePlayers.forEach(p => {
            if (p.gradYear) map[p.gradYear] = (map[p.gradYear] || 0) + 1;
        });
        return Object.entries(map)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, count]) => ({ name, count }));
    }, [activePlayers]);

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

    if (earnings.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider animate-pulse">Loading...</div>
            </div>
        );
    }

    const progressPercent = earnings.hasAgreement
        ? Math.min(100, (earnings.placementsThisYear / earnings.minPlacementsPerYear) * 100)
        : 0;
    const licenseOnTrack = earnings.placementsThisYear >= earnings.minPlacementsPerYear;
    const hasPlacementActivity = earnings.placements.length > 0 || earnings.events.length > 0;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">My Business</h1>
            </div>

            {/* Submission Link + Network Outreach */}
            {scoutId && (
                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-scout-accent/10 rounded-xl border border-scout-accent/20 shrink-0">
                            <Link size={18} className="text-scout-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Your Submission Link</p>
                            <p className="text-xs text-gray-400 truncate">{submissionLink}</p>
                        </div>
                        <button
                            onClick={copySubmissionLink}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                                linkCopied
                                    ? 'bg-scout-accent/20 text-scout-accent border border-scout-accent/30'
                                    : 'bg-scout-700 text-white hover:bg-scout-600 border border-scout-600'
                            }`}
                        >
                            {linkCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                    </div>
                    <button
                        onClick={() => setNetworkModalOpen(true)}
                        className="w-full py-3 bg-scout-accent/10 border border-scout-accent/20 text-scout-accent rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-scout-accent/20 transition-all"
                    >
                        <Megaphone size={16} />
                        Let Your Network Know
                    </button>
                </div>
            )}

            <NetworkOutreachModal
                open={networkModalOpen}
                onClose={() => setNetworkModalOpen(false)}
                players={players}
                scoutName={scoutName}
                scoutId={scoutId || ''}
                submissionLink={submissionLink}
            />

            {/* Section Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setSection('earnings')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                        section === 'earnings'
                            ? 'bg-scout-accent/20 text-scout-accent border border-scout-accent/30'
                            : 'bg-scout-800 text-gray-500 border border-scout-700 hover:text-gray-300'
                    }`}
                >
                    Earnings
                </button>
                <button
                    onClick={() => setSection('pipeline')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                        section === 'pipeline'
                            ? 'bg-scout-accent/20 text-scout-accent border border-scout-accent/30'
                            : 'bg-scout-800 text-gray-500 border border-scout-700 hover:text-gray-300'
                    }`}
                >
                    Pipeline
                </button>
            </div>

            {/* === EARNINGS SECTION === */}
            {section === 'earnings' && (
                <div className="space-y-6">
                    {!earnings.hasAgreement ? (
                        <div className="bg-scout-800 border-2 border-scout-700 rounded-2xl p-8 text-center">
                            <AlertCircle size={48} className="mx-auto text-gray-500 mb-4" />
                            <h2 className="text-xl font-black text-white uppercase mb-2">No Active License Agreement</h2>
                            <p className="text-gray-400 text-sm">
                                Contact HQ to set up your licensee agreement and start tracking your earnings.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Earnings Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-green-500/10 rounded-lg">
                                            <CheckCircle size={18} className="text-green-400" />
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-green-400">{formatCurrency(earnings.totalConfirmed, earnings.currency)}</div>
                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1">Confirmed</div>
                                </div>

                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                                            <Clock size={18} className="text-yellow-400" />
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-yellow-400">{formatCurrency(earnings.totalPending, earnings.currency)}</div>
                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1">Pending</div>
                                </div>

                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Target size={18} className="text-blue-400" />
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-white">
                                        {earnings.placementsThisYear}<span className="text-gray-500 text-lg">/{earnings.minPlacementsPerYear}</span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1">Placements for Renewal</div>
                                    <div className="mt-2 h-1.5 bg-scout-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${licenseOnTrack ? 'bg-green-400' : 'bg-blue-400'}`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`p-2 rounded-lg ${licenseOnTrack ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                                            <DollarSign size={18} className={licenseOnTrack ? 'text-green-400' : 'text-orange-400'} />
                                        </div>
                                    </div>
                                    <div className={`text-lg font-black ${licenseOnTrack ? 'text-green-400' : 'text-orange-400'}`}>
                                        {licenseOnTrack ? 'ON TRACK' : `${earnings.placementsThisYear} of ${earnings.minPlacementsPerYear}`}
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1">License Status</div>
                                </div>
                            </div>

                            {/* Compensation Structure - show when no placements yet */}
                            {!hasPlacementActivity && earnings.rates && (
                                <div className="bg-scout-800 border border-scout-700 rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-scout-700">
                                        <h2 className="text-sm font-black text-white uppercase tracking-wide">Your Compensation Structure</h2>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        {/* ITP Boys Rates */}
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">FC Köln ITP (Boys)</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                    <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.fullSeason, earnings.currency)}</div>
                                                    <div className="text-xs text-gray-500 mt-1">Full Season</div>
                                                </div>
                                                <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                    <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.sixMonths, earnings.currency)}</div>
                                                    <div className="text-xs text-gray-500 mt-1">6 Months</div>
                                                </div>
                                                <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                    <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.threeMonths, earnings.currency)}</div>
                                                    <div className="text-xs text-gray-500 mt-1">3 Months</div>
                                                </div>
                                                {earnings.hasEventRights && (
                                                    <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                        <div className="text-lg font-black text-white">100%</div>
                                                        <div className="text-xs text-gray-500 mt-1">Event Revenue</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ITP Girls Rates - only if set */}
                                        {(earnings.rates.oneMonthFemale || earnings.rates.threeMonthsFemale) && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">FC Köln ITP (Girls)</p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {earnings.rates.threeMonthsFemale && (
                                                        <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                            <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.threeMonthsFemale, earnings.currency)}</div>
                                                            <div className="text-xs text-gray-500 mt-1">3 Months</div>
                                                        </div>
                                                    )}
                                                    {earnings.rates.oneMonthFemale && (
                                                        <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                            <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.oneMonthFemale, earnings.currency)}</div>
                                                            <div className="text-xs text-gray-500 mt-1">1 Month</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* College Placement Rates - only for hybrid scouts */}
                                        {earnings.rates.collegeTier1 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">College Soccer USA</p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                        <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.collegeTier1, earnings.rates.collegeRateCurrency || 'USD')}</div>
                                                        <div className="text-xs text-gray-500 mt-1">Clients #1–4</div>
                                                    </div>
                                                    {earnings.rates.collegeTier2 && (
                                                        <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                            <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.collegeTier2, earnings.rates.collegeRateCurrency || 'USD')}</div>
                                                            <div className="text-xs text-gray-500 mt-1">Clients #5–9</div>
                                                        </div>
                                                    )}
                                                    {earnings.rates.collegeTier3 && (
                                                        <div className="bg-scout-900/50 rounded-xl p-4 text-center">
                                                            <div className="text-lg font-black text-white">{formatCurrency(earnings.rates.collegeTier3, earnings.rates.collegeRateCurrency || 'USD')}</div>
                                                            <div className="text-xs text-gray-500 mt-1">Clients #10+</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {earnings.scholarshipAdjustsTdrf && (
                                            <div className="bg-orange-500/5 rounded-lg p-3 border border-orange-500/20">
                                                <p className="text-xs text-orange-400/80">
                                                    <span className="font-bold">Note:</span> If a player receives a scholarship, your TDRF is based on the net tuition paid after reductions.
                                                </p>
                                            </div>
                                        )}

                                        <div className="bg-scout-900/30 rounded-lg p-4 border border-scout-700/50">
                                            <div className="flex items-start gap-3">
                                                <TrendingUp size={18} className="text-blue-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm text-gray-300 font-medium">How to start earning</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Move players to <span className="text-white font-bold">PLACED</span> status to track placement compensation.
                                                        {earnings.hasEventRights && ' Host showcases and events to earn participation fees.'}
                                                        {' '}Place {earnings.minPlacementsPerYear}+ players per year to maintain your license.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Placement Breakdown */}
                            <div className="bg-scout-800 border border-scout-700 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-scout-700">
                                    <h2 className="text-sm font-black text-white uppercase tracking-wide">Placement Breakdown</h2>
                                </div>
                                {earnings.placements.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <Target size={28} className="mx-auto text-gray-600 mb-2" />
                                        <p className="text-gray-500 text-sm font-bold">No placements yet</p>
                                        <p className="text-gray-600 text-xs mt-1">Move players to PLACED status to see them here</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-scout-900/50 border-b border-scout-700 text-[10px] uppercase text-gray-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-3">Player</th>
                                                <th className="px-6 py-3">Duration</th>
                                                <th className="px-6 py-3 text-right">Compensation</th>
                                                <th className="px-6 py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-scout-700/50">
                                            {earnings.placements.map((pl) => (
                                                <tr key={pl.playerId} className="hover:bg-scout-700/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white text-sm">{pl.playerName}</div>
                                                        {pl.placedLocation && (
                                                            <div className="text-xs text-gray-500 mt-0.5">{pl.placedLocation}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {pl.programDuration ? (
                                                            <span className="text-sm text-gray-300">{getDurationLabel(pl.programDuration)}</span>
                                                        ) : (
                                                            <span className="text-xs text-orange-400 font-bold">Needs update</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {pl.tdrfAmount !== null ? (
                                                            <span className="text-sm font-black text-white">{formatCurrency(pl.tdrfAmount, earnings.currency)}</span>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">&mdash;</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {pl.confirmed ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400">
                                                                <CheckCircle size={14} /> Confirmed
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500">
                                                                <Clock size={14} /> Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Event Revenue - only for scouts with event rights */}
                            {earnings.hasEventRights && <div className="bg-scout-800 border border-scout-700 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-scout-700 flex items-center justify-between">
                                    <h2 className="text-sm font-black text-white uppercase tracking-wide">Events</h2>
                                </div>
                                {earnings.events.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <Calendar size={28} className="mx-auto text-gray-600 mb-2" />
                                        <p className="text-gray-500 text-sm font-bold">No completed events yet</p>
                                        <p className="text-gray-600 text-xs mt-1">Host showcases and events — you keep 100% of participation fees</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-scout-900/50 border-b border-scout-700 text-[10px] uppercase text-gray-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-3">Event</th>
                                                <th className="px-6 py-3">Type</th>
                                                <th className="px-6 py-3 text-right">Fee</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-scout-700/50">
                                            {earnings.events.map((ev) => (
                                                <tr key={ev.eventId} className="hover:bg-scout-700/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white text-sm">{ev.title}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{new Date(ev.date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-300">{ev.eventType}</td>
                                                    <td className="px-6 py-4 text-right text-sm text-gray-300">{formatCurrency(ev.fee, earnings.currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>}
                        </>
                    )}
                </div>
            )}

            {/* === PIPELINE SECTION === */}
            {section === 'pipeline' && (
                <div className="space-y-6">
                    {activePlayers.length < 3 ? (
                        <div className="bg-scout-800 border border-scout-700 rounded-2xl p-8 text-center">
                            <BarChart3 size={32} className="mx-auto text-gray-600 mb-3" />
                            <p className="text-lg font-bold text-white">Add players to see pipeline insights</p>
                            <p className="text-sm text-gray-500 mt-1">You need at least 3 players for meaningful data.</p>
                        </div>
                    ) : (
                        <>
                            {/* Pipeline Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users size={16} className="text-scout-accent" />
                                        <span className="text-[10px] font-bold uppercase text-gray-500">Total Players</span>
                                    </div>
                                    <p className="text-2xl font-black text-scout-accent">{stats.total}</p>
                                </div>
                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={16} className="text-emerald-400" />
                                        <span className="text-[10px] font-bold uppercase text-gray-500">Conversion Rate</span>
                                    </div>
                                    <p className="text-2xl font-black text-emerald-400">{stats.conversionPct}%</p>
                                </div>
                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe size={16} className="text-blue-400" />
                                        <span className="text-[10px] font-bold uppercase text-gray-500">EU Passport</span>
                                    </div>
                                    <p className="text-2xl font-black text-blue-400">{stats.euPct}%</p>
                                </div>
                                <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={16} className="text-amber-400" />
                                        <span className="text-[10px] font-bold uppercase text-gray-500">Avg Eval Score</span>
                                    </div>
                                    <p className="text-2xl font-black text-amber-400">{stats.avgScore || '\u2014'}</p>
                                </div>
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

                            {/* Charts Grid */}
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
                        </>
                    )}
                </div>
            )}

            {/* Bottom spacer for mobile nav */}
            <div className="h-24 md:h-0" />
        </div>
    );
};

export default MyBusinessTab;
