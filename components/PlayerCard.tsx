
import React, { useState } from 'react';
import { Player, PlayerStatus } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, MessageCircle, MessageSquare, ChevronDown, ChevronUp, MapPin, School, Compass, Send, GripVertical, Flame, Eye, StickyNote, Save, X, History, Clock, Edit2, Loader2, Trophy, Zap, Target, ArrowRight, Timer, Trash2 } from 'lucide-react';

interface PlayerCardProps {
    player: Player;
    onStatusChange?: (id: string, newStatus: PlayerStatus, extraData?: string) => void;
    onOutreach?: (player: Player) => void;
    onUpdateNotes?: (id: string, notes: string) => void;
    onEdit?: (player: Player) => void;
    onDelete?: (id: string) => void;
    isReference?: boolean;
    onDragStart?: (id: string) => void;
    onDragEnd?: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    onStatusChange,
    onOutreach,
    onUpdateNotes,
    onEdit,
    onDelete,
    isReference = false,
    onDragStart,
    onDragEnd
}) => {
    const [extraInput, setExtraInput] = useState(player.interestedProgram || player.placedLocation || '');
    const [isEditingData, setIsEditingData] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [noteContent, setNoteContent] = useState(player.notes || '');
    const [showNotes, setShowNotes] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const scoreColor = (score: number) => {
        if (score >= 85) return 'text-scout-accent';
        if (score >= 70) return 'text-scout-highlight';
        return 'text-gray-400';
    };

    const tierBadge = (tier?: string) => {
        if (tier === 'Tier 1') return 'bg-scout-accent text-scout-900';
        if (tier === 'Tier 2') return 'bg-scout-highlight/20 text-scout-highlight';
        return 'bg-gray-700/50 text-gray-400';
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!onStatusChange) return;
        onStatusChange(player.id, e.target.value as PlayerStatus);
    };

    const saveExtraData = () => {
        if (!onStatusChange) return;
        onStatusChange(player.id, player.status, extraInput);
        setIsEditingData(false);
    }

    const saveNotes = () => {
        if (!onUpdateNotes) return;
        onUpdateNotes(player.id, noteContent);
        setShowNotes(false);
    };

    const sendFinalReviewEmail = () => {
        const subject = `Final Review Candidate: ${player.name}`;
        const body = `Hi Scouting Team,\n\nI am submitting ${player.name} for final review.\n\nPlayer Details:\n- Position: ${player.position}\n- Age: ${player.age}\n- Scholarship Tier: ${player.evaluation?.scholarshipTier || 'N/A'}\n- Scout Score: ${player.evaluation?.score || 'N/A'}\n\nSummary:\n${player.evaluation?.summary || 'N/A'}\n\nNotes:\n${player.notes || 'N/A'}\n\nPlease advise on next steps.`;
        window.location.href = `mailto:scouting@warubi-sports.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // Calculate time-based urgency
    const getUrgency = () => {
        if (player.activityStatus === 'signal' || player.activityStatus === 'spotlight') {
            return { label: 'HOT - Respond now', color: 'text-orange-400 bg-orange-500/10', urgent: true };
        }
        if (player.lastActive) {
            const hoursAgo = Math.floor((Date.now() - new Date(player.lastActive).getTime()) / (1000 * 60 * 60));
            if (hoursAgo < 1) return { label: 'Active now', color: 'text-green-400 bg-green-500/10', urgent: true };
            if (hoursAgo < 24) return { label: `Active ${hoursAgo}h ago`, color: 'text-scout-accent bg-scout-accent/10', urgent: false };
        }
        if (player.lastContactedAt) {
            const daysAgo = Math.floor((Date.now() - new Date(player.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysAgo > 7) return { label: `${daysAgo} days since contact`, color: 'text-yellow-400 bg-yellow-500/10', urgent: true };
        }
        return null;
    };

    // Generate confidence line based on status and data
    const getConfidenceLine = () => {
        const score = player.evaluation?.score || 0;
        const tier = player.evaluation?.scholarshipTier;
        const college = player.evaluation?.collegeLevel;

        if (player.status === PlayerStatus.OFFERED) {
            return `Score ${score}. ${tier || 'Untiered'}. Offer extended - follow up!`;
        }
        if (player.status === PlayerStatus.INTERESTED && player.interestedProgram) {
            return `Matched to ${player.interestedProgram}. Awaiting response.`;
        }
        if (player.status === PlayerStatus.PLACED) {
            return `Successfully placed at ${player.placedLocation || 'program'}.`;
        }
        if (score >= 85) {
            return `Top-tier talent. ${college || 'D1 potential'}. Worth priority outreach.`;
        }
        if (score >= 75) {
            return `Strong prospect. ${college || 'D1/D2 fit'}. Schedule a call.`;
        }
        if (score >= 65) {
            return `Solid fit for ${college || 'D2/NAIA'}. Good development case.`;
        }
        return player.evaluation?.summary ? player.evaluation.summary.split('.')[0] + '.' : 'Needs more evaluation.';
    };

    // Determine the primary action
    const getAction = () => {
        if (player.status === PlayerStatus.PLACED) {
            return { label: 'View Details', onClick: () => onEdit?.(player), primary: false };
        }
        if (player.status === PlayerStatus.OFFERED) {
            return { label: 'Follow Up', onClick: () => onOutreach?.(player), primary: true };
        }
        if (player.status === PlayerStatus.INTERESTED) {
            return { label: 'View Details', onClick: () => onEdit?.(player), primary: false };
        }
        if (player.activityStatus === 'signal' || player.activityStatus === 'spotlight') {
            return { label: 'Message Now', onClick: () => onOutreach?.(player), primary: true };
        }
        if (!player.lastContactedAt || (Date.now() - new Date(player.lastContactedAt).getTime()) > 7 * 24 * 60 * 60 * 1000) {
            return { label: 'Reach Out', onClick: () => onOutreach?.(player), primary: true };
        }
        return { label: player.evaluation?.nextAction || 'View Profile', onClick: () => onOutreach?.(player), primary: false };
    };

    const urgency = getUrgency();
    const action = getAction();
    const score = player.evaluation?.score || 0;

    return (
        <div
            draggable={!isReference}
            onDragStart={(e) => {
                if (!isReference) {
                    e.dataTransfer.setData('playerId', player.id);
                    e.dataTransfer.effectAllowed = 'move';
                    if (onDragStart) onDragStart(player.id);
                }
            }}
            onDragEnd={() => {
                if (!isReference && onDragEnd) onDragEnd();
            }}
            className={`bg-scout-800 rounded-xl border shadow-sm transition-all overflow-hidden
        ${isReference ? 'opacity-80 border-scout-700' : 'border-scout-700 hover:border-scout-accent/50 cursor-grab active:cursor-grabbing hover:shadow-lg'}
        ${player.isRecalibrating ? 'ring-2 ring-scout-accent/50 animate-pulse' : ''}
        ${urgency?.urgent ? 'ring-1 ring-orange-500/30' : ''}`}
        >
            {/* ACTION HERO SECTION - What to do is the headline */}
            <div className={`px-4 py-3 rounded-t-xl flex items-center justify-between gap-3 ${action.primary ? 'bg-scout-accent/10 border-b border-scout-accent/20' : 'bg-scout-900/50 border-b border-scout-700/50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <Target size={14} className={action.primary ? 'text-scout-accent' : 'text-gray-500'} />
                    <span className={`text-xs font-black uppercase tracking-wide truncate ${action.primary ? 'text-scout-accent' : 'text-gray-400'}`}>
                        {action.label}
                    </span>
                </div>
                <button
                    onClick={action.onClick}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 ${action.primary
                            ? 'bg-scout-accent text-scout-900 shadow-glow hover:bg-emerald-400'
                            : 'bg-scout-700 text-white hover:bg-scout-600'
                        }`}
                >
                    <ArrowRight size={12} /> Go
                </button>
            </div>

            {/* PLAYER IDENTITY - Compact */}
            <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            {!isReference && <GripVertical size={12} className="text-gray-600 shrink-0" />}
                            <h3 className="text-sm font-bold text-white truncate">{player.name}</h3>
                            {player.activityStatus === 'spotlight' && (
                                <Trophy size={12} className="text-scout-accent shrink-0" />
                            )}
                            {player.activityStatus === 'signal' && (
                                <Flame size={12} className="text-orange-400 animate-pulse shrink-0" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="font-bold">{player.position}</span>
                            <span>•</span>
                            <span>{player.age}yo</span>
                            {player.evaluation?.scholarshipTier && (
                                <>
                                    <span>•</span>
                                    <span className={`px-1.5 py-0.5 rounded font-bold ${tierBadge(player.evaluation.scholarshipTier)}`}>
                                        {player.evaluation.scholarshipTier}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                        {player.isRecalibrating ? (
                            <Loader2 size={20} className="text-scout-accent animate-spin" />
                        ) : (
                            <div className={`text-2xl font-black leading-none ${scoreColor(score)}`}>
                                {score || '—'}
                            </div>
                        )}
                    </div>
                </div>

                {/* CONFIDENCE LINE - One sentence verdict */}
                <p className="text-[11px] text-gray-300 mt-2 leading-relaxed line-clamp-2 bg-scout-900/50 rounded-lg p-2 border border-scout-700/30">
                    "{getConfidenceLine()}"
                </p>

                {/* URGENCY INDICATOR */}
                {urgency && (
                    <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${urgency.color} px-2 py-1 rounded-lg w-fit`}>
                        <Timer size={10} />
                        {urgency.label}
                    </div>
                )}

                {/* INTERESTED/PLACED DATA */}
                {!isReference && (player.status === PlayerStatus.INTERESTED || player.status === PlayerStatus.PLACED) && (
                    <div className="mt-2 bg-scout-900/50 p-2 rounded-lg border border-scout-700/50 text-[10px]">
                        <div className="flex justify-between items-center mb-1 text-gray-400">
                            <span className="flex items-center gap-1">
                                {player.status === PlayerStatus.INTERESTED ? <School size={10} /> : <MapPin size={10} />}
                                {player.status === PlayerStatus.INTERESTED ? "Program" : "Placed at"}
                            </span>
                            <button onClick={() => setIsEditingData(!isEditingData)} className="text-scout-accent hover:underline text-[9px]">
                                {isEditingData ? 'Done' : 'Edit'}
                            </button>
                        </div>
                        {isEditingData ? (
                            <div className="flex gap-1">
                                <input
                                    value={extraInput}
                                    onChange={(e) => setExtraInput(e.target.value)}
                                    className="bg-scout-800 border border-scout-600 rounded px-2 py-1 w-full text-white text-xs focus:outline-none"
                                    placeholder={player.status === PlayerStatus.INTERESTED ? "e.g. UCLA" : "e.g. FC Dallas"}
                                />
                                <button onClick={saveExtraData} className="bg-scout-accent text-scout-900 px-2 rounded font-bold text-xs">OK</button>
                            </div>
                        ) : (
                            <p className="text-white font-medium truncate">
                                {player.status === PlayerStatus.INTERESTED ? (player.interestedProgram || "Not set") : (player.placedLocation || "Not set")}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* COLLAPSED CONTROLS - Expand for more */}
            <div className="px-3 pb-2 flex flex-wrap gap-2">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 flex items-center justify-center gap-1 text-[9px] uppercase font-bold py-1.5 rounded-lg bg-scout-900/50 text-gray-500 hover:text-white hover:bg-scout-700/50 transition-colors"
                >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isExpanded ? 'Less' : 'Details'}
                </button>
                <button
                    onClick={() => setShowNotes(!showNotes)}
                    className={`flex items-center justify-center gap-1 text-[9px] uppercase font-bold py-1.5 px-3 rounded-lg transition-colors ${showNotes ? 'bg-scout-accent/20 text-scout-accent' : 'bg-scout-900/50 text-gray-500 hover:text-white hover:bg-scout-700/50'}`}
                >
                    <StickyNote size={10} />
                    {player.notes ? '📝' : ''}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit?.(player); }}
                    className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold py-1.5 px-3 rounded-lg bg-scout-900/50 text-gray-500 hover:text-white hover:bg-scout-700/50 transition-colors"
                >
                    <Edit2 size={10} />
                </button>
                {onDelete && !isReference && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                        className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold py-1.5 px-3 rounded-lg bg-scout-900/50 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete player"
                    >
                        <Trash2 size={10} />
                    </button>
                )}
                {player.phone && (
                    <a
                        href={`https://wa.me/${player.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${player.name}, this is a scout from Warubi Sports. I noticed your talent and wanted to connect about potential opportunities.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold py-1.5 px-3 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/40 hover:text-green-300 transition-colors"
                        title="WhatsApp"
                    >
                        <MessageCircle size={10} />
                    </a>
                )}
                {!isReference && (
                    <select
                        value={player.status}
                        onChange={handleStatusChange}
                        className="appearance-none bg-scout-900/50 text-[9px] font-bold uppercase pl-2 pr-5 py-1.5 rounded-lg border border-scout-700/50 text-gray-400 focus:border-scout-accent focus:outline-none cursor-pointer hover:bg-scout-700/50"
                    >
                        <option value={PlayerStatus.LEAD}>Lead</option>
                        <option value={PlayerStatus.CONTACTED}>Contacted</option>
                        <option value={PlayerStatus.INTERESTED}>Interested</option>
                        <option value={PlayerStatus.OFFERED}>Offered</option>
                        <option value={PlayerStatus.PLACED}>Placed</option>
                        <option value={PlayerStatus.ARCHIVED}>Archived</option>
                    </select>
                )}
            </div>

            {/* EXPANDED CONTENT */}
            {isExpanded && player.evaluation && (
                <div className="px-3 pb-3 animate-fade-in border-t border-scout-700/50 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-scout-900/50 p-2 rounded-lg">
                            <p className="text-gray-500 mb-1 flex items-center gap-1 font-bold"><CheckCircle size={10} className="text-scout-accent" /> Strengths</p>
                            <ul className="text-gray-300 space-y-0.5">
                                {(player.evaluation.strengths || []).slice(0, 2).map((s, i) => <li key={i} className="truncate">• {s}</li>)}
                            </ul>
                        </div>
                        <div className="bg-scout-900/50 p-2 rounded-lg">
                            <p className="text-gray-500 mb-1 flex items-center gap-1 font-bold"><AlertTriangle size={10} className="text-yellow-500" /> Focus Areas</p>
                            <ul className="text-gray-300 space-y-0.5">
                                {(player.evaluation.weaknesses || []).slice(0, 2).map((w, i) => <li key={i} className="truncate">• {w}</li>)}
                            </ul>
                        </div>
                    </div>
                    <div className="bg-scout-900/50 p-2 rounded-lg flex items-center gap-2">
                        <TrendingUp size={14} className="text-scout-accent shrink-0" />
                        <div>
                            <p className="text-[9px] text-gray-500 uppercase font-bold">College Projection</p>
                            <p className="text-xs text-white">{player.evaluation.collegeLevel}</p>
                        </div>
                    </div>
                    {player.outreachLogs.length > 0 && (
                        <div className="bg-scout-900/50 p-2 rounded-lg flex items-center gap-2">
                            <History size={14} className="text-gray-500 shrink-0" />
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase font-bold">Last Contact</p>
                                <p className="text-xs text-white">{new Date(player.lastContactedAt!).toLocaleDateString()} - {player.outreachLogs[player.outreachLogs.length - 1].templateName}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* NOTES PANEL */}
            {showNotes && (
                <div className="px-3 pb-3 animate-fade-in border-t border-scout-700/50 pt-3">
                    <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full bg-scout-900 border border-scout-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-scout-accent resize-none h-20"
                        placeholder="Quick notes about this player..."
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={saveNotes}
                            className="flex-1 bg-scout-accent text-scout-900 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1"
                        >
                            <Save size={10} /> Save
                        </button>
                        <button
                            onClick={() => { setNoteContent(player.notes || ''); setShowNotes(false); }}
                            className="bg-scout-700 text-gray-300 text-[10px] font-bold py-1.5 px-3 rounded-lg"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {showDeleteConfirm && (
                <div className="px-3 pb-3 animate-fade-in border-t border-red-500/30 pt-3 bg-red-500/5">
                    <p className="text-xs text-red-400 mb-3 text-center">
                        Delete <span className="font-bold">{player.name}</span>? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 bg-scout-700 text-gray-300 text-[10px] font-bold py-2 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onDelete?.(player.id); setShowDeleteConfirm(false); }}
                            className="flex-1 bg-red-500 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-red-600 transition-colors"
                        >
                            <Trash2 size={10} /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerCard;
