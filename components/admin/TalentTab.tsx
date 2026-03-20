import React from 'react';
import { Search, Filter, Users, CheckCircle, Loader2 } from 'lucide-react';
import { PlayerStatus, Player } from '../../types';
import { PlayerWithScout } from '../../hooks/useAllProspects';

interface TalentTabProps {
    prospectsLoading: boolean;
    allProspects: PlayerWithScout[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedTalentPlayer: PlayerWithScout | null;
    setSelectedTalentPlayer: (player: PlayerWithScout | null) => void;
    placePlayer: (player: Player) => void;
    confirmEnrollment: (playerId: string) => Promise<void>;
    refreshProspects: () => void;
}

export const TalentTab: React.FC<TalentTabProps> = ({
    prospectsLoading,
    allProspects,
    searchQuery,
    setSearchQuery,
    selectedTalentPlayer,
    setSelectedTalentPlayer,
    placePlayer,
    confirmEnrollment,
    refreshProspects,
}) => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Global Talent Pool</h2>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                    {prospectsLoading ? 'Loading...' : `${allProspects.length} players from all scouts`}
                </span>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            placeholder="Search all players..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {prospectsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                    <span className="ml-2 text-gray-500">Loading all prospects...</span>
                </div>
            ) : allProspects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No players in the pipeline yet</p>
                    <p className="text-sm">Players added by scouts will appear here</p>
                </div>
            ) : (
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                        <tr>
                            <th className="p-4">Player</th>
                            <th className="p-4">Position</th>
                            <th className="p-4">Score</th>
                            <th className="p-4">Scout</th>
                            <th className="p-4">Tier</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {allProspects
                            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                       p.scoutName.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(p => (
                            <tr
                                key={p.id}
                                onClick={() => setSelectedTalentPlayer(p)}
                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedTalentPlayer?.id === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                            >
                                <td className="p-4 font-bold text-gray-900">{p.name}</td>
                                <td className="p-4 text-gray-600">{p.position || '-'}</td>
                                <td className="p-4 font-black text-blue-600">{p.evaluation?.score || '—'}</td>
                                <td className="p-4">
                                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                        {p.scoutName}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                        p.evaluation?.scholarshipTier === 'Tier 1' ? 'bg-purple-100 text-purple-700' :
                                        p.evaluation?.scholarshipTier === 'Tier 2' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {p.evaluation?.scholarshipTier || 'N/A'}
                                    </span>
                                </td>
                                <td className="p-4 text-sm font-medium text-gray-700">
                                    {p.status === PlayerStatus.PLACED ? (
                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Placed</span>
                                    ) : p.status}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {p.status === PlayerStatus.PLACED && !p.enrollmentConfirmed && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await confirmEnrollment(p.id);
                                                        refreshProspects();
                                                    } catch (err) {
                                                        alert('Failed to confirm enrollment');
                                                    }
                                                }}
                                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                                            >
                                                Confirm Enrollment
                                            </button>
                                        )}
                                        {p.status === PlayerStatus.PLACED && p.enrollmentConfirmed && (
                                            <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={12} /> Enrolled</span>
                                        )}
                                        {p.status !== PlayerStatus.PLACED && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); placePlayer(p); }}
                                                className="text-xs bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                                            >
                                                Mark Placed
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
);
