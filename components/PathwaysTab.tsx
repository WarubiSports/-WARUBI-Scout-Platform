import React, { useState } from 'react';
import { Globe, GraduationCap, Calendar, BookOpen, ExternalLink, Zap, Play, X, ShieldCheck, Check, AlertTriangle, Trophy, Fingerprint, Activity } from 'lucide-react';
import { MARKET_DATA, WARUBI_PROTOCOLS } from '../constants';

const PATHWAYS = [
    {
        id: 'europe',
        title: 'Development in Europe',
        subtitle: 'FC Köln ITP Program',
        desc: 'Elite 10-month residency in Germany. Players train daily with Bundesliga methodology, live in professional housing, and experience European football culture firsthand.',
        icon: Globe,
        gradient: 'from-red-600/20 via-red-500/10 to-transparent',
        borderColor: 'border-red-500/40',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        accentColor: 'text-red-400',
        stat: '10',
        statLabel: 'Month Program',
        points: [
            'Bundesliga academy methodology',
            'Professional housing in Cologne',
            'Daily high-performance training',
            'Cultural & language immersion'
        ],
        url: 'https://warubi-sports.com/3-german-soccer-academy-facts/',
        videoId: 'dyiMulYAzdo',
    },
    {
        id: 'college',
        title: 'US College Pathway',
        subtitle: 'NCAA • NAIA • NJCAA',
        desc: 'Navigate the complex US college recruiting landscape. We handle coach outreach, scholarship negotiation, and roster placement so players can focus on their game.',
        icon: GraduationCap,
        gradient: 'from-blue-600/20 via-blue-500/10 to-transparent',
        borderColor: 'border-blue-500/40',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        accentColor: 'text-blue-400',
        stat: '200+',
        statLabel: 'Placements Annually',
        points: [
            'D1, D2, D3, NAIA & NJCAA connections',
            'Full scholarship negotiation',
            'Athletic & academic matching'
        ],
        url: 'https://warubi-sports.com/college-scholarships/',
        videoId: 'jKNtijhnzC0',
    },
    {
        id: 'events',
        title: 'Exposure Events',
        subtitle: 'Showcases & ID Camps',
        desc: 'High-visibility showcases where players perform in front of verified college coaches and professional scouts. Every touch is tracked, every moment recorded.',
        icon: Calendar,
        gradient: 'from-orange-600/20 via-orange-500/10 to-transparent',
        borderColor: 'border-orange-500/40',
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-400',
        accentColor: 'text-orange-400',
        stat: '50+',
        statLabel: 'Promising Athletes',
        points: [
            'Verified coach attendance',
            'Professional video highlights',
            'Performance analytics reports'
        ],
        url: 'https://germany-socceracademy.com/tryouts-id-camps/',
        videoId: 'BPwV72OJbdE',
    },
    {
        id: 'coaching',
        title: 'Coaching Education',
        subtitle: 'UEFA & DFB Licenses',
        desc: 'Transition from player to coach with internationally recognized certifications. Learn from active professionals and gain credentials that open doors worldwide.',
        icon: BookOpen,
        gradient: 'from-emerald-600/20 via-emerald-500/10 to-transparent',
        borderColor: 'border-emerald-500/40',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        accentColor: 'text-emerald-400',
        stat: 'UEFA',
        statLabel: 'Certified Program',
        points: [
            'Internationally recognized licenses',
            'Active pro coach mentorship',
            'Global job placement network'
        ],
        url: 'https://warubi-sports.com/uefa-coaching-license-course/',
        videoId: 'kP3KuKfHYKs',
    }
];

