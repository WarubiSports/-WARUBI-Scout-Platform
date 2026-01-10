
import React, { useState, useMemo } from 'react';
import { ITP_REFERENCE_PLAYERS, WARUBI_PATHWAYS, WARUBI_TOOLS, WARUBI_PROTOCOLS, MARKET_DATA } from '../constants';
import { askScoutAI } from '../services/geminiService';
import {
    MessageSquare, Send, BookOpen, Loader2, Map, Users, BarChart3, ChevronRight,
    ShieldAlert, CheckCircle2, Search, PlayCircle, Lightbulb, Zap, GraduationCap,
    Sparkles, User, Globe, Calendar, ArrowRight, Calculator, Copy, CheckCircle,
    Check, Link, DollarSign, TrendingUp, HelpCircle, X, Award, Ruler, Activity, Scale,
    Anchor, HeartHandshake, AlertTriangle, ShieldCheck, ExternalLink, Lock, Footprints, Info,
    Timer, Dumbbell, Target, Trophy, Bot, Instagram, Smartphone, Share2, Clipboard, TrendingDown,
    FileText, ActivitySquare, Fingerprint
} from 'lucide-react';
import { UserProfile, PathwayDef, Player, PlayerStatus } from '../types';

interface KnowledgeTabProps {
    user: UserProfile;
}

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

