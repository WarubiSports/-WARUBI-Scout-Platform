import React from 'react';
import { Globe, GraduationCap, Calendar, BookOpen, ExternalLink, Users, Zap, ArrowRight } from 'lucide-react';

const PATHWAYS = [
    {
        id: 'europe',
        title: 'Development in Europe',
        subtitle: 'FC Köln ITP Program',
        desc: '10-month Bundesliga residency with professional training, housing, and elite development environment.',
        icon: Globe,
        gradient: 'from-red-600/20 via-red-500/10 to-transparent',
        borderColor: 'border-red-500/40',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        accentColor: 'text-red-400',
        stat: '10',
        statLabel: 'Month Program',
        points: [
            'Train with Bundesliga academy coaches',
            'Live in Cologne, Germany',
            'Daily high-performance training',
            'European football immersion'
        ],
        url: 'https://warubi-sports.com/itp'
    },
    {
        id: 'college',
        title: 'US College Pathway',
        subtitle: 'NCAA • NAIA • NJCAA',
        desc: 'Combine elite athletics with a degree. Full scholarship negotiation and roster placement support.',
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
            'Scholarship negotiation',
            'Academic support included'
        ],
        url: 'https://warubi-sports.com/college'
    },
    {
        id: 'events',
        title: 'Exposure Events',
        subtitle: 'Showcases & ID Days',
        desc: 'Get seen by college coaches and pro scouts at our professionally organized recruitment events.',
        icon: Calendar,
        gradient: 'from-orange-600/20 via-orange-500/10 to-transparent',
        borderColor: 'border-orange-500/40',
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-400',
        accentColor: 'text-orange-400',
        stat: '50+',
        statLabel: 'Promising Athletes',
        points: [
            'Pro video highlights',
            'Direct coach meetings',
            'Performance analytics',
            'Instant feedback'
        ],
        url: 'https://warubi-sports.com/events'
    },
    {
        id: 'coaching',
        title: 'Coaching Education',
        subtitle: 'UEFA & DFB Licenses',
        desc: 'Launch your coaching career with internationally recognized certifications and mentorship.',
        icon: BookOpen,
        gradient: 'from-emerald-600/20 via-emerald-500/10 to-transparent',
        borderColor: 'border-emerald-500/40',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        accentColor: 'text-emerald-400',
        stat: 'UEFA',
        statLabel: 'Certified Program',
        points: [
            'International certifications',
            'Player-to-coach transition',
            'Industry network access',
            'Job placement support'
        ],
        url: 'https://warubi-sports.com/coaching'
    }
];

export const PathwaysTab: React.FC = () => {
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

            {/* Bottom CTA */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-700 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={18} className="text-scout-accent" />
                    <span className="text-white font-bold">Not sure which pathway fits?</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">Our team can help match players to the right opportunity based on their profile.</p>
                <a
                    href="mailto:scouts@warubi-sports.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-scout-accent text-scout-900 text-sm font-bold hover:bg-scout-accent/90 transition-all"
                >
                    Contact Placement Team
                    <ArrowRight size={14} />
                </a>
            </div>
        </div>
    );
};

export default PathwaysTab;
