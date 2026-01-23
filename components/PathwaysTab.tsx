import React from 'react';
import { Globe, GraduationCap, Calendar, BookOpen, ExternalLink, Trophy, Users, Star, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

const PATHWAYS = [
    {
        id: 'europe',
        title: 'Development in Europe',
        subtitle: 'FC Köln ITP Program',
        desc: '10-month Bundesliga residency with professional training, housing, and pathway to pro contracts.',
        icon: Globe,
        gradient: 'from-red-600/20 via-red-500/10 to-transparent',
        borderColor: 'border-red-500/40',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        accentColor: 'text-red-400',
        stat: '€15K',
        statLabel: 'Full Program Cost',
        points: [
            'Train with Bundesliga academy coaches',
            'Live in Cologne, Germany',
            'Pro trial opportunities',
            'UEFA B coaching pathway'
        ],
        badge: 'FLAGSHIP',
        badgeColor: 'bg-red-500/30 text-red-300',
        url: 'https://warubi-sports.com/itp',
        featured: true
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
            'D1, D2, D3 & NAIA connections',
            'Scholarship negotiation',
            'Hidden roster spot access',
            'Academic support included'
        ],
        badge: 'MOST POPULAR',
        badgeColor: 'bg-blue-500/30 text-blue-300',
        url: 'https://warubi-sports.com/college',
        featured: false
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
        statLabel: 'Scouts Per Event',
        points: [
            'Pro video highlights',
            'Direct coach meetings',
            'Performance analytics',
            'Instant feedback'
        ],
        badge: null,
        badgeColor: '',
        url: 'https://warubi-sports.com/events',
        featured: false
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
        badge: 'NEW',
        badgeColor: 'bg-emerald-500/30 text-emerald-300',
        url: 'https://warubi-sports.com/coaching',
        featured: false
    }
];

export const PathwaysTab: React.FC = () => {
    const featured = PATHWAYS.find(p => p.featured);
    const others = PATHWAYS.filter(p => !p.featured);

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

            {/* Featured Pathway - ITP */}
            {featured && (
                <div className={`mb-6 p-6 md:p-8 rounded-3xl border-2 ${featured.borderColor} bg-gradient-to-br ${featured.gradient} relative overflow-hidden group hover:border-opacity-60 transition-all`}>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full blur-3xl" />

                    <div className="relative z-10">
                        {/* Badge */}
                        {featured.badge && (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${featured.badgeColor} mb-4`}>
                                <Star size={10} /> {featured.badge}
                            </span>
                        )}

                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                            {/* Left: Icon + Content */}
                            <div className="flex-1">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-16 h-16 rounded-2xl ${featured.iconBg} flex items-center justify-center shrink-0`}>
                                        <featured.icon size={32} className={featured.iconColor} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-1">{featured.title}</h3>
                                        <p className={`text-sm font-bold ${featured.accentColor}`}>{featured.subtitle}</p>
                                    </div>
                                </div>

                                <p className="text-gray-300 text-sm mb-6 max-w-lg">{featured.desc}</p>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {featured.points.map((point, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                            <CheckCircle2 size={14} className={featured.accentColor} />
                                            {point}
                                        </div>
                                    ))}
                                </div>

                                <a
                                    href={featured.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold hover:bg-red-500/30 transition-all group`}
                                >
                                    Explore ITP Program
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                            </div>

                            {/* Right: Big Stat */}
                            <div className="md:text-right">
                                <div className={`text-5xl md:text-6xl font-black ${featured.accentColor}`}>
                                    {featured.stat}
                                </div>
                                <div className="text-gray-500 text-sm font-medium">{featured.statLabel}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Pathways Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {others.map((pathway) => {
                    const Icon = pathway.icon;
                    return (
                        <div
                            key={pathway.id}
                            className={`p-5 rounded-2xl border ${pathway.borderColor} bg-gradient-to-br ${pathway.gradient} transition-all hover:scale-[1.02] hover:border-opacity-60 group relative overflow-hidden`}
                        >
                            {/* Badge */}
                            {pathway.badge && (
                                <span className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${pathway.badgeColor}`}>
                                    {pathway.badge}
                                </span>
                            )}

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
