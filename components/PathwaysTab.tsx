import React from 'react';
import { Globe, GraduationCap, Calendar, BookOpen, ExternalLink } from 'lucide-react';

const PATHWAYS = [
    {
        id: 'europe',
        title: 'Development in Europe',
        desc: 'FC Köln ITP & Pro Trials. 10-month Bundesliga residency.',
        icon: Globe,
        color: 'border-red-500/30 bg-red-500/10',
        iconColor: 'text-red-500',
        points: ['Direct access to Bundesliga Academies', 'Cheaper than US college tuition', 'Test yourself at pro level'],
        url: 'https://warubi-sports.com/eliteplayer-pathways/'
    },
    {
        id: 'college',
        title: 'College Pathway',
        desc: 'NCAA, NAIA, NJCAA. Degree + Football.',
        icon: GraduationCap,
        color: 'border-blue-500/30 bg-blue-500/10',
        iconColor: 'text-blue-400',
        points: ['200+ placements annually', 'Scholarship negotiation', 'Access to hidden roster spots'],
        url: 'https://warubi-sports.com/eliteplayer-pathways/'
    },
    {
        id: 'events',
        title: 'Exposure Events',
        desc: 'Showcases, ID Days, Camps.',
        icon: Calendar,
        color: 'border-orange-500/30 bg-orange-500/10',
        iconColor: 'text-orange-400',
        points: ['Guaranteed scout visibility', 'Professional video included', 'Direct recruit comparison'],
        url: 'https://warubi-sports.com/eliteplayer-pathways/'
    },
    {
        id: 'coaching',
        title: 'Coaching Education',
        desc: 'UEFA & German FA Licenses.',
        icon: BookOpen,
        color: 'border-gray-500/30 bg-gray-500/10',
        iconColor: 'text-gray-300',
        points: ['International certifications', 'Career pathway for players', 'Network access'],
        url: 'https://warubi-sports.com/eliteplayer-pathways/'
    }
];

export const PathwaysTab: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Pathways</h2>
                <p className="text-gray-500 text-sm mt-1">Know these to place players correctly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PATHWAYS.map((pathway) => {
                    const Icon = pathway.icon;
                    return (
                        <div
                            key={pathway.id}
                            className={`p-6 rounded-2xl border ${pathway.color} transition-all hover:scale-[1.02]`}
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pathway.color}`}>
                                    <Icon size={24} className={pathway.iconColor} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">{pathway.title}</h3>
                                    <p className="text-sm text-gray-400">{pathway.desc}</p>
                                </div>
                            </div>

                            <ul className="space-y-2 mb-4">
                                {pathway.points.map((point, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-scout-accent" />
                                        {point}
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={pathway.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-bold text-scout-accent hover:text-white transition-colors"
                            >
                                Learn more <ExternalLink size={12} />
                            </a>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PathwaysTab;
