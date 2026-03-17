import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Home, Loader2 } from 'lucide-react';
import { Player } from '../types';
import { checkHousingAvailability } from '../services/housingService';

export interface TrialDates {
    start: string;
    end: string;
    flexible: boolean;
}

interface TrialRequestModalProps {
    player: Player;
    onSubmit: (trialDates: TrialDates) => void;
    onCancel: () => void;
}

export const TrialRequestModal: React.FC<TrialRequestModalProps> = ({
    player,
    onSubmit,
    onCancel
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [datesFlexible, setDatesFlexible] = useState(false);
    const [availability, setAvailability] = useState<{ total_available: number; total_beds: number; houses: { house_name: string; available: number; total_beds: number }[] } | null>(null);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    useEffect(() => {
        if (!startDate || !endDate || startDate > endDate) {
            setAvailability(null);
            return;
        }

        const timer = setTimeout(async () => {
            setLoadingAvailability(true);
            const result = await checkHousingAvailability(startDate, endDate);
            setAvailability({ total_available: result.total_available, total_beds: result.total_beds, houses: result.houses });
            setLoadingAvailability(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [startDate, endDate]);

    const handleSubmit = () => {
        const trialDates: TrialDates = {
            start: startDate,
            end: endDate,
            flexible: datesFlexible || (!startDate && !endDate),
        };
        onSubmit(trialDates);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-fade-in">
            <div className="bg-scout-900 border-2 border-scout-700 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-scout-800 px-6 py-5 border-b border-scout-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Request Trial</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            When should <span className="text-white font-bold">{player.name}</span> come for a trial?
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-scout-700 rounded-xl transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Date Picker */}
                <div className="p-6 space-y-4">
                    {/* Recommendation */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                        <p className="text-xs text-blue-300">
                            <span className="font-bold text-blue-200">Recommended:</span> 5–7 days, ideally Mon–Fri. Most training sessions, language classes, and recovery activities run during the workweek.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-scout-800 border-2 border-scout-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || undefined}
                                className="w-full px-4 py-3 bg-scout-800 border-2 border-scout-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    {/* Housing Availability */}
                    {(loadingAvailability || availability) && (
                        <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                            loadingAvailability
                                ? 'border-scout-700 bg-scout-800'
                                : availability && availability.total_available > 0
                                    ? 'border-emerald-500/30 bg-emerald-500/10'
                                    : 'border-amber-500/30 bg-amber-500/10'
                        }`}>
                            {loadingAvailability ? (
                                <>
                                    <Loader2 size={14} className="text-gray-400 animate-spin mt-0.5 shrink-0" />
                                    <p className="text-xs text-gray-400">Checking housing...</p>
                                </>
                            ) : availability && (
                                <>
                                    <Home size={14} className={`mt-0.5 shrink-0 ${availability.total_available > 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
                                    <div>
                                        <p className={`text-xs font-semibold ${availability.total_available > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                                            {availability.total_available > 0
                                                ? `${availability.total_available} bed${availability.total_available !== 1 ? 's' : ''} available`
                                                : 'Houses full — player will need own accommodation'}
                                        </p>
                                        {availability.total_available > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {availability.houses.filter(h => h.available > 0).map(h => (
                                                    <span key={h.house_name} className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                                        {h.house_name}: {h.available}/{h.total_beds}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => setDatesFlexible(!datesFlexible)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                            datesFlexible ? 'border-blue-500/50 bg-blue-500/10' : 'border-scout-700 bg-scout-800'
                        }`}
                    >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            datesFlexible ? 'border-blue-500 bg-blue-500' : 'border-scout-600'
                        }`}>
                            {datesFlexible && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className="text-sm text-gray-300">Dates are flexible</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-tight rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <CalendarDays size={16} />
                        Submit Trial Request
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-scout-700 bg-scout-800/50">
                    <p className="text-gray-500 text-xs text-center">
                        Leave dates blank if flexible — staff will confirm availability
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrialRequestModal;
