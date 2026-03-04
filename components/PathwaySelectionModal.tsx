import React, { useState } from 'react';
import { Globe, GraduationCap, Calendar, BookOpen, X, ArrowRight, ArrowLeft, UserCheck, ClipboardCheck } from 'lucide-react';
import { Player } from '../types';

type PathwayId = 'europe' | 'europe:trial' | 'europe:direct' | 'college' | 'events' | 'coaching';

interface PathwayOption {
    id: PathwayId;
    title: string;
    shortDesc: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}

const PATHWAY_OPTIONS: PathwayOption[] = [
    {
        id: 'europe',
        title: 'Development in Europe',
        shortDesc: 'FC Köln ITP & Pro Trials',
        icon: <Globe size={24} />,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30 hover:border-red-500'
    },
    {
        id: 'college',
        title: 'College Pathway',
        shortDesc: 'NCAA, NAIA, NJCAA',
        icon: <GraduationCap size={24} />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30 hover:border-blue-500'
    },
    {
        id: 'events',
        title: 'Exposure Events',
        shortDesc: 'Showcases, ID Days, Camps',
        icon: <Calendar size={24} />,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30 hover:border-orange-500'
    },
    {
        id: 'coaching',
        title: 'Coaching Education',
        shortDesc: 'UEFA & German FA Licenses',
        icon: <BookOpen size={24} />,
        color: 'text-gray-300',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30 hover:border-gray-400'
    }
];

const EUROPE_SUB_OPTIONS: PathwayOption[] = [
    {
        id: 'europe:trial',
        title: 'Trial Invite',
        shortDesc: 'Player comes for a tryout first',
        icon: <ClipboardCheck size={24} />,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30 hover:border-red-500'
    },
    {
        id: 'europe:direct',
        title: 'Direct Sign',
        shortDesc: 'Player is already accepted',
        icon: <UserCheck size={24} />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30 hover:border-emerald-500'
    },
];

interface PathwaySelectionModalProps {
    player: Player;
    onSelect: (pathway: PathwayId) => void;
    onCancel: () => void;
}

export const PathwaySelectionModal: React.FC<PathwaySelectionModalProps> = ({
    player,
    onSelect,
    onCancel
}) => {
    const [showEuropeSub, setShowEuropeSub] = useState(false);

    const options = showEuropeSub ? EUROPE_SUB_OPTIONS : PATHWAY_OPTIONS;
    const headerTitle = showEuropeSub ? 'Europe — Type of Offer' : 'Select Pathway';
    const headerDesc = showEuropeSub
        ? <>Is <span className="text-white font-bold">{player.name}</span> coming for a trial or signing directly?</>
        : <>Which pathway is <span className="text-white font-bold">{player.name}</span> being offered?</>;

    const handleSelect = (id: PathwayId) => {
        if (id === 'europe') {
            setShowEuropeSub(true);
            return;
        }
        onSelect(id);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-fade-in">
            <div className="bg-scout-900 border-2 border-scout-700 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-scout-800 px-6 py-5 border-b border-scout-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {showEuropeSub && (
                            <button
                                onClick={() => setShowEuropeSub(false)}
                                className="p-2 hover:bg-scout-700 rounded-xl transition-colors"
                            >
                                <ArrowLeft size={18} className="text-gray-400" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{headerTitle}</h2>
                            <p className="text-gray-400 text-sm mt-1">{headerDesc}</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-scout-700 rounded-xl transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Pathway Options */}
                <div className="p-6 space-y-3">
                    {options.map((pathway) => (
                        <button
                            key={pathway.id}
                            onClick={() => handleSelect(pathway.id)}
                            className={`w-full p-4 rounded-2xl border-2 ${pathway.borderColor} ${pathway.bgColor} transition-all duration-200 hover:scale-[1.02] group flex items-center gap-4 text-left`}
                        >
                            <div className={`p-3 rounded-xl bg-scout-900/50 ${pathway.color}`}>
                                {pathway.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-sm uppercase tracking-tight">{pathway.title}</h3>
                                <p className="text-gray-400 text-xs mt-0.5">{pathway.shortDesc}</p>
                            </div>
                            <ArrowRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-scout-700 bg-scout-800/50">
                    <p className="text-gray-500 text-xs text-center">
                        This will mark the player as Offered and record the selected pathway
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PathwaySelectionModal;
