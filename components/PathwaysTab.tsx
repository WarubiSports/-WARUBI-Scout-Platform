import React, { useState } from 'react';
import { Globe, GraduationCap, Calendar, BookOpen, ExternalLink, Zap, Play, X } from 'lucide-react';

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

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
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
