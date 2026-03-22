import React, { useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { Player } from '../types';
import { PROGRAM_DURATIONS } from '../constants';

export interface PlacementData {
    programDuration: 'full_season' | '6_months' | '3_months' | '1_month';
    placedLocation: string;
}

interface PlacementModalProps {
    player: Player;
    onSubmit: (data: PlacementData) => void;
    onCancel: () => void;
}

export const PlacementModal: React.FC<PlacementModalProps> = ({
    player,
    onSubmit,
    onCancel
}) => {
    const [duration, setDuration] = useState<PlacementData['programDuration'] | ''>('');
    const [location, setLocation] = useState(player.placedLocation || '');

    const handleSubmit = () => {
        if (!duration) return;
        onSubmit({
            programDuration: duration,
            placedLocation: location,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-fade-in">
            <div className="bg-scout-900 border-2 border-scout-700 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-scout-800 px-6 py-5 border-b border-scout-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Confirm Placement</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            <span className="text-white font-bold">{player.name}</span> is getting an opportunity that changes their career
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-scout-700 rounded-xl transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Program Duration */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Program Duration *</label>
                        <div className="space-y-2">
                            {PROGRAM_DURATIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setDuration(opt.value)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                                        duration === opt.value
                                            ? 'border-scout-accent/50 bg-scout-accent/10'
                                            : 'border-scout-700 bg-scout-800 hover:border-scout-600'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        duration === opt.value ? 'border-scout-accent bg-scout-accent' : 'border-scout-600'
                                    }`}>
                                        {duration === opt.value && <span className="text-scout-900 text-xs font-bold">✓</span>}
                                    </div>
                                    <span className="text-sm text-gray-300 font-bold">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Placed Location */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Placement Location</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. FC Köln ITP, UCLA, Signed Pro Contract"
                            className="w-full px-4 py-3 bg-scout-800 border-2 border-scout-700 rounded-xl text-white text-sm focus:outline-none focus:border-scout-accent transition-colors placeholder:text-gray-600"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!duration}
                        className={`w-full py-3 font-bold text-sm uppercase tracking-tight rounded-xl transition-colors flex items-center justify-center gap-2 ${
                            duration
                                ? 'bg-scout-accent hover:bg-scout-accent/90 text-scout-900'
                                : 'bg-scout-700 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <Trophy size={16} />
                        Confirm Placement
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-scout-700 bg-scout-800/50">
                    <p className="text-gray-500 text-xs text-center">
                        You found them. You opened the door. That matters.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlacementModal;