const FormattedMessage = ({ text }: { text: string }) => {
    const lines = text.split('\n');
    return (
        <div className="space-y-2">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1"></div>;
                const isList = trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('* ');
                const content = isList ? trimmed.replace(/^[-•*]\s?/, '') : trimmed;
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
    const [view, setView] = useState<'HOME' | 'PATHWAY_DETAIL' | 'TOOL' | 'REF_DETAIL' | 'MODEL' | 'MASTERCLASS' | 'SHADOW_GUIDE'>('HOME');
    const [selectedPathway, setSelectedPathway] = useState<PathwayDef | null>(null);
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
    const [selectedRefPlayer, setSelectedRefPlayer] = useState<Player | null>(null);

    const [aiQuestion, setAiQuestion] = useState('');
    const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    // Tools State
    const [roiData, setRoiData] = useState({
        mode: 'custom' as 'custom' | 'averages',
        isScreenshotMode: false,
        pathA: { tuition: 45000, scholarship: 15000, years: 4 },
        pathB: { itpCost: 44000, itpScholarship: 0, postTuition: 45000, postScholarship: 25000, postYears: 3 }
    });

    const [evalHook, setEvalHook] = useState<'pro' | 'ncaa' | 'roi'>('pro');
    const [toolCopied, setToolCopied] = useState(false);

    const costA = (roiData.pathA.tuition - roiData.pathA.scholarship) * roiData.pathA.years;
    const costB = (roiData.pathB.itpCost - roiData.pathB.itpScholarship) +
        ((roiData.pathB.postTuition - roiData.pathB.postScholarship) * roiData.pathB.postYears);
    const roiDifference = costA - costB;

    const handleAskAI = async (e: React.FormEvent, overrideQuestion?: string) => {
        if (e) e.preventDefault();
        const q = overrideQuestion || aiQuestion;
        if (!q.trim()) return;

        const newMsg = { role: 'user' as const, text: q };
        setAiChatHistory(prev => [...prev, newMsg]);
        setAiQuestion('');
        setAiLoading(true);

        try {
            let contextContext = `Persona: ${user.roles.join('/')}. `;
            if (view === 'TOOL' && selectedToolId === 'roi_calc') {
                contextContext += `User is using ROI Calculator. Path A Cost: $${costA}. Path B Cost: $${costB}. Difference: $${roiDifference}. Help the scout explain why investing in ITP now saves money long-term via higher future scholarships.`;
            } else if (view === 'MASTERCLASS') {
                contextContext += `User is learning about the Instagram Lead Magnet.`;
            }

            const historyText = aiChatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
            const fullPrompt = `You are ScoutAI, a tactical advisor for soccer scouts. Context: ${contextContext}\n\nQuestion: ${q}\n\nChat History:\n${historyText}`;

            const res = await askScoutAI(fullPrompt);
            setAiChatHistory(prev => [...prev, { role: 'ai', text: res }]);
        } catch (e) {
            setAiChatHistory(prev => [...prev, { role: 'ai', text: 'Network error. Try again.' }]);
        } finally {
            setAiLoading(false);
        }
    };

    const copyApplyLink = (hook: string) => {
        const link = `warubi.com/apply/${user.scoutId || 'demo'}?hook=${hook}`;
        navigator.clipboard.writeText(link);
        setToolCopied(true);
        setTimeout(() => setToolCopied(false), 2000);
    };

    // Sub-Views
    const LeadMagnetMasterclass = () => (
        <div className="animate-fade-in space-y-10 pb-10 max-w-5xl mx-auto">
            <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Back to Dashboard</button>
            <div className="bg-scout-accent/10 border border-scout-accent/30 rounded-[3rem] p-10 relative overflow-hidden">
                <Instagram className="absolute -right-4 -bottom-4 text-scout-accent/10 w-48 h-48 -rotate-12" />
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">Bio Masterclass</h2>
                <p className="text-gray-300 text-xl max-w-xl font-medium">Turn your social profile into a passive scouting engine. Your bio link is your digital storefront.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 shadow-xl">
                    <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight"><Smartphone size={24} className="text-scout-accent" /> Step 1: The Bio Blueprint</h3>
                    <div className="bg-scout-900 rounded-2xl p-6 border border-scout-700 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-scout-accent shadow-glow flex items-center justify-center text-scout-900 font-black">W</div>
                            <div><div className="h-3 w-32 bg-scout-700 rounded-full mb-2"></div><div className="h-2 w-20 bg-scout-800 rounded-full"></div></div>
                        </div>
                        <div className="p-5 bg-scout-800 rounded-xl text-sm italic text-gray-300 border-l-4 border-scout-accent leading-relaxed shadow-inner">
                            "Verified Warubi Scout ⚽️ <br />Helping US talent reach Germany 🇩🇪<br />Apply for Evaluation 👇<br /><span className="text-scout-accent font-bold not-italic">warubi.com/apply/{user.scoutId}</span>"
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-6 italic bg-scout-900/50 p-3 rounded-lg border border-white/5 font-mono">Pro Tip: Using the word "Verified" increases click-through rates by up to 40% based on our network data.</p>
                </div>

                <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 shadow-xl">
                    <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight"><CheckCircle2 size={24} className="text-scout-accent" /> Step 2: The Conversion Loop</h3>
                    <ul className="space-y-4 font-mono">
                        {[
                            { t: "Player Clicks", d: "A prospect sees your post and clicks your personalized bio link." },
                            { t: "AI Evaluation", d: "They submit highlights. Warubi AI scores and tiers them instantly." },
                            { t: "Review Queue", d: "You get a dashboard alert. The lead is waiting in your queue." },
                            { t: "Outreach", d: "You send a personalized WhatsApp script to the parent." }
                        ].map((s, i) => (
                            <li key={i} className="flex gap-4 p-4 rounded-2xl bg-scout-900/30 border border-white/5 hover:bg-scout-900/50 transition-colors">
                                <div className="w-8 h-8 rounded-xl bg-scout-accent flex items-center justify-center text-scout-900 text-xs font-black shrink-0 shadow-lg">{i + 1}</div>
                                <div><h4 className="text-sm font-black text-white uppercase tracking-wide">{s.t}</h4><p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{s.d}</p></div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    const SystemAuditView = () => (
        <div className="animate-fade-in space-y-16 pb-20 max-w-6xl mx-auto">
            <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Exit Audit</button>

            <div className="text-center space-y-6">
                <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
                    The Warubi <span className="text-scout-accent">System Audit</span>
                </h2>
                <p className="text-gray-400 font-mono text-lg max-w-2xl mx-auto">
                    Eliminating Information Asymmetry in Global Scouting. Verifiable data over promises.
                </p>
            </div>

            {/* Audit Metrics Toggle/Comparison */}
            <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h3 className="text-scout-warning font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <AlertTriangle size={16} /> The Industry Problem (The Agency Black Box)
                    </h3>
                    <div className="bg-scout-warning/5 border border-scout-warning/20 rounded-[2.5rem] p-8 space-y-6">
                        {MARKET_DATA.AUDIT_METRICS.map((m, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <X className="text-scout-warning mt-1 shrink-0" size={16} />
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase">{m.label}</p>
                                    <p className="text-sm text-white font-medium">{m.oldWay}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-scout-accent font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} /> The Warubi Protocol (Verifiable Merit)
                    </h3>
                    <div className="bg-scout-accent/5 border border-scout-accent/30 rounded-[2.5rem] p-8 space-y-6 shadow-glow">
                        {MARKET_DATA.AUDIT_METRICS.map((m, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <Check className="text-scout-accent mt-1 shrink-0" size={16} />
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase">{m.label}</p>
                                    <p className="text-sm text-white font-black font-mono">{m.warubi}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* The Hybrid Global Model */}
            <div className="bg-scout-800 rounded-[3.5rem] p-12 border border-scout-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-scout-accent/5 rounded-full blur-3xl"></div>
                <div className="relative z-10 grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">The Hybrid <span className="text-blue-400">Global Model</span></h3>
                        <p className="text-gray-300 font-medium leading-relaxed">
                            We fuse the intensity of European professional development with the financial security of the American collegiate system.
                            It is a no-brainer for families: Professional exposure today, debt-free education tomorrow.
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="p-4 bg-scout-900/50 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Global Soccer Market</p>
                                <p className="text-2xl font-black text-white font-mono">{MARKET_DATA.GLOBAL_MARKET}</p>
                            </div>
                            <div className="p-4 bg-scout-900/50 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">US Scholarship Fund</p>
                                <p className="text-2xl font-black text-blue-400 font-mono">{MARKET_DATA.US_SCHOLARSHIP_FUND}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center gap-4 bg-scout-950/50 p-8 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-scout-accent/10 rounded-xl flex items-center justify-center text-scout-accent"><Trophy size={24} /></div>
                            <div>
                                <p className="text-xs font-black text-white uppercase">200+ Placements Annually</p>
                                <p className="text-[10px] text-gray-500">Verified through immutable ledger entries.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400"><GraduationCap size={24} /></div>
                            <div>
                                <p className="text-xs font-black text-white uppercase">UEFA Licensed Guidance</p>
                                <p className="text-[10px] text-gray-500">Education backed by the German DFB curriculum.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operating Protocols (Principles) */}
            <div className="space-y-8">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] text-center">Immutable Operating Protocols</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {WARUBI_PROTOCOLS.map(p => (
                        <div key={p.id} className={`bg-scout-900/50 border-2 rounded-[2rem] p-6 space-y-4 hover:bg-scout-900 transition-all ${p.color}`}>
                            <h4 className="font-black uppercase text-sm">{p.title}</h4>
                            <ul className="space-y-3">
                                {p.principles.map((pr, i) => (
                                    <li key={i} className="text-[11px] text-gray-300 font-mono flex gap-2">
                                        <div className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0"></div> {pr}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Credentials Layer */}
            <div className="border-t border-white/5 pt-16 text-center space-y-8">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Authority Registry</h3>
                <div className="flex flex-wrap justify-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="group cursor-help relative">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                            <ShieldCheck size={32} className="text-scout-accent" />
                            <div className="text-left"><p className="text-[10px] font-black text-white uppercase leading-none">FIFA VERIFIED</p><p className="text-[8px] text-gray-500 uppercase tracking-tighter">Licensed Agents</p></div>
                        </div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-scout-accent text-scout-900 text-[8px] px-2 py-1 rounded font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Reg #4295-8821</div>
                    </div>
                    <div className="group cursor-help relative">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                            <ActivitySquare size={32} className="text-blue-400" />
                            <div className="text-left"><p className="text-[10px] font-black text-white uppercase leading-none">UEFA INSTRUCTION</p><p className="text-[8px] text-gray-500 uppercase tracking-tighter">German Methodology</p></div>
                        </div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-400 text-scout-900 text-[8px] px-2 py-1 rounded font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">DFB Elite Curriculum</div>
                    </div>
                    <div className="group cursor-help relative">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                            <Fingerprint size={32} className="text-scout-highlight" />
                            <div className="text-left"><p className="text-[10px] font-black text-white uppercase leading-none">FC KÖLN PARTNER</p><p className="text-[8px] text-gray-500 uppercase tracking-tighter">Direct Residency</p></div>
                        </div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-scout-highlight text-scout-900 text-[8px] px-2 py-1 rounded font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Verified Official Partner</div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Tools sub-components
    const ROICalculatorView = () => (
        <div className="animate-fade-in space-y-8 pb-10 max-w-4xl mx-auto">
            <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Back</button>
            <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 shadow-xl">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">ROI Visualizer</h2>
                        <p className="text-gray-400 text-sm">Compare the financial impact of ITP vs Standard US College routes.</p>
                    </div>
                    <div className="bg-scout-900 p-4 rounded-2xl border border-scout-700 text-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Total Savings</p>
                        <p className="text-2xl font-black text-scout-accent">${roiDifference.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-white uppercase flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Path A: 4yr US College</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black block mb-2">Annual Tuition ($)</label>
                                <input type="number" value={roiData.pathA.tuition} onChange={e => setRoiData({ ...roiData, pathA: { ...roiData.pathA, tuition: Number(e.target.value) } })} className="w-full bg-scout-900 border border-scout-700 rounded-xl p-3 text-white outline-none focus:border-red-500" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black block mb-2">Annual Scholarship ($)</label>
                                <input type="number" value={roiData.pathA.scholarship} onChange={e => setRoiData({ ...roiData, pathA: { ...roiData.pathA, scholarship: Number(e.target.value) } })} className="w-full bg-scout-900 border border-scout-700 rounded-xl p-3 text-white outline-none focus:border-red-500" />
                            </div>
                            <div className="p-4 bg-scout-900/50 rounded-xl border border-red-500/20">
                                <p className="text-[10px] text-gray-500 uppercase font-black">Total 4yr Cost</p>
                                <p className="text-xl font-black text-white">${costA.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-white uppercase flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-scout-accent shadow-glow"></div> Path B: Warubi ITP + 3yr College</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black block mb-2">ITP Residency Cost ($)</label>
                                <input type="number" value={roiData.pathB.itpCost} onChange={e => setRoiData({ ...roiData, pathB: { ...roiData.pathB, itpCost: Number(e.target.value) } })} className="w-full bg-scout-900 border border-scout-700 rounded-xl p-3 text-white outline-none focus:border-scout-accent" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black block mb-2">Future Annual Scholarship ($)</label>
                                <input type="number" value={roiData.pathB.postScholarship} onChange={e => setRoiData({ ...roiData, pathB: { ...roiData.pathB, postScholarship: Number(e.target.value) } })} className="w-full bg-scout-900 border border-scout-700 rounded-xl p-3 text-white outline-none focus:border-scout-accent" />
                            </div>
                            <div className="p-4 bg-scout-900/50 rounded-xl border border-scout-accent/20">
                                <p className="text-[10px] text-gray-500 uppercase font-black">Total Path B Cost</p>
                                <p className="text-xl font-black text-white">${costB.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 p-6 bg-scout-accent/5 border border-scout-accent/20 rounded-2xl">
                    <p className="text-sm text-gray-300 italic">"By investing in a professional resume in Germany first, you move from a $15k academic scholarship to a $25k+ athletic scholarship, saving <strong>${roiDifference.toLocaleString()}</strong> over the lifetime of your education."</p>
                </div>
            </div>
        </div>
    );

    const LinkGeneratorView = () => (
        <div className="animate-fade-in space-y-8 pb-10 max-w-4xl mx-auto">
            <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Back</button>
            <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 shadow-xl">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-6">Link Customizer</h2>
                <div className="grid md:grid-cols-3 gap-4 mb-10">
                    {([
                        { id: 'pro', label: 'The Pro Hook', desc: 'Focus on German trials', icon: <Trophy size={18} /> },
                        { id: 'ncaa', label: 'The College Hook', desc: 'Focus on Scholarships', icon: <GraduationCap size={18} /> },
                        { id: 'roi', label: 'The ROI Hook', desc: 'Focus on Math/Savings', icon: <Calculator size={18} /> }
                    ] as const).map(h => (
                        <button
                            key={h.id}
                            onClick={() => setEvalHook(h.id)}
                            className={`p-6 rounded-2xl border-2 text-left transition-all ${evalHook === h.id ? 'bg-scout-accent/10 border-scout-accent' : 'bg-scout-900 border-scout-700 hover:border-scout-600'}`}
                        >
                            <div className={`mb-3 ${evalHook === h.id ? 'text-scout-accent' : 'text-gray-500'}`}>{h.icon}</div>
                            <h4 className="text-sm font-black text-white uppercase">{h.label}</h4>
                            <p className="text-[10px] text-gray-500 mt-1">{h.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="bg-scout-900 p-8 rounded-3xl border border-scout-700 text-center space-y-6">
                    <p className="text-gray-400 text-sm">Your Personalized Campaign Link:</p>
                    <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 flex items-center justify-between font-mono text-scout-accent">
                        <span>warubi.com/apply/{user.scoutId || 'demo'}?hook={evalHook}</span>
                        <button onClick={() => copyApplyLink(evalHook)} className="text-white hover:text-scout-accent p-2">
                            {toolCopied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Analytics: 142 clicks this month</p>
                </div>
            </div>
        </div>
    );

    const CollegeTransferValuator = () => (
        <div className="animate-fade-in space-y-8 pb-10 max-w-4xl mx-auto">
            <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Back</button>
            <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 shadow-xl text-center space-y-8">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 border border-blue-500/30">
                    <TrendingUp size={40} />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Transfer Valuator</h2>
                <p className="text-gray-400 max-w-md mx-auto">Use this tool for existing college players (D2/NAIA) looking to move up to D1 or Pro.</p>

                <div className="bg-scout-900 p-8 rounded-3xl border border-scout-700">
                    <p className="text-xs text-gray-500 font-black uppercase mb-4 tracking-widest">Share this assessment link</p>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-scout-800 p-3 rounded-lg border border-scout-700 text-scout-accent text-sm font-mono truncate">
                            warubi.com/transfer-eval/{user.scoutId || 'demo'}
                        </div>
                        <button onClick={() => copyApplyLink('transfer')} className="bg-white text-scout-900 px-6 rounded-lg font-black text-xs uppercase">Copy</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const PathwayCard: React.FC<{ pathway: PathwayDef }> = ({ pathway }) => {
        const Icon = pathway.icon === 'Globe' ? Globe : pathway.icon === 'GraduationCap' ? GraduationCap : pathway.icon === 'Calendar' ? Calendar : BookOpen;
        return (
            <div
                onClick={() => { setSelectedPathway(pathway); setView('PATHWAY_DETAIL'); }}
                className={`bg-scout-800 rounded-3xl p-5 border-2 transition-all cursor-pointer group hover:shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[180px] ${pathway.color.includes('red') ? 'border-red-500/20 hover:border-red-500/50' : pathway.color.includes('blue') ? 'border-blue-500/20 hover:border-blue-500/50' : pathway.color.includes('orange') ? 'border-orange-500/20 hover:border-orange-500/50' : 'border-gray-500/20 hover:border-gray-500/50'}`}
            >
                <div className="p-2.5 bg-scout-900 rounded-xl group-hover:scale-110 transition-transform w-fit mb-3 shrink-0"><Icon size={22} /></div>
                <h3 className="text-sm font-black text-white leading-tight uppercase tracking-tight mb-2">{pathway.title}</h3>
                <p className="text-gray-400 text-[11px] mb-4 flex-1 line-clamp-3 leading-relaxed">{pathway.shortDesc}</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors mt-auto">View Strategy <ArrowRight size={12} /></div>
            </div>
        );
    };

    return (
        <div className="flex h-screen gap-6 xl:gap-10 animate-fade-in relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-32">
                {view === 'HOME' && (
                    <div className="space-y-12 pb-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-8 gap-6">
                            <div><h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase italic">Training Hub</h2><p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] lg:text-xs">Master the network. Lead the talent.</p></div>
                            <div className="flex gap-3">
                                <button onClick={() => setView('MODEL')} className="px-4 py-2.5 bg-scout-800 border border-scout-700 rounded-xl text-white font-black text-[10px] uppercase hover:border-scout-accent transition-all flex items-center gap-2 shrink-0"><Anchor size={14} /> The System Audit</button>
                                <button onClick={() => setView('MASTERCLASS')} className="px-5 py-2.5 bg-scout-accent text-scout-900 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-400 transition-all flex items-center gap-2 shrink-0"><Instagram size={14} /> Bio Masterclass</button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2 flex items-center gap-2"><Trophy size={14} /> Flagship Pathways</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{WARUBI_PATHWAYS.map(p => <PathwayCard key={p.id} pathway={p} />)}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-scout-900 border-2 border-scout-700 rounded-[2.5rem] p-8 space-y-8 hover:border-scout-accent/30 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-scout-accent/10 rounded-2xl text-scout-accent"><Footprints size={20} /></div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">The Scouting Lifecycle</h3>
                                </div>
                                <div className="space-y-6">
                                    {[
                                        { s: "Identify", i: <Search size={18} />, d: "Find talent at events or via social discovery." },
                                        { s: "Evaluate", i: <BarChart3 size={18} />, d: "Use AI tools to tier and benchmark potential." },
                                        { s: "Connect", i: <MessageSquare size={18} />, d: "Send tactical outreach to build parent trust." },
                                        { s: "Place", i: <CheckCircle2 size={18} />, d: "Secure the contract or scholarship lifecycle." }
                                    ].map((st, i) => (
                                        <div key={i} className="flex gap-5 group/item">
                                            <div className="w-10 h-10 rounded-xl bg-scout-800 border border-scout-700 flex items-center justify-center text-gray-500 group-hover/item:text-scout-accent transition-colors shrink-0">{st.i}</div>
                                            <div><h4 className="font-bold text-white uppercase text-sm mb-1">{st.s}</h4><p className="text-xs text-gray-500 leading-relaxed">{st.d}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-4 flex items-center gap-2"><Zap size={14} className="text-scout-highlight" /> Lead Gen Toolbox</h3>
                                <div className="space-y-4 font-mono">
                                    <div onClick={() => { setSelectedToolId('roi_calc'); setView('TOOL'); }} className="bg-scout-800 border-2 border-scout-700 p-6 rounded-[2rem] flex justify-between items-center cursor-pointer hover:border-scout-highlight transition-all group">
                                        <div className="flex gap-4 items-center min-w-0">
                                            <div className="p-3 bg-scout-900 rounded-2xl text-scout-highlight group-hover:scale-110 transition-transform shrink-0"><Calculator size={24} /></div>
                                            <div className="min-w-0"><h4 className="text-lg font-black text-white uppercase tracking-tight truncate">ROI Visualizer</h4><p className="text-[10px] text-gray-500 truncate">ITP vs US College Debt comparison.</p></div>
                                        </div>
                                        <div className="text-gray-700 group-hover:text-white shrink-0 ml-2"><ChevronRight size={20} /></div>
                                    </div>
                                    <div onClick={() => { setSelectedToolId('eval_tool'); setView('TOOL'); }} className="bg-scout-800 border-2 border-scout-700 p-6 rounded-[2rem] flex justify-between items-center cursor-pointer hover:border-scout-accent transition-all group">
                                        <div className="flex gap-4 items-center min-w-0">
                                            <div className="p-3 bg-scout-900 rounded-2xl text-scout-accent group-hover:scale-110 transition-transform shrink-0"><Smartphone size={24} /></div>
                                            <div className="min-w-0"><h4 className="text-lg font-black text-white uppercase tracking-tight truncate">Link Customizer</h4><p className="text-[10px] text-gray-500 truncate">High-conversion Bio Link CTAs.</p></div>
                                        </div>
                                        <div className="text-gray-700 group-hover:text-white shrink-0 ml-2"><ChevronRight size={20} /></div>
                                    </div>
                                    <div onClick={() => { setSelectedToolId('transfer_val'); setView('TOOL'); }} className="bg-scout-800 border-2 border-scout-700 p-6 rounded-[2rem] flex justify-between items-center cursor-pointer hover:border-blue-500 transition-all group">
                                        <div className="flex gap-4 items-center min-w-0">
                                            <div className="p-3 bg-scout-900 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform shrink-0"><TrendingUp size={24} /></div>
                                            <div className="min-w-0"><h4 className="text-lg font-black text-white uppercase tracking-tight truncate">Transfer Portal</h4><p className="text-[10px] text-gray-500 truncate">D2 → D1 Potential Audit.</p></div>
                                        </div>
                                        <div className="text-gray-700 group-hover:text-white shrink-0 ml-2"><ChevronRight size={20} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-scout-800 rounded-[2.5rem] p-8 border border-scout-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3"><BarChart3 size={20} className="text-blue-400" /> Quick Calibration</h3>
                            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                                {ITP_REFERENCE_PLAYERS.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedRefPlayer(p); setView('REF_DETAIL'); }} className="min-w-[260px] bg-scout-900 border-2 border-scout-700 rounded-3xl p-6 text-left group hover:border-scout-accent transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-scout-800 rounded-2xl flex items-center justify-center font-black text-white border border-scout-700 group-hover:text-scout-accent">{p.name.charAt(0)}</div>
                                            <div className="bg-scout-800 px-2 py-1 rounded text-[8px] font-black text-gray-500 uppercase">{p.evaluation?.scholarshipTier}</div>
                                        </div>
                                        <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-scout-accent transition-colors truncate">{p.name}</h4>
                                        <p className="text-[10px] text-gray-500 mt-2 line-clamp-2 italic font-mono">"{p.evaluation?.summary || 'Awaiting evaluation.'}"</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'PATHWAY_DETAIL' && selectedPathway && (
                    <div className="animate-fade-in space-y-8 pb-10">
                        <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Back</button>
                        <div className={`p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 ${selectedPathway.color.includes('red') ? 'bg-red-500/5 border-red-500/20' : selectedPathway.color.includes('blue') ? 'bg-blue-500/5 border-blue-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                            <div className="max-w-2xl">
                                <h2 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tighter italic mb-4">{selectedPathway.title}</h2>
                                <p className="text-gray-300 text-lg md:text-xl font-medium">{selectedPathway.shortDesc}</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8 font-mono">
                            <div className="bg-scout-800 p-8 rounded-[2rem] border border-scout-700">
                                <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2"><CheckCircle2 size={16} className="text-scout-accent" /> Ideal Profile</h3>
                                <ul className="space-y-3">
                                    {selectedPathway.idealProfile.map((item, i) => (
                                        <li key={i} className="flex items-start gap-4 text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-scout-accent mt-2 shrink-0"></div> {item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-scout-800 p-8 rounded-[2rem] border border-scout-700">
                                <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2"><ShieldAlert size={16} className="text-red-400" /> Red Flags</h3>
                                <ul className="space-y-3">
                                    {selectedPathway.redFlags.map((item, i) => (
                                        <li key={i} className="flex items-start gap-4 text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div> {item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="bg-scout-900 p-8 md:p-10 rounded-[2.5rem] border border-scout-700">
                            <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2"><MessageSquare size={16} className="text-blue-400" /> Strategic Pitch</h3>
                            <div className="p-6 md:p-8 bg-scout-800 rounded-3xl border border-scout-700 italic text-base md:text-lg text-gray-300 relative font-mono">
                                <Zap className="absolute -left-2 -top-2 text-scout-highlight opacity-50" size={24} />
                                "{selectedPathway.scriptSnippet}"
                            </div>
                            <button onClick={() => navigator.clipboard.writeText(selectedPathway.scriptSnippet)} className="mt-8 px-8 py-3 bg-white text-scout-900 font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-100 transition-all flex items-center gap-2"><Copy size={14} /> Copy Pitch</button>
                        </div>
                    </div>
                )}

                {view === 'REF_DETAIL' && selectedRefPlayer && (
                    <div className="animate-fade-in space-y-8 pb-10">
                        <button onClick={() => setView('HOME')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"><X size={16} /> Back</button>
                        <div className="bg-gradient-to-br from-scout-800 to-scout-900 border-2 border-scout-700 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-scout-accent/5 rounded-full blur-3xl"></div>
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                                <div className="flex items-center gap-6 md:gap-8">
                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-scout-800 border-4 md:border-8 border-scout-700 rounded-3xl md:rounded-[3rem] flex items-center justify-center text-3xl md:text-5xl font-black text-white shadow-2xl shrink-0">{selectedRefPlayer.name.charAt(0)}</div>
                                    <div>
                                        <div className="bg-scout-accent text-scout-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 inline-block shadow-glow">{selectedRefPlayer.evaluation?.scholarshipTier} Standard</div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic">{selectedRefPlayer.name}</h2>
                                        <p className="text-gray-400 text-base md:text-lg font-medium">{selectedRefPlayer.evaluation?.collegeLevel}</p>
                                    </div>
                                </div>
                                <div className="text-center bg-scout-900 p-5 rounded-[2rem] border border-scout-700 w-full md:w-auto font-mono">
                                    <div className="text-4xl md:text-5xl font-black text-white">{selectedRefPlayer.evaluation?.score}</div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Benchmark Score</div>
                                </div>
                            </div>
                            <div className="mt-8 md:mt-10 p-6 md:p-8 bg-black/30 rounded-3xl border border-white/5 italic text-gray-300 leading-relaxed text-sm md:text-base font-mono">"{selectedRefPlayer.evaluation?.summary || 'Awaiting evaluation.'}"</div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 font-mono">
                            <div className="bg-scout-800 rounded-[2rem] border border-scout-700 p-8 md:p-10">
                                <h4 className="text-white font-black uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2"><Trophy size={16} className="text-scout-highlight" /> Competition Benchmark</h4>
                                <ul className="space-y-3">
                                    {TIER_BENCHMARKS[selectedRefPlayer.evaluation!.scholarshipTier].leagues.map((l: any, i: any) => (<li key={i} className="flex gap-3 text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-scout-highlight mt-1.5"></div>{l}</li>))}
                                </ul>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-scout-800 rounded-3xl border border-scout-700 p-6"><h4 className="text-white font-black uppercase text-[9px] mb-2 flex items-center gap-2"><Dumbbell size={14} className="text-blue-400" /> Physical standard</h4><p className="text-sm text-gray-400">{TIER_BENCHMARKS[selectedRefPlayer.evaluation!.scholarshipTier].physical}</p></div>
                                <div className="bg-scout-800 rounded-3xl border border-scout-700 p-6"><h4 className="text-white font-black uppercase text-[9px] mb-2 flex items-center gap-2"><Target size={14} className="text-red-400" /> Technical standard</h4><p className="text-sm text-gray-400">{TIER_BENCHMARKS[selectedRefPlayer.evaluation!.scholarshipTier].technical}</p></div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'MODEL' && <SystemAuditView />}
                {view === 'MASTERCLASS' && <LeadMagnetMasterclass />}
                {view === 'TOOL' && selectedToolId === 'roi_calc' && <ROICalculatorView />}
                {view === 'TOOL' && selectedToolId === 'eval_tool' && <LinkGeneratorView />}
                {view === 'TOOL' && selectedToolId === 'transfer_val' && <CollegeTransferValuator />}
            </div>

            {/* AI SIDEBAR (Brain) */}
            <div className="w-[320px] xl:w-[380px] hidden lg:flex flex-col bg-scout-800 border-l border-white/5 h-screen sticky top-0 shrink-0 overflow-hidden shadow-2xl">
                <div className="p-6 xl:p-8 border-b border-white/5 bg-scout-900/50">
                    <h3 className="font-black text-white uppercase tracking-tighter italic text-lg xl:text-xl flex items-center gap-2">
                        <Bot size={24} className="text-scout-accent shrink-0" /> Scout<span className="text-scout-accent">AI</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 font-mono">Unified Intelligence Hub</p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto bg-scout-900/30 custom-scrollbar space-y-6">
                    {aiChatHistory.length === 0 && (
                        <div className="space-y-6">
                            <div className="bg-scout-800 p-6 rounded-3xl border border-scout-700 shadow-xl">
                                <div className="flex items-center gap-2 text-scout-accent font-black text-[10px] uppercase tracking-widest mb-4"><Lightbulb size={12} /> AI Suggestions</div>
                                <div className="space-y-3 font-mono">
                                    <button onClick={(e) => handleAskAI(e, "How do I explain the ROI to a hesitant parent?")} className="w-full text-left text-[11px] bg-scout-900 hover:bg-scout-700 p-4 rounded-2xl border border-scout-700 text-gray-300 font-bold transition-all leading-snug hover:border-scout-accent/50">"How to explain ROI to parents?"</button>
                                    <button onClick={(e) => handleAskAI(e, "What is the minimum GPA for NCAA D1 Eligibility?")} className="w-full text-left text-[11px] bg-scout-900 hover:bg-scout-700 p-4 rounded-2xl border border-scout-700 text-gray-300 font-bold transition-all leading-snug hover:border-scout-accent/50">"What is the D1 GPA minimum?"</button>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-scout-accent/5 border border-scout-accent/20 text-center font-mono"><p className="text-[9px] text-scout-accent font-black uppercase tracking-wider">Context: {user.roles.join(' / ')}</p></div>
                        </div>
                    )}

                    {aiChatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[92%] p-4 rounded-2xl text-[13px] font-medium shadow-2xl ${msg.role === 'user'
                                ? 'bg-scout-accent text-scout-900 rounded-br-none font-bold'
                                : 'bg-scout-800 text-gray-200 border border-white/5 rounded-bl-none font-mono'
                                }`}>
                                {msg.role === 'ai' ? <FormattedMessage text={msg.text} /> : msg.text}
                            </div>
                            <span className="text-[8px] text-gray-600 mt-2 px-2 font-black uppercase tracking-widest">{msg.role === 'user' ? 'Scout' : 'ScoutAI'}</span>
                        </div>
                    ))}
                    {aiLoading && <div className="bg-scout-800 p-3 rounded-2xl rounded-bl-none animate-pulse w-fit"><Loader2 className="animate-spin text-scout-accent" size={16} /></div>}
                </div>

                <div className="p-6 bg-scout-800 border-t border-white/5">
                    <form onSubmit={handleAskAI} className="relative group">
                        <input
                            type="text"
                            placeholder="Ask ScoutAI..."
                            className="w-full bg-scout-900 text-white text-xs rounded-2xl pl-5 pr-14 py-4 focus:outline-none border-2 border-scout-700 focus:border-scout-accent transition-all font-bold font-mono placeholder-gray-600 shadow-inner"
                            value={aiQuestion}
                            onChange={(e) => setAiQuestion(e.target.value)}
                        />
                        <button type="submit" disabled={aiLoading || !aiQuestion} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-scout-accent text-scout-900 rounded-xl hover:bg-emerald-400 transition-all shadow-glow active:scale-95 disabled:opacity-30 disabled:scale-100">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeTab;
