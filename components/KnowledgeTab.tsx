import React, { useState } from 'react';
import { ITP_REFERENCE_PLAYERS, WARUBI_PATHWAYS, WARUBI_TOOLS } from '../constants';
import { askScoutAI } from '../services/geminiService';
import { 
    MessageSquare, Send, BookOpen, Loader2, Map, Users, BarChart3, ChevronRight, 
    ShieldAlert, CheckCircle2, Search, PlayCircle, Lightbulb, Zap, GraduationCap, 
    Sparkles, User, Globe, Calendar, ArrowRight, Calculator, Copy, CheckCircle, 
    Link, DollarSign, TrendingUp, HelpCircle, X, Award, Ruler, Activity, Scale, 
    Anchor, HeartHandshake, AlertTriangle, ShieldCheck, ExternalLink, Lock, Footprints, Info,
    Timer, Dumbbell, Target, Trophy, Bot
} from 'lucide-react';
import { UserProfile, PathwayDef, Player } from '../types';

interface KnowledgeTabProps {
    user?: UserProfile;
}

// HARDCODED MEASURABLE BENCHMARKS FOR THE UI
const TIER_BENCHMARKS: Record<string, any> = {
    'Tier 1': {
        leagues: ['MLS Next', 'ECNL (National Playoffs)', 'Intl. Pro Academy'],
        awards: ['Youth National Team', 'All-American', 'Regional Selection'],
        physical: 'Top 1% Speed/Agility. Pro-ready frame.',
        technical: 'Flawless first touch under high pressure. Two-footed.',
        gpa: '3.0+ (Required for Ivies/Stanford)',
        video: 'Must have full match footage against high-level opposition.'
    },
    'Tier 2': {
        leagues: ['ECNL', 'GA', 'High Level Varsity (State Champs)', 'NPL'],
        awards: ['All-State', 'All-Conference', 'Team Captain'],
        physical: 'Above average fitness. Can play 90mins at high tempo.',
        technical: 'Strong basics. Can execute tactic specific roles consistently.',
        gpa: '3.0+ (Opens up academic scholarship money)',
        video: 'Highlight reel + 1 full match.'
    },
    'Tier 3': {
        leagues: ['Regional Leagues', 'HS Varsity', 'Local Club'],
        awards: ['All-District', 'Local Club Awards'],
        physical: 'Average to Good. May need Strength & Conditioning program.',
        technical: 'Good moments, but inconsistent under pressure.',
        gpa: '2.5+ (Eligibility minimum)',
        video: 'Highlight reel is mandatory to get noticed.'
    }
};

// --- FORMATTED MESSAGE RENDERER ---
const FormattedMessage = ({ text }: { text: string }) => {
    // Split by new lines to handle paragraphs and lists
    const lines = text.split('\n');
    
    return (
        <div className="space-y-2">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1"></div>; // Spacer for empty lines

                // Check for list item (bullet points)
                const isList = trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('* ');
                const content = isList ? trimmed.replace(/^[-•*]\s?/, '') : trimmed;

                // Parse bold text: **text**
                const parts = content.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <span key={j} className="font-bold text-white">{part.slice(2, -2)}</span>;
                    }
                    return part;
                });

                if (isList) {
                    return (
                        <div key={i} className="flex gap-2 ml-1">
                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-scout-accent shrink-0"></div>
                            <div className="text-gray-300 text-sm leading-relaxed">{parts}</div>
                        </div>
                    );
                }

                return <p key={i} className="text-gray-300 text-sm leading-relaxed">{parts}</p>;
            })}
        </div>
    );
};

