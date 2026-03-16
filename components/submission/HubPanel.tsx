import React from 'react';
import { Zap, Plus, Loader2, Keyboard } from 'lucide-react';
import { Player, PlayerStatus } from '../../types';
import { POSITIONS } from './FormComponents';

interface HubPanelProps {
    quickAddName: string;
    setQuickAddName: (name: string) => void;
    quickAddLoading: boolean;
    setQuickAddLoading: (loading: boolean) => void;
    position: string;
    onPositionChange: (position: string) => void;
    onAddPlayer: (player: Player) => any;
    onClose: () => void;
    onSwitchToBuild: () => void;
}

export const HubPanel: React.FC<HubPanelProps> = ({
    quickAddName,
    setQuickAddName,
    quickAddLoading,
    setQuickAddLoading,
    position,
    onPositionChange,
    onAddPlayer,
    onClose,
    onSwitchToBuild,
}) => (
    <div className="p-4 md:p-16 animate-fade-in max-w-4xl mx-auto flex flex-col items-center">
        {/* QUICK ADD - P1: Minimum friction entry */}
        <div className="w-full mb-10 bg-gradient-to-r from-scout-accent/10 to-emerald-500/5 border-2 border-scout-accent/30 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
                <Zap size={20} className="text-scout-accent" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Quick Add</h3>
                <span className="text-[9px] bg-scout-accent/20 text-scout-accent px-2 py-1 rounded-full font-black uppercase">Fastest</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Player name"
                    value={quickAddName}
                    onChange={(e) => setQuickAddName(e.target.value)}
                    className="flex-[2] bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                />
                <select
                    value={position}
                    onChange={(e) => onPositionChange(e.target.value)}
                    className="flex-1 bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-scout-accent transition-colors"
                >
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                    onClick={async () => {
                        if (!quickAddName.trim() || quickAddLoading) return;
                        setQuickAddLoading(true);
                        const quickPlayer: Player = {
                            id: `player-${Date.now()}`,
                            name: quickAddName.trim(),
                            age: 17,
                            position: position,
                            status: PlayerStatus.LEAD,
                            submittedAt: new Date().toISOString(),
                            outreachLogs: [],
                            evaluation: {
                                score: 0,
                                tier: 'Pending' as const,
                                summary: 'Quick add - awaiting full evaluation',
                                strengths: [],
                                concerns: [],
                                collegeProjection: 'To be determined'
                            }
                        };
                        try {
                            const result = await onAddPlayer(quickPlayer);
                            if (result) {
                                onClose();
                            } else {
                                console.error('Quick add failed: no result returned');
                                setQuickAddLoading(false);
                                alert('Failed to add player. Please check your connection and try again.');
                            }
                        } catch (error) {
                            console.error('Quick add failed:', error);
                            setQuickAddLoading(false);
                            alert('Failed to add player: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                    }}
                    disabled={!quickAddName.trim() || quickAddLoading}
                    className="px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center gap-2 shadow-glow hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {quickAddLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} {quickAddLoading ? 'Adding...' : 'Add'}
                </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Add player now, enrich profile later. Score will be calculated when you add more details.</p>
        </div>

        <button
            onClick={onSwitchToBuild}
            className="w-full mt-6 py-4 bg-scout-800 border border-scout-700 rounded-xl text-gray-400 hover:text-white hover:bg-scout-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
            <Keyboard size={16} /> Add with full details
        </button>
    </div>
);
