import React from 'react';
import {
    X, CheckCircle, ExternalLink, Edit2, MapPin, Mail, Phone, User,
    GraduationCap, Globe, Video, Footprints, Ruler, Weight, Calendar
} from 'lucide-react';
import { Player, PlayerStatus } from '../types';
import type { PlayerWithScout } from '../hooks/useAllProspects';

interface AdminPlayerDetailProps {
    player: PlayerWithScout;
    onClose: () => void;
    onEdit: (player: PlayerWithScout) => void;
    onPlace: (player: Player) => void;
}

const tierColor = (tier: string | undefined) => {
    if (tier === 'Tier 1') return 'bg-purple-100 text-purple-700';
    if (tier === 'Tier 2') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
};

const statusColor = (status: PlayerStatus) => {
    if (status === PlayerStatus.PLACED) return 'bg-green-100 text-green-700';
    if (status === PlayerStatus.OFFERED) return 'bg-amber-100 text-amber-700';
    if (status === PlayerStatus.INTERESTED) return 'bg-blue-100 text-blue-700';
    if (status === PlayerStatus.CONTACTED) return 'bg-cyan-100 text-cyan-700';
    return 'bg-gray-100 text-gray-600';
};

const PerformanceBar = ({ label, value }: { label: string; value: number | undefined }) => {
    const v = value || 0;
    const color = v >= 80 ? 'bg-green-500' : v >= 60 ? 'bg-blue-500' : v >= 40 ? 'bg-amber-500' : 'bg-gray-400';
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 text-right">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${v}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700 w-8">{v || '—'}</span>
        </div>
    );
};

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | undefined | null; icon?: any }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2 py-1">
            {Icon && <Icon size={13} className="text-gray-400 mt-0.5 shrink-0" />}
            <div>
                <span className="text-[10px] text-gray-400 uppercase block">{label}</span>
                <span className="text-sm text-gray-800">{value}</span>
            </div>
        </div>
    );
};

const AdminPlayerDetail: React.FC<AdminPlayerDetailProps> = ({ player, onClose, onEdit, onPlace }) => {
    const ev = player.evaluation;
    const age = player.age ? `${player.age} yrs` : player.dateOfBirth || undefined;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 z-[119]" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-[120] flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-lg font-bold text-blue-700 shrink-0">
                            {player.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{player.name}</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {player.position && <span className="font-medium">{player.position}</span>}
                                {age && <><span>•</span><span>{age}</span></>}
                                {player.club && <><span>•</span><span>{player.club}</span></>}
                            </div>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                Scout: {player.scoutName}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">

                    {/* Score + Status Row */}
                    <div className="flex items-center gap-3">
                        {ev?.score != null && (
                            <div className="w-12 h-12 rounded-full border-2 border-blue-200 bg-blue-50 flex items-center justify-center">
                                <span className="text-lg font-black text-blue-700">{ev.score}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${tierColor(ev?.scholarshipTier)}`}>
                                {ev?.scholarshipTier || 'Untiered'}
                            </span>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${statusColor(player.status)}`}>
                                {player.status}
                            </span>
                            {player.status === PlayerStatus.PLACED && player.placedLocation && (
                                <span className="text-[10px] text-green-600 flex items-center gap-1">
                                    <MapPin size={10} /> {player.placedLocation}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Evaluation */}
                    {ev && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Evaluation</h3>
                            {ev.summary && <p className="text-sm text-gray-700 leading-relaxed">{ev.summary}</p>}

                            {ev.strengths.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {ev.strengths.map((s, i) => (
                                        <span key={i} className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{s}</span>
                                    ))}
                                </div>
                            )}
                            {ev.weaknesses.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {ev.weaknesses.map((w, i) => (
                                        <span key={i} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{w}</span>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {ev.collegeLevel && (
                                    <div><span className="text-[10px] text-gray-400 uppercase block">College Level</span><span className="font-medium text-gray-800">{ev.collegeLevel}</span></div>
                                )}
                                {ev.nextAction && (
                                    <div><span className="text-[10px] text-gray-400 uppercase block">Next Action</span><span className="font-medium text-gray-800">{ev.nextAction}</span></div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <hr className="border-gray-100" />

                    {/* Profile Info */}
                    <div className="space-y-1">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Profile</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
                            <InfoRow label="Club" value={player.club} icon={Globe} />
                            <InfoRow label="Team Level" value={player.teamLevel} />
                            <InfoRow label="Grad Year" value={player.gradYear} icon={GraduationCap} />
                            <InfoRow label="Age" value={age} icon={Calendar} />
                            <InfoRow label="Height" value={player.height} icon={Ruler} />
                            <InfoRow label="Weight" value={player.weight} icon={Weight} />
                            <InfoRow label="Foot" value={player.dominantFoot} icon={Footprints} />
                            <InfoRow label="Nationality" value={player.nationality} icon={Globe} />
                            <InfoRow label="EU Passport" value={player.hasEuPassport != null ? (player.hasEuPassport ? 'Yes' : 'No') : undefined} />
                            <InfoRow label="GPA" value={player.gpa} />
                            <InfoRow label="SAT/ACT" value={player.satAct} />
                            <InfoRow label="Secondary Pos" value={player.secondaryPosition} />
                        </div>
                    </div>

                    {/* Performance Bars */}
                    {(player.pace || player.physical || player.technical || player.tactical || player.coachable) && (
                        <>
                            <hr className="border-gray-100" />
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Performance Audit</h3>
                                <PerformanceBar label="Pace" value={player.pace} />
                                <PerformanceBar label="Physical" value={player.physical} />
                                <PerformanceBar label="Technical" value={player.technical} />
                                <PerformanceBar label="Tactical" value={player.tactical} />
                                <PerformanceBar label="Coachable" value={player.coachable} />
                            </div>
                        </>
                    )}

                    {/* Contact */}
                    {(player.email || player.phone || player.parentName || player.parentEmail || player.parentPhone) && (
                        <>
                            <hr className="border-gray-100" />
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {player.email && (
                                        <a href={`mailto:${player.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline truncate">
                                            <Mail size={13} /> {player.email}
                                        </a>
                                    )}
                                    {player.phone && (
                                        <a href={`tel:${player.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                                            <Phone size={13} /> {player.phone}
                                        </a>
                                    )}
                                </div>
                                {(player.parentName || player.parentEmail || player.parentPhone) && (
                                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Parent/Guardian</span>
                                        {player.parentName && <p className="text-sm font-medium text-gray-800"><User size={12} className="inline mr-1 text-gray-400" />{player.parentName}</p>}
                                        <div className="flex gap-4 text-sm">
                                            {player.parentEmail && (
                                                <a href={`mailto:${player.parentEmail}`} className="flex items-center gap-1 text-blue-600 hover:underline truncate">
                                                    <Mail size={12} /> {player.parentEmail}
                                                </a>
                                            )}
                                            {player.parentPhone && (
                                                <a href={`tel:${player.parentPhone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                                    <Phone size={12} /> {player.parentPhone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    {player.notes && (
                        <>
                            <hr className="border-gray-100" />
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{player.notes}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Sticky Action Bar */}
                <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-3">
                    {player.videoLink && (
                        <a
                            href={player.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Video size={15} /> Video
                            <ExternalLink size={11} className="text-gray-400" />
                        </a>
                    )}
                    <button
                        onClick={() => onEdit(player)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Edit2 size={15} /> Edit Player
                    </button>
                    {player.status !== PlayerStatus.PLACED && (
                        <button
                            onClick={() => onPlace(player)}
                            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                            <CheckCircle size={15} /> Mark Placed
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminPlayerDetail;
