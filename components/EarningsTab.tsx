import React from 'react';
import { DollarSign, CheckCircle, Clock, Target, AlertCircle } from 'lucide-react';
import { Player } from '../types';
import { useEarnings } from '../hooks/useEarnings';
import { PROGRAM_DURATIONS } from '../constants';

interface EarningsTabProps {
    players: Player[];
    scoutId: string | undefined;
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

const EarningsTab: React.FC<EarningsTabProps> = ({ players, scoutId }) => {
    const earnings = useEarnings(scoutId, players);

    if (earnings.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!earnings.hasAgreement) {
        return (
            <div className="max-w-2xl mx-auto mt-12">
                <div className="bg-scout-800 border-2 border-scout-700 rounded-2xl p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-gray-500 mb-4" />
                    <h2 className="text-xl font-black text-white uppercase mb-2">No Active License Agreement</h2>
                    <p className="text-gray-400 text-sm">
                        Contact Warubi HQ to set up your TDRF licensee agreement and start tracking your earnings.
                    </p>
                </div>
            </div>
        );
    }

    const progressPercent = Math.min(100, (earnings.placementsThisYear / earnings.minPlacementsPerYear) * 100);
    const licenseOnTrack = earnings.placementsThisYear >= earnings.minPlacementsPerYear;

    return (
        <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Earnings Dashboard</h1>

            {/* Summary Cards */}
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
                    <div className="text-xs font-bold text-gray-500 uppercase mt-1">Placements (YTD)</div>
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
                        {licenseOnTrack ? 'ON TRACK' : 'NEEDS MORE'}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase mt-1">License Status</div>
                </div>
            </div>

            {/* Placements Table */}
            <div className="bg-scout-800 border border-scout-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-scout-700">
                    <h2 className="text-sm font-black text-white uppercase tracking-wide">Placement Breakdown</h2>
                </div>

                {earnings.placements.length === 0 ? (
                    <div className="p-8 text-center">
                        <Target size={32} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-500 text-sm font-bold">No placements yet</p>
                        <p className="text-gray-600 text-xs mt-1">Move players to PLACED status to see them here</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-scout-900/50 border-b border-scout-700 text-[10px] uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-3">Player</th>
                                <th className="px-6 py-3">Duration</th>
                                <th className="px-6 py-3 text-right">TDRF</th>
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
                                            <span className="text-xs text-gray-500">—</span>
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
        </div>
    );
};

export default EarningsTab;