export const PathwaysTab: React.FC = () => {
    const [activeVideo, setActiveVideo] = useState<string | null>(null);
    const [showSystemAudit, setShowSystemAudit] = useState(false);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-scout-accent/30 to-scout-accent/10 flex items-center justify-center">
                        <Zap size={20} className="text-scout-accent" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Player Pathways</h2>
                        <p className="text-gray-500 text-sm">Master these to place players in the right program.</p>
                    </div>
                </div>
            </div>

            {/* Pathways Grid - All Same Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PATHWAYS.map((pathway) => {
                    const Icon = pathway.icon;
                    return (
                        <div
                            key={pathway.id}
                            className={`p-5 rounded-2xl border ${pathway.borderColor} bg-gradient-to-br ${pathway.gradient} transition-all hover:scale-[1.02] hover:border-opacity-60 group relative overflow-hidden`}
                        >
                            {/* Stat */}
                            <div className="mb-4">
                                <div className={`text-3xl font-black ${pathway.accentColor}`}>
                                    {pathway.stat}
                                </div>
                                <div className="text-gray-500 text-xs">{pathway.statLabel}</div>
                            </div>

                            {/* Icon + Title */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl ${pathway.iconBg} flex items-center justify-center`}>
                                    <Icon size={20} className={pathway.iconColor} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">{pathway.title}</h3>
                                    <p className={`text-xs ${pathway.accentColor}`}>{pathway.subtitle}</p>
                                </div>
                            </div>

                            <p className="text-gray-400 text-xs mb-4 line-clamp-2">{pathway.desc}</p>

                            {/* Video Thumbnail */}
                            {pathway.videoId && (
                                <button
                                    onClick={() => setActiveVideo(pathway.videoId)}
                                    className="block relative mb-4 rounded-xl overflow-hidden group/video w-full cursor-pointer"
                                >
                                    <img
                                        src={`https://img.youtube.com/vi/${pathway.videoId}/hqdefault.jpg`}
                                        alt={`${pathway.title} video`}
                                        className="w-full h-28 object-cover brightness-75 group-hover/video:brightness-90 transition-all"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`w-10 h-10 rounded-full ${pathway.iconBg} flex items-center justify-center group-hover/video:scale-110 transition-transform`}>
                                            <Play size={18} className={`${pathway.iconColor} ml-0.5`} fill="currentColor" />
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Points */}
                            <ul className="space-y-1.5 mb-4">
                                {pathway.points.slice(0, 3).map((point, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                        <div className={`w-1 h-1 rounded-full ${pathway.iconBg.replace('/20', '')}`} />
                                        {point}
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={pathway.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 text-xs font-bold ${pathway.accentColor} hover:text-white transition-colors group`}
                            >
                                Learn more
                                <ExternalLink size={10} className="group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>
                    );
                })}
            </div>

            {/* Scout Foundations Section */}
            <div className="mt-12">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10 flex items-center justify-center">
                        <ShieldCheck size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Scout Foundations</h3>
                        <p className="text-gray-500 text-xs">Know your company. Sell with confidence.</p>
                    </div>
                </div>

                {/* The Warubi System Card */}
                <button
                    onClick={() => setShowSystemAudit(true)}
                    className="w-full text-left p-5 rounded-2xl border border-scout-accent/40 bg-gradient-to-br from-scout-accent/20 via-scout-accent/10 to-transparent transition-all hover:scale-[1.01] hover:border-scout-accent/60 group"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-scout-accent/20 flex items-center justify-center">
                                    <Trophy size={20} className="text-scout-accent" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white">The Warubi System</h4>
                                    <p className="text-xs text-scout-accent">Why Families Trust Us</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-xs mb-4">
                                Understand what sets Warubi apart from traditional agencies. Verifiable placements, transparent processes, and the hybrid global model.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-scout-accent/10 rounded-full text-[10px] font-bold text-scout-accent">200+ Placements</span>
                                <span className="px-2 py-1 bg-blue-500/10 rounded-full text-[10px] font-bold text-blue-400">FIFA Verified</span>
                                <span className="px-2 py-1 bg-red-500/10 rounded-full text-[10px] font-bold text-red-400">FC Köln Partner</span>
                            </div>
                        </div>
                        <div className="text-gray-500 group-hover:text-scout-accent transition-colors">
                            <ExternalLink size={16} />
                        </div>
                    </div>
                </button>
            </div>

            {/* System Audit Modal */}
            {showSystemAudit && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8"
                    onClick={() => setShowSystemAudit(false)}
                >
                    <div
                        className="relative w-full max-w-4xl mx-4 bg-scout-900 rounded-3xl border border-scout-700 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowSystemAudit(false)}
                            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
                            {/* Header */}
                            <div className="text-center space-y-3">
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                                    The Warubi <span className="text-scout-accent">System</span>
                                </h2>
                                <p className="text-gray-400 text-sm max-w-xl mx-auto">
                                    Eliminating information asymmetry in global scouting. Verifiable data over promises.
                                </p>
                            </div>

                            {/* Comparison Grid */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-scout-warning uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle size={14} /> Industry Problem
                                    </h3>
                                    <div className="bg-scout-warning/5 border border-scout-warning/20 rounded-2xl p-5 space-y-4">
                                        {MARKET_DATA.AUDIT_METRICS.map((m, i) => (
                                            <div key={i} className="flex gap-3 items-start">
                                                <X className="text-scout-warning mt-0.5 shrink-0" size={14} />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-500 uppercase">{m.label}</p>
                                                    <p className="text-xs text-white">{m.oldWay}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-scout-accent uppercase tracking-widest flex items-center gap-2">
                                        <Check size={14} /> Warubi Protocol
                                    </h3>
                                    <div className="bg-scout-accent/5 border border-scout-accent/30 rounded-2xl p-5 space-y-4">
                                        {MARKET_DATA.AUDIT_METRICS.map((m, i) => (
                                            <div key={i} className="flex gap-3 items-start">
                                                <Check className="text-scout-accent mt-0.5 shrink-0" size={14} />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-500 uppercase">{m.label}</p>
                                                    <p className="text-xs text-white font-bold">{m.warubi}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* The Hybrid Model */}
                            <div className="bg-scout-800 rounded-2xl p-6 border border-scout-700">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-3">
                                    The Hybrid <span className="text-blue-400">Global Model</span>
                                </h3>
                                <p className="text-gray-300 text-sm mb-4">
                                    We fuse the intensity of European professional development with the financial security of the American collegiate system. Professional exposure today, debt-free education tomorrow.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-scout-900/50 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Global Soccer Market</p>
                                        <p className="text-xl font-black text-white">{MARKET_DATA.GLOBAL_MARKET}</p>
                                    </div>
                                    <div className="p-3 bg-scout-900/50 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">US Scholarship Fund</p>
                                        <p className="text-xl font-black text-blue-400">{MARKET_DATA.US_SCHOLARSHIP_FUND}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Operating Protocols */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest text-center">Operating Protocols</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {WARUBI_PROTOCOLS.map(p => (
                                        <div key={p.id} className={`bg-scout-900/50 border rounded-xl p-4 space-y-2 ${p.color}`}>
                                            <h4 className="font-black uppercase text-[10px]">{p.title}</h4>
                                            <ul className="space-y-1.5">
                                                {p.principles.slice(0, 2).map((pr, i) => (
                                                    <li key={i} className="text-[9px] text-gray-400 flex gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-current mt-1 shrink-0"></div>
                                                        {pr}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="border-t border-white/5 pt-6">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest text-center mb-4">Authority Registry</h3>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                                        <ShieldCheck size={20} className="text-scout-accent" />
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase">FIFA Verified</p>
                                            <p className="text-[8px] text-gray-500">Licensed Agents</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                                        <Activity size={20} className="text-blue-400" />
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase">UEFA Instruction</p>
                                            <p className="text-[8px] text-gray-500">German Methodology</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                                        <Fingerprint size={20} className="text-red-400" />
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase">FC Köln Partner</p>
                                            <p className="text-[8px] text-gray-500">Direct Residency</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {activeVideo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setActiveVideo(null)}
                >
                    <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setActiveVideo(null)}
                            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={28} />
                        </button>
                        <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-black">
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
                                title="Pathway Video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PathwaysTab;