const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ user }) => {
    // Navigation State
    const [view, setView] = useState<'HOME' | 'PATHWAY_DETAIL' | 'TOOL' | 'REF_DETAIL' | 'MODEL'>('HOME');
    const [selectedPathway, setSelectedPathway] = useState<PathwayDef | null>(null);
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
    const [selectedRefPlayer, setSelectedRefPlayer] = useState<Player | null>(null);

    // AI Chat State
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiChatHistory, setAiChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    // Tool State (ROI Calculator)
    const [roiData, setRoiData] = useState({
        mode: 'custom' as 'custom' | 'averages',
        pathA: {
            tuition: 45000,
            scholarship: 15000,
            years: 4
        },
        pathB: {
            itpCost: 44000,
            itpScholarship: 0,
            postTuition: 45000,
            postScholarship: 25000, // Assumption: Better player = better offer
            postYears: 3 // Assumption: Credits earned
        }
    });
    const [toolCopied, setToolCopied] = useState(false);

    // --- AI HANDLER ---
    const handleAskAI = async (e: React.FormEvent, overrideQuestion?: string) => {
        if (e) e.preventDefault();
        const q = overrideQuestion || aiQuestion;
        if (!q.trim()) return;
        
        const newMsg = { role: 'user' as const, text: q };
        setAiChatHistory(prev => [...prev, newMsg]);
        setAiQuestion('');
        setAiLoading(true);

        try {
            // Context injection based on view
            let contextContext = "";
            if (view === 'REF_DETAIL' && selectedRefPlayer) {
                contextContext = `User is viewing Reference Player: ${selectedRefPlayer.name} (${selectedRefPlayer.evaluation?.scholarshipTier}). Strengths: ${selectedRefPlayer.evaluation?.strengths.join(', ')}.`;
            } else if (view === 'PATHWAY_DETAIL' && selectedPathway) {
                contextContext = `User is viewing Pathway: ${selectedPathway.title}.`;
            } else if (view === 'MODEL') {
                contextContext = `User is viewing "The Warubi Model" manifesto. Key points: No pay-to-play, scouts own relationships, Europe+USA synergy.`;
            } else if (view === 'TOOL' && selectedToolId === 'roi_calc') {
                contextContext = `User is using ROI Calculator. Path A Cost: ${(roiData.pathA.tuition - roiData.pathA.scholarship) * roiData.pathA.years}. Path B Cost: ${(roiData.pathB.itpCost - roiData.pathB.itpScholarship) + ((roiData.pathB.postTuition - roiData.pathB.postScholarship) * roiData.pathB.postYears)}.`;
            }
            
            const historyText = aiChatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
            const fullPrompt = `${q}\n\n[Current UI Context: ${contextContext}]\n\nChat History:\n${historyText}`;
            
            const res = await askScoutAI(fullPrompt);
            setAiChatHistory(prev => [...prev, { role: 'ai', text: res }]);
        } catch (e) {
            setAiChatHistory(prev => [...prev, { role: 'ai', text: 'Network error. Try again.' }]);
        } finally {
            setAiLoading(false);
        }
    };

    // --- HELPER COMPONENTS ---

    // 1. PATHWAY CARD
    const PathwayCard: React.FC<{ pathway: PathwayDef }> = ({ pathway }) => {
        const Icon = getIcon(pathway.icon);
        return (
            <div 
                onClick={() => { setSelectedPathway(pathway); setView('PATHWAY_DETAIL'); }}
                className={`bg-scout-800 rounded-xl p-6 border transition-all cursor-pointer group hover:shadow-xl relative overflow-hidden flex flex-col h-full ${pathway.color}`}
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-scout-900 rounded-lg group-hover:scale-110 transition-transform">
                        <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight">{pathway.title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4 flex-1">{pathway.shortDesc}</p>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white opacity-70 group-hover:opacity-100 transition-opacity">
                    View Strategy <ArrowRight size={12} />
                </div>
            </div>
        );
    };

    // 2. TOOL CARD
    const ToolCard: React.FC<{ tool: any }> = ({ tool }) => (
        <div className="bg-scout-900/50 border border-scout-700 rounded-lg p-4 hover:border-scout-accent transition-colors flex flex-col justify-between">
            <div className="mb-3">
                <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-white text-sm">{tool.title}</h4>
                    {tool.type === 'CALCULATOR' ? <Calculator size={14} className="text-scout-highlight"/> : <Link size={14} className="text-blue-400"/>}
                </div>
                <p className="text-xs text-gray-400">{tool.desc}</p>
            </div>
            <button 
                onClick={() => { setSelectedToolId(tool.id); setView('TOOL'); }}
                className="w-full py-2 bg-scout-800 hover:bg-scout-700 text-white text-xs font-bold rounded border border-scout-600 transition-colors"
            >
                {tool.actionLabel}
            </button>
        </div>
    );

    // 3. THE WARUBI MODEL VIEW
    const WarubiModelView = () => (
        <div className="animate-fade-in space-y-12 pb-12 max-w-5xl mx-auto">
            <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                <X size={16} /> Back to Hub
            </button>

            {/* --- CORE IDEA --- */}
            <section className="text-center space-y-6">
                <div className="inline-flex items-center justify-center p-4 bg-scout-accent/10 rounded-full text-scout-accent border border-scout-accent/20 mb-2">
                    <Anchor size={40} />
                </div>
                <h2 className="text-4xl font-black text-white">The Warubi Model</h2>
                <div className="max-w-2xl mx-auto space-y-4">
                    <p className="text-xl text-gray-200 font-medium">
                        We combine two systems that normally get separated: <br/>
                        <span className="text-scout-accent">European high-level football</span> and <span className="text-blue-400">American football plus education</span>.
                    </p>
                    <div className="bg-scout-800 p-4 rounded-lg border-l-4 border-scout-highlight text-left text-gray-300 text-sm">
                        <strong>Why this matters:</strong> Forcing players or scouts into one all-or-nothing path destroys talent, trust, and careers. We build options, not dead ends.
                    </div>
                </div>
            </section>

            {/* --- PROBLEMS vs FIX --- */}
            <section className="grid md:grid-cols-2 gap-8">
                {/* Problems for Players */}
                <div className="bg-scout-800/50 border border-red-500/30 rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 text-red-400">
                        <ShieldAlert size={24} />
                        <h3 className="text-xl font-bold text-white">Problems for Players</h3>
                    </div>
                    <ul className="space-y-3 mb-6">
                        {[
                            "Pay-to-play disguised as opportunity",
                            "Fees charged before results exist",
                            "International academies built to make money, not careers",
                            "Europe-only pro thinking that cuts late developers",
                            "No education backup if pro football fails",
                            "No tracking of what happens after players drop out"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <X size={14} className="text-red-500 mt-1 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="bg-red-500/10 p-3 rounded border border-red-500/20 text-xs text-red-200">
                        <strong>Result:</strong> Good players disappear. Families lose trust. Talent is wasted.
                    </div>
                </div>

                {/* Problems for Scouts */}
                <div className="bg-scout-800/50 border border-orange-500/30 rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 text-orange-400">
                        <AlertTriangle size={24} />
                        <h3 className="text-xl font-bold text-white">Problems for Scouts</h3>
                    </div>
                    <ul className="space-y-3 mb-6">
                        {[
                            "You do not own your relationships",
                            "Your income is capped no matter how good you are",
                            "Your work is not tracked properly",
                            "You have responsibility but no control",
                            "You are replaceable"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <X size={14} className="text-orange-500 mt-1 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="bg-orange-500/10 p-3 rounded border border-orange-500/20 text-xs text-orange-200">
                        <strong>Result:</strong> Scouts limit their own future inside bad systems.
                    </div>
                </div>
            </section>

            {/* --- THE WARUBI GUARANTEE --- */}
            <section className="bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-accent/50 rounded-xl p-8 text-center shadow-lg shadow-scout-accent/10">
                <div className="flex justify-center mb-4">
                    <ShieldCheck size={48} className="text-scout-accent" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-wide">WARUBI is not pay-to-play</h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-300 max-w-4xl mx-auto">
                    <div className="flex flex-col items-center gap-2">
                        <CheckCircle size={20} className="text-scout-accent" />
                        <p>Players are selected and placed based on performance only.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <CheckCircle size={20} className="text-scout-accent" />
                        <p>A fee is charged only after successful placement.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <CheckCircle size={20} className="text-scout-accent" />
                        <p>No player can pay to gain selection, visibility, or access.</p>
                    </div>
                </div>
            </section>

            {/* --- DEVELOPMENT COSTS CLARIFICATION --- */}
            <section className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-blue-500/20 p-4 rounded-full text-blue-400 shrink-0">
                    <HelpCircle size={32} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Why some programs still cost money</h3>
                    <p className="text-sm text-gray-300 mb-4">
                        Some programs (like ITP) cost money because they include real, tangible costs. 
                        These are <strong>development costs</strong>, not placement fees.
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Housing and daily support</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Coaching staff and facilities</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Competitive environments</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Documented development & tracking</li>
                    </ul>
                    <a href="https://warubi-sports.com/fc-cologne-soccer-academy-faq" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-white transition-colors">
                        Read ITP FAQ <ExternalLink size={12} />
                    </a>
                </div>
            </section>

            {/* --- SYNERGY: EUROPE & USA --- */}
            <section className="space-y-6">
                <h3 className="text-2xl font-bold text-white text-center">Europe and USA - Used Together</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-scout-800 p-6 rounded-xl border-l-4 border-scout-accent">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2"><Globe size={18}/> From Europe, we use:</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li>• Daily football environments</li>
                            <li>• Clear performance standards</li>
                            <li>• Accountability</li>
                            <li>• Real competition</li>
                        </ul>
                    </div>
                    <div className="bg-scout-800 p-6 rounded-xl border-l-4 border-blue-500">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2"><GraduationCap size={18}/> From the USA, we use:</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li>• Football plus education</li>
                            <li>• Multiple entry and exit points</li>
                            <li>• Long-term development</li>
                            <li>• A real backup if pro level is missed</li>
                        </ul>
                    </div>
                </div>
                <div className="text-center text-sm text-gray-400 italic max-w-2xl mx-auto">
                    "Players are not forced to choose too early. They can push for pro football, combine it with education, or change direction without being punished. This keeps players in the system longer."
                </div>
            </section>

            {/* --- HOW WARUBI WORKS (Mechanism) --- */}
            <section>
                <h3 className="text-2xl font-bold text-white mb-6 text-center">How Warubi Works (Simple Terms)</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: "Scouts are owners", desc: "You own relationships. Warubi provides tools, rules, and protection.", icon: <User size={20}/> },
                        { title: "Results first", desc: "No upfront placement fees. No results, no payment.", icon: <Award size={20}/> },
                        { title: "No pay-to-play", desc: "Players are represented, not sold without a clear pathway.", icon: <ShieldCheck size={20}/> },
                        { title: "Performance rewards", desc: "Clear commissions. Long-term builders earn more access.", icon: <TrendingUp size={20}/> },
                        { title: "Proof > Talk", desc: "Real clubs, licenses, teams, and programs create real evaluation.", icon: <CheckCircle2 size={20}/> },
                        { title: "Think win-win at all times", desc: "Every agreement must benefit all sides. If it only works for one party, it does not happen.", icon: <Scale size={20}/> },
                        { title: "Reputation unlocks access", desc: "Good work leads to better players and partners automatically.", icon: <Lock size={20}/> },
                        { title: "System + Local", desc: "Warubi builds the system, scouts run locally.", icon: <Map size={20}/> },
                    ].map((item, i) => (
                        <div key={i} className="bg-scout-900 border border-scout-700 p-4 rounded-lg hover:border-scout-600 transition-colors">
                            <div className="text-scout-accent mb-2">{item.icon}</div>
                            <h4 className="font-bold text-white text-sm mb-1">{item.title}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- SCOUT MANIFESTO & CTA --- */}
            <section className="bg-scout-800 rounded-xl p-8 border border-scout-700 text-center space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">What This Means For Scouts</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                        {['No false promises', 'Protect your reputation', 'Build real ownership', 'Reward for results', 'Career compounds'].map((tag, i) => (
                            <span key={i} className="px-3 py-1 bg-scout-700 rounded-full text-xs text-gray-200 border border-scout-600">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <p className="mt-4 text-scout-accent font-bold tracking-widest uppercase text-sm">This is a career platform.</p>
                </div>

                <div className="border-t border-scout-700 pt-8">
                    <h3 className="text-lg font-bold text-white mb-2">Help Us Build The Future</h3>
                    <p className="text-sm text-gray-400 mb-6 max-w-lg mx-auto">
                        We want to continue to improve our service and promote the beautiful game. 
                        If you see an undiscovered opportunity, a missing safeguard, or a better structure—tell us.
                    </p>
                    <button 
                        onClick={() => window.open('mailto:feedback@warubi-sports.com?subject=Improvement Idea')}
                        className="bg-white hover:bg-gray-100 text-scout-900 font-bold py-3 px-8 rounded-lg inline-flex items-center gap-2 shadow-lg transition-all"
                    >
                        <HeartHandshake size={18} /> Submit Improvement Idea
                    </button>
                    <p className="text-xs text-gray-500 mt-4">If it strengthens trust and opportunities for the network, it will be built.</p>
                </div>
            </section>
        </div>
    );

    // 4. ROI CALCULATOR (Interactive Tool)
    const ROICalculator = () => {
        // ... (existing code) ...
        const setMode = (mode: 'custom' | 'averages') => {
            if (mode === 'averages') {
                setRoiData({
                    mode: 'averages',
                    pathA: { tuition: 40000, scholarship: 10000, years: 4 },
                    pathB: { itpCost: 44000, itpScholarship: 0, postTuition: 40000, postScholarship: 20000, postYears: 3 }
                });
            } else {
                setRoiData(prev => ({ ...prev, mode: 'custom' }));
            }
        };

        const updateData = (path: 'pathA' | 'pathB', field: string, value: number) => {
            setRoiData(prev => ({
                ...prev,
                mode: 'custom',
                [path]: { ...prev[path], [field]: value }
            }));
        };

        const costA = (roiData.pathA.tuition - roiData.pathA.scholarship) * roiData.pathA.years;
        const costB = (roiData.pathB.itpCost - roiData.pathB.itpScholarship) + 
                      ((roiData.pathB.postTuition - roiData.pathB.postScholarship) * roiData.pathB.postYears);
        
        const difference = costA - costB;

        return (
            <div className="max-w-4xl mx-auto bg-scout-800 rounded-xl border border-scout-700 p-6 animate-fade-in shadow-2xl">
                <div className="flex justify-between items-start border-b border-scout-700 pb-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Calculator className="text-scout-highlight" /> Cost & ROI Calculator
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Compare: <span className="text-red-400 font-medium">Path A (Direct to College)</span> vs. <span className="text-green-400 font-medium">Path B (ITP Development Year)</span></p>
                    </div>
                    <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white p-2 hover:bg-scout-700 rounded"><X size={24}/></button>
                </div>

                {/* Controls */}
                <div className="flex justify-center mb-8">
                    <div className="bg-scout-900 p-1 rounded-lg border border-scout-700 flex">
                        <button 
                            onClick={() => setMode('custom')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${roiData.mode === 'custom' ? 'bg-scout-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Enter My Numbers
                        </button>
                        <button 
                            onClick={() => setMode('averages')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${roiData.mode === 'averages' ? 'bg-scout-accent text-scout-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Sparkles size={14} /> Use Warubi Averages
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 relative">
                    {/* Path A Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4 text-red-400 border-b border-red-500/20 pb-2">
                            <Users size={20} />
                            <h3 className="font-bold text-lg">Path A: Direct to US College</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Annual Cost (Tuition + Living)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        value={roiData.pathA.tuition}
                                        onChange={e => updateData('pathA', 'tuition', Number(e.target.value))}
                                        className="w-full bg-scout-900 border border-scout-600 rounded p-2 pl-7 text-white focus:border-red-400 outline-none"
                                    />
                                </div>
                                <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                                    <span>Avg: NCAA ($40k)</span> • <span>NAIA ($30k)</span> • <span>JUCO ($20k)</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Annual Scholarship Offer</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        value={roiData.pathA.scholarship}
                                        onChange={e => updateData('pathA', 'scholarship', Number(e.target.value))}
                                        className="w-full bg-scout-900 border border-scout-600 rounded p-2 pl-7 text-white focus:border-red-400 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Years to Graduate</label>
                                <input 
                                    type="number" 
                                    value={roiData.pathA.years}
                                    onChange={e => updateData('pathA', 'years', Number(e.target.value))}
                                    className="w-full bg-scout-900 border border-scout-600 rounded p-2 text-white focus:border-red-400 outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mt-6 text-center">
                            <p className="text-xs font-bold text-red-300 uppercase mb-1">Total 4-Year Cost</p>
                            <p className="text-3xl font-black text-white">${costA.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* VS Badge */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-scout-800 border border-scout-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-500 z-10 shadow-lg">VS</div>

                    {/* Path B Column */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4 text-green-400 border-b border-green-500/20 pb-2">
                            <Globe size={20} />
                            <h3 className="font-bold text-lg">Path B: ITP Gap Year + College</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-scout-900/50 p-3 rounded border border-scout-700">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ITP Cost</label>
                                        <input 
                                            type="number" 
                                            value={roiData.pathB.itpCost}
                                            onChange={e => updateData('pathB', 'itpCost', Number(e.target.value))}
                                            className="w-full bg-scout-800 border border-scout-600 rounded px-2 py-1 text-sm text-white focus:border-green-400 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ITP Scholarship</label>
                                        <input 
                                            type="number" 
                                            value={roiData.pathB.itpScholarship}
                                            onChange={e => updateData('pathB', 'itpScholarship', Number(e.target.value))}
                                            className="w-full bg-scout-800 border border-scout-600 rounded px-2 py-1 text-sm text-white focus:border-green-400 outline-none"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                    <Info size={10}/> Includes housing, food, coaching, matches.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Post-ITP Annual Cost</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        value={roiData.pathB.postTuition}
                                        onChange={e => updateData('pathB', 'postTuition', Number(e.target.value))}
                                        className="w-full bg-scout-900 border border-scout-600 rounded p-2 pl-7 text-white focus:border-green-400 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Post-ITP Scholarship</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                    <input 
                                        type="number" 
                                        value={roiData.pathB.postScholarship}
                                        onChange={e => updateData('pathB', 'postScholarship', Number(e.target.value))}
                                        className="w-full bg-scout-900 border border-scout-600 rounded p-2 pl-7 text-white focus:border-green-400 outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-green-400/70 mt-1">
                                    *Better development often leads to higher offers.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Years Remaining</label>
                                <input 
                                    type="number" 
                                    value={roiData.pathB.postYears}
                                    onChange={e => updateData('pathB', 'postYears', Number(e.target.value))}
                                    className="w-full bg-scout-900 border border-scout-600 rounded p-2 text-white focus:border-green-400 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Reduced via credits earned during ITP.</p>
                            </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl mt-6 text-center">
                            <p className="text-xs font-bold text-green-300 uppercase mb-1">Total Path B Cost</p>
                            <p className="text-3xl font-black text-white">${costB.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-scout-700">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-400 max-w-sm">
                            <p><strong>Disclaimer:</strong> This calculator compares financial scenarios only. It does not guarantee scholarship offers or placement outcomes.</p>
                        </div>
                        
                        <div className={`px-6 py-4 rounded-xl border-2 flex items-center gap-4 ${difference > 0 ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-scout-900 border-gray-600 text-gray-400'}`}>
                            <span className="text-sm font-bold uppercase">Difference</span>
                            <span className="text-3xl font-black">
                                {difference > 0 ? '+' : ''}${difference.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    
                    {difference > 0 && (
                        <p className="text-center text-green-400 font-medium mt-4 animate-pulse">
                            "You save money while gaining a year of European development."
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // 4. LINK GENERATOR (Simple Tool View)
    const LinkGenerator = ({ toolId }: { toolId: string }) => {
        // ... (existing code) ...
        const tool = WARUBI_TOOLS.find(t => t.id === toolId);
        if (!tool) return null;

        const dummyLink = `https://warubi-sports.com/tools/${toolId}?ref=${user?.scoutId || 'demo'}`;

        return (
             <div className="max-w-lg mx-auto bg-scout-800 rounded-xl border border-scout-700 p-8 text-center animate-fade-in">
                 <div className="w-16 h-16 bg-scout-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-scout-700">
                     <Link size={32} className="text-blue-400"/>
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2">{tool.title}</h2>
                 <p className="text-gray-400 text-sm mb-6">{tool.desc}</p>
                 
                 <div className="bg-scout-900 p-3 rounded border border-scout-700 flex items-center gap-2 mb-6">
                     <span className="text-xs text-gray-500 font-mono truncate flex-1">{dummyLink}</span>
                 </div>

                 <div className="flex gap-3">
                     <button onClick={() => setView('HOME')} className="flex-1 py-3 border border-scout-600 rounded text-gray-300 hover:text-white">Back</button>
                     <button 
                        onClick={() => {
                            navigator.clipboard.writeText(dummyLink);
                            setToolCopied(true);
                            setTimeout(() => setToolCopied(false), 2000);
                        }}
                        className="flex-[2] bg-scout-accent hover:bg-emerald-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
                     >
                        {toolCopied ? <CheckCircle size={18}/> : <Copy size={18}/>} Copy Lead Link
                     </button>
                 </div>
                 <p className="text-[10px] text-gray-500 mt-4">
                     <Zap size={10} className="inline mr-1 text-scout-highlight"/>
                     When a player uses this link, they are automatically added to your dashboard as a Lead.
                 </p>
             </div>
        );
    }

    // --- MAIN RENDER ---
    const IconMap: any = { Globe, GraduationCap, Calendar, BookOpen };
    const getIcon = (name: string) => IconMap[name] || Globe;

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in relative">
            
            {/* LEFT SIDE: Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                {/* ... (Existing Views: HOME, PATHWAY_DETAIL, REF_DETAIL, MODEL, TOOL) ... */}
                {view === 'HOME' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Header */}
                        <div>
                            <h2 className="text-2xl font-bold text-white">Warubi Knowledge Center</h2>
                            <p className="text-gray-400">Master the 4 pathways and use free tools to generate leads.</p>
                        </div>

                         {/* HERO CARD: THE WARUBI MODEL */}
                         <div 
                            onClick={() => setView('MODEL')}
                            className="bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-600 rounded-xl p-6 relative overflow-hidden cursor-pointer group hover:border-scout-accent transition-all shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-scout-accent/10 rounded-full blur-3xl group-hover:bg-scout-accent/20 transition-colors"></div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex w-16 h-16 bg-scout-900 rounded-full border border-scout-700 items-center justify-center text-scout-accent shadow-lg group-hover:scale-110 transition-transform">
                                    <Anchor size={32} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                         <span className="text-[10px] font-bold uppercase tracking-wider bg-scout-accent text-scout-900 px-2 py-0.5 rounded">Core DNA</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">The Warubi Model</h3>
                                    <p className="text-gray-300 text-sm max-w-xl">
                                        We fix the broken industry by combining European football with American education. Learn why we are not pay-to-play and how you own your network.
                                    </p>
                                </div>
                                <div className="bg-scout-900 p-3 rounded-full border border-scout-700 group-hover:bg-scout-accent group-hover:text-scout-900 transition-colors">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 1: PATHWAYS */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Map size={16} /> Flagship Pathways
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {WARUBI_PATHWAYS.map(p => <PathwayCard key={p.id} pathway={p} />)}
                            </div>
                        </div>

                        {/* SECTION: 4 STEPS RECRUITING GUIDE */}
                        <div className="bg-scout-900 border border-scout-700 rounded-xl p-6 relative overflow-hidden group hover:border-scout-600 transition-colors">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-scout-accent/10 rounded-lg text-scout-accent">
                                    <Footprints size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-white">The Scouting Process</h3>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 relative">
                                {/* Connecting Line */}
                                <div className="absolute top-[20px] left-0 w-full h-0.5 bg-scout-700 hidden md:block -z-10"></div>

                                {[
                                    { step: 1, title: 'Identify', desc: 'Find talent at events or online.', icon: Search },
                                    { step: 2, title: 'Evaluate', desc: 'Use AI tools to tier the player.', icon: BarChart3 },
                                    { step: 3, title: 'Connect', desc: 'Send outreach & build trust.', icon: MessageSquare },
                                    { step: 4, title: 'Place', desc: 'Secure the contract or scholarship.', icon: CheckCircle2 }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center text-center">
                                        <div className="w-10 h-10 rounded-full bg-scout-800 border-2 border-scout-600 flex items-center justify-center text-gray-400 mb-3 z-10 group-hover:border-scout-accent transition-colors shadow-lg">
                                            <item.icon size={18} />
                                        </div>
                                        <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                                        <p className="text-[10px] text-gray-400 max-w-[120px] hidden md:block leading-tight">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* SECTION 2: TOOLBOX */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Zap size={16} className="text-scout-highlight" /> Lead Gen Toolbox
                            </h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                {WARUBI_TOOLS.map(t => <ToolCard key={t.id} tool={t} />)}
                            </div>
                        </div>

                         {/* SECTION 3: QUICK CALIBRATION */}
                        <div className="bg-scout-800 rounded-xl p-6 border border-scout-700">
                             <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <BarChart3 size={20} className="text-blue-400"/> Quick Calibration
                             </h3>
                             <p className="text-sm text-gray-400 mb-4">Unsure where a player fits? Click a standard below to see the requirements.</p>
                             <div className="flex gap-4 overflow-x-auto pb-2">
                                 {ITP_REFERENCE_PLAYERS.map(p => (
                                     <button 
                                        key={p.id} 
                                        onClick={() => { setSelectedRefPlayer(p); setView('REF_DETAIL'); }}
                                        className="min-w-[200px] bg-scout-900 hover:bg-scout-700 transition-colors rounded-lg p-3 border border-scout-700 flex items-center gap-3 text-left group"
                                     >
                                         <div className="w-10 h-10 rounded-full bg-scout-800 flex items-center justify-center font-bold text-white border border-scout-600 group-hover:border-scout-accent">{p.name.charAt(0)}</div>
                                         <div>
                                             <div className="text-sm font-bold text-white group-hover:text-scout-accent truncate max-w-[140px]">{p.name}</div>
                                             <div className="text-[10px] text-gray-400">{p.evaluation?.scholarshipTier}</div>
                                         </div>
                                     </button>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}

                {view === 'PATHWAY_DETAIL' && selectedPathway && (
                    <div className="animate-fade-in space-y-6">
                         <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-2">
                            <X size={16} /> Back to Hub
                        </button>

                        {/* Hero Banner */}
                        <div className={`p-8 rounded-xl border ${selectedPathway.color} relative overflow-hidden`}>
                             <h2 className="text-3xl font-bold text-white mb-2">{selectedPathway.title}</h2>
                             <p className="text-white/80 max-w-xl text-lg">{selectedPathway.shortDesc}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Profile Fit */}
                            <div className="bg-scout-800 rounded-xl p-6 border border-scout-700">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-400"/> Ideal Profile</h3>
                                <ul className="space-y-2">
                                    {selectedPathway.idealProfile.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                             {/* Red Flags */}
                             <div className="bg-scout-800 rounded-xl p-6 border border-scout-700">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><ShieldAlert size={18} className="text-red-400"/> Red Flags</h3>
                                <ul className="space-y-2">
                                    {selectedPathway.redFlags.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                         {/* Pitch Script */}
                         <div className="bg-scout-900 rounded-xl p-6 border border-scout-700">
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><MessageSquare size={18} className="text-blue-400"/> The "Elevator Pitch"</h3>
                            <div className="bg-scout-800 p-4 rounded-lg border-l-4 border-scout-accent italic text-gray-300">
                                {selectedPathway.scriptSnippet}
                            </div>
                            <button 
                                onClick={() => navigator.clipboard.writeText(selectedPathway.scriptSnippet)}
                                className="mt-3 text-xs text-scout-accent hover:text-white flex items-center gap-1"
                            >
                                <Copy size={12} /> Copy Script
                            </button>
                        </div>
                    </div>
                )}

                {/* --- REFERENCE DETAIL VIEW (REDESIGNED) --- */}
                {view === 'REF_DETAIL' && selectedRefPlayer && (
                    <div className="animate-fade-in space-y-6">
                         <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-2">
                            <X size={16} /> Back to Hub
                        </button>

                        {/* Top Summary Card */}
                        <div className="bg-gradient-to-br from-scout-800 to-scout-900 border border-scout-600 rounded-xl p-8 relative overflow-hidden shadow-2xl">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-scout-accent/10 rounded-full blur-3xl -z-10"></div>
                             
                             <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                     <div className="w-20 h-20 rounded-full bg-scout-800 border-4 border-scout-700 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                                         {selectedRefPlayer.name.charAt(0)}
                                     </div>
                                     <div>
                                         <span className="text-scout-accent font-bold text-sm uppercase tracking-wider mb-1 block">The Benchmark</span>
                                         <h2 className="text-3xl font-black text-white leading-tight">{selectedRefPlayer.name}</h2>
                                         <p className="text-gray-400">{selectedRefPlayer.evaluation?.collegeLevel}</p>
                                     </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-white mb-1">{selectedRefPlayer.evaluation?.score}</div>
                                    <div className="bg-scout-accent text-scout-900 px-2 py-0.5 rounded text-xs font-bold uppercase inline-block">
                                        {selectedRefPlayer.evaluation?.scholarshipTier}
                                    </div>
                                </div>
                             </div>
                             
                             <p className="text-gray-300 text-sm leading-relaxed mb-4 max-w-2xl bg-scout-900/50 p-4 rounded-lg border border-scout-700/50 italic">
                                 "{selectedRefPlayer.evaluation?.summary}"
                             </p>
                        </div>

                        {/* Measurable Criteria Grid */}
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Ruler size={20} className="text-scout-highlight" /> Measurable Benchmarks
                        </h3>
                        
                        {selectedRefPlayer.evaluation?.scholarshipTier && TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier] ? (
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Competition Level */}
                                <div className="bg-scout-800 p-6 rounded-xl border border-scout-700">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <Trophy size={16} className="text-yellow-400"/> Competition Level
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Required Leagues</p>
                                            <ul className="space-y-1">
                                                {TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier].leagues.map((l: string, i: number) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                                        <CheckCircle size={12} className="text-green-500" /> {l}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Expected Awards/Honors</p>
                                            <p className="text-sm text-gray-300">{TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier].awards.join(', ')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Physical & Technical */}
                                <div className="space-y-4">
                                    <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <Dumbbell size={16} className="text-blue-400"/> Physical Standard
                                        </h4>
                                        <p className="text-sm text-gray-300">
                                            {TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier].physical}
                                        </p>
                                    </div>
                                    <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <Target size={16} className="text-red-400"/> Technical Standard
                                        </h4>
                                        <p className="text-sm text-gray-300">
                                            {TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier].technical}
                                        </p>
                                    </div>
                                </div>

                                {/* Academics & Video */}
                                <div className="bg-scout-800 p-6 rounded-xl border border-scout-700 md:col-span-2 grid md:grid-cols-2 gap-6">
                                     <div>
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <GraduationCap size={16} className="text-purple-400"/> Academic Minimum
                                        </h4>
                                        <p className="text-sm text-gray-300">
                                            {TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier].gpa}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <Timer size={16} className="text-orange-400"/> Video Requirement
                                        </h4>
                                        <p className="text-sm text-gray-300">
                                            {TIER_BENCHMARKS[selectedRefPlayer.evaluation.scholarshipTier].video}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-10">Select a specific tier to see benchmarks.</div>
                        )}

                        <button 
                            onClick={(e) => handleAskAI(e, `My player is in ${TIER_BENCHMARKS[selectedRefPlayer.evaluation?.scholarshipTier || 'Tier 3'].leagues[0]} but hasn't won any awards. Are they still ${selectedRefPlayer.evaluation?.scholarshipTier}?`)}
                            className="mt-4 w-full bg-scout-700 hover:bg-scout-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all border border-scout-600"
                        >
                            <Sparkles size={18} /> Ask AI: Do they fit this tier?
                        </button>
                    </div>
                )}

                {view === 'MODEL' && <WarubiModelView />}

                {view === 'TOOL' && selectedToolId && (
                     selectedToolId === 'roi_calc' ? <ROICalculator /> : <LinkGenerator toolId={selectedToolId} />
                )}

            </div>

            {/* RIGHT SIDE: SCOUT AI (Always Visible) */}
            <div className="w-1/3 min-w-[300px] flex flex-col bg-scout-800 border border-scout-700 rounded-xl overflow-hidden shadow-xl h-[calc(100vh-140px)] sticky top-0">
                 <div className="p-4 border-b border-scout-700 bg-scout-800">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Sparkles size={16} className="text-scout-accent" /> Ask ScoutAI
                    </h3>
                    <p className="text-xs text-gray-400">Expert on Pathways & Pricing.</p>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-scout-900/30 custom-scrollbar space-y-6">
                     {aiChatHistory.length === 0 && (
                         <div className="text-center py-8 text-gray-500">
                             <Lightbulb size={24} className="mx-auto mb-2 opacity-50"/>
                             <p className="text-sm">Try asking:</p>
                             <button onClick={(e) => handleAskAI(e, "How do I explain the cost of ITP to a parent?")} className="block w-full text-xs bg-scout-800 hover:bg-scout-700 p-2 rounded mt-2 border border-scout-700">"How do I explain ITP cost?"</button>
                             <button onClick={(e) => handleAskAI(e, "What GPA is needed for D1 College?")} className="block w-full text-xs bg-scout-800 hover:bg-scout-700 p-2 rounded mt-2 border border-scout-700">"What GPA for D1?"</button>
                         </div>
                     )}
                     
                     {aiChatHistory.map((msg, i) => (
                         <div key={i} className={`flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                             <div className={`max-w-[90%] p-3 rounded-xl text-sm shadow-sm ${
                                 msg.role === 'user' 
                                 ? 'bg-blue-600 text-white rounded-br-none' 
                                 : 'bg-scout-700/50 text-gray-200 border border-scout-600/50 rounded-bl-none'
                             }`}>
                                 {msg.role === 'ai' ? (
                                     <FormattedMessage text={msg.text} />
                                 ) : (
                                     msg.text
                                 )}
                             </div>
                             <span className="text-[10px] text-gray-600 mt-1 px-1">
                                 {msg.role === 'user' ? 'You' : 'ScoutAI'}
                             </span>
                         </div>
                     ))}
                     {aiLoading && (
                         <div className="flex items-start gap-2 animate-fade-in">
                             <div className="bg-scout-700/50 p-2 rounded-xl rounded-bl-none border border-scout-600/50">
                                <Loader2 className="animate-spin text-scout-accent" size={16} />
                             </div>
                         </div>
                     )}
                </div>

                <div className="p-3 bg-scout-800 border-t border-scout-700">
                    <form onSubmit={handleAskAI} className="relative">
                        <input
                            type="text"
                            placeholder="Ask about pathways..."
                            className="w-full bg-scout-900 text-white text-sm rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-scout-accent border border-scout-600"
                            value={aiQuestion}
                            onChange={(e) => setAiQuestion(e.target.value)}
                        />
                        <button type="submit" disabled={aiLoading || !aiQuestion} className="absolute right-2 top-2 p-1 text-scout-accent hover:text-white">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
};

export default KnowledgeTab;