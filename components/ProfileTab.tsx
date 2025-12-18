
import React, { useState } from 'react';
import { UserProfile, Player, ScoutingEvent, PlayerStatus, DashboardTab } from '../types';
import { 
  BadgeCheck, Share2, Award, MapPin, Users, Calendar, 
  Briefcase, QrCode, TrendingUp, ChevronRight, 
  ShieldCheck, Copy, CheckCircle2, Zap, Edit2, Save, X, Sparkles, Calculator, Info, MessageCircle, ChevronLeft, Instagram, Radio, Download, ExternalLink, Flame, Trophy, Globe, Smartphone, User, Phone, Mail
} from 'lucide-react';

interface ProfileTabProps {
  user: UserProfile;
  players: Player[];
  events: ScoutingEvent[];
  onUpdateUser?: (updatedUser: UserProfile) => void;
  onNavigate?: (tab: DashboardTab) => void;
  scoutScore?: number;
  onOpenBeam?: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, players, events, scoutScore = 0, onOpenBeam }) => {
    const [cardIndex, setCardIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const applyLink = `warubi.com/apply/${user.scoutId || 'demo'}`;

    const totalPlacements = players.filter(p => p.status === PlayerStatus.PLACED).length;
    const currentLevel = Math.floor(scoutScore / 500) + 1;
    const progressToNextLevel = (scoutScore % 500) / 500 * 100;

    const copyLink = () => {
        navigator.clipboard.writeText(applyLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const nextCard = () => setCardIndex((prev) => (prev + 1) % 3);
    const prevCard = () => setCardIndex((prev) => (prev === 0 ? 2 : prev - 1));

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-32">
            {/* INTERACTIVE SCOUT PASS DECK */}
            <div className="flex flex-col items-center gap-8">
                <div className="relative w-full max-w-[350px] aspect-[3/4.5] perspective-1000">
                    <div className="relative w-full h-full transition-all duration-700 preserve-3d">
                        
                        {/* CARD 1: IDENTITY (FIFA STYLE) */}
                        <div className={`absolute inset-0 backface-hidden transition-all duration-500 transform ${cardIndex === 0 ? 'opacity-100 scale-100 z-30' : 'opacity-0 scale-95 pointer-events-none z-10'}`}>
                            <div className="h-full bg-[#0a0f1d] rounded-[2.5rem] border-2 border-[#fbbf24]/40 shadow-[0_0_50px_rgba(251,191,36,0.15)] overflow-hidden flex flex-col">
                                <div className="p-8 flex flex-col items-center justify-center border-b border-white/5 bg-gradient-to-b from-[#0a0f1d] to-[#0d1428]">
                                    <div className="w-32 h-32 bg-gradient-to-br from-scout-accent/20 to-scout-highlight/10 rounded-[2.5rem] border-2 border-white/10 flex items-center justify-center text-5xl font-black text-white shadow-2xl relative">
                                        {user.name.charAt(0)}
                                        <div className="absolute -bottom-2 -right-2 bg-[#fbbf24] text-[#0a0f1d] w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border-4 border-[#0a0f1d] shadow-lg">
                                            {currentLevel}
                                        </div>
                                    </div>
                                    <div className="mt-6 text-center">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{user.name.split(' ')[0]}</h2>
                                        <h2 className="text-3xl font-black text-[#fbbf24] uppercase tracking-tighter italic leading-tight">{user.name.split(' ').slice(1).join(' ')}</h2>
                                    </div>
                                </div>
                                <div className="flex-1 p-8 flex flex-col justify-between bg-[#0d1428]">
                                    <div className="grid grid-cols-2 gap-y-6">
                                        <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Region</p><p className="text-sm font-bold text-white">{user.region}</p></div>
                                        <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</p><span className="text-scout-accent text-[9px] font-black uppercase">Verified</span></div>
                                        <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pool</p><p className="text-xl font-black text-white">{players.length}</p></div>
                                        <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Placed</p><p className="text-xl font-black text-[#fbbf24]">{totalPlacements}</p></div>
                                    </div>
                                    <div className="pt-6 border-t border-white/5 flex items-center gap-2 grayscale opacity-40">
                                        <ShieldCheck size={18}/> <Award size={18}/> <Globe size={18}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: THE BEAM (QR SCAN) */}
                        <div className={`absolute inset-0 backface-hidden transition-all duration-500 transform ${cardIndex === 1 ? 'opacity-100 scale-100 z-30' : 'opacity-0 scale-95 pointer-events-none z-10'}`}>
                            <div className="h-full bg-white rounded-[2.5rem] border-4 border-scout-accent/30 shadow-[0_0_60px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center p-8 text-scout-900">
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none mb-1">Player Audit</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scan to Start Assessment</p>
                                </div>
                                <div className="w-full aspect-square border-4 border-scout-900/5 rounded-3xl flex items-center justify-center p-6 bg-gray-50 mb-6">
                                    <QrCode size={180} strokeWidth={1.5} />
                                </div>
                                <div className="bg-scout-900 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-lg animate-pulse">
                                    Ready for Scan
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: V-CARD (CONTACT) */}
                        <div className={`absolute inset-0 backface-hidden transition-all duration-500 transform ${cardIndex === 2 ? 'opacity-100 scale-100 z-30' : 'opacity-0 scale-95 pointer-events-none z-10'}`}>
                            <div className="h-full bg-scout-800 rounded-[2.5rem] border-2 border-scout-highlight/40 shadow-2xl flex flex-col overflow-hidden">
                                <div className="p-8 border-b border-white/5 bg-scout-900/50 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-scout-highlight/10 rounded-full flex items-center justify-center text-scout-highlight border border-scout-highlight/30 mb-4">
                                        <Smartphone size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase italic">Scout Contact</h3>
                                </div>
                                <div className="p-8 space-y-6 flex-1">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-scout-900 flex items-center justify-center text-gray-500"><User size={18}/></div><div><p className="text-[9px] text-gray-500 uppercase font-black">Full Name</p><p className="text-sm font-bold text-white">{user.name}</p></div></div>
                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-scout-900 flex items-center justify-center text-gray-500"><Mail size={18}/></div><div><p className="text-[9px] text-gray-500 uppercase font-black">Email</p><p className="text-sm font-bold text-white">scout@warubi.com</p></div></div>
                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-scout-900 flex items-center justify-center text-gray-500"><Phone size={18}/></div><div><p className="text-[9px] text-gray-500 uppercase font-black">WhatsApp</p><p className="text-sm font-bold text-white">+1 555-SCOUT</p></div></div>
                                    </div>
                                    <button className="w-full py-4 bg-white text-scout-900 font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest mt-4">
                                        <Download size={16}/> Save Contact
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <button onClick={prevCard} className="absolute top-1/2 -left-6 -translate-y-1/2 w-12 h-12 bg-scout-900 border border-white/10 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-90 transition-all z-40">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextCard} className="absolute top-1/2 -right-6 -translate-y-1/2 w-12 h-12 bg-scout-900 border border-white/10 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-90 transition-all z-40">
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Dot Indicators */}
                <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                        <button key={i} onClick={() => setCardIndex(i)} className={`h-1.5 rounded-full transition-all duration-300 ${cardIndex === i ? 'w-8 bg-scout-accent' : 'w-2 bg-scout-700'}`} />
                    ))}
                </div>

                {/* XP Progress Bar */}
                <div className="w-full max-w-xl bg-scout-800/50 border border-scout-700 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic flex items-center gap-2"><Trophy size={18} className="text-scout-highlight"/> Level {currentLevel} Scout</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{scoutScore} XP Total</p>
                        </div>
                        <span className="text-[10px] font-black text-scout-accent uppercase">Next Level: {500 - (scoutScore % 500)} XP</span>
                    </div>
                    <div className="w-full bg-scout-900 h-2.5 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-gradient-to-r from-scout-accent to-emerald-400 h-full transition-all duration-1000 shadow-glow" style={{ width: `${progressToNextLevel}%` }}></div>
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                     { label: 'Share Link', icon: <Share2 size={20}/>, action: copyLink, color: 'bg-scout-accent text-scout-900' },
                     { label: 'Edit Bio', icon: <Edit2 size={20}/>, action: () => {}, color: 'bg-scout-800 text-white' },
                     { label: 'V-Card', icon: <Download size={20}/>, action: () => setCardIndex(2), color: 'bg-scout-800 text-white' },
                     { label: 'Instagram', icon: <Instagram size={20}/>, action: () => {}, color: 'bg-[#E1306C] text-white' }
                 ].map((act, i) => (
                     <button key={i} onClick={act.action} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border border-white/5 hover:scale-105 active:scale-95 transition-all shadow-xl ${act.color}`}>
                         {act.icon}
                         <span className="text-[10px] font-black uppercase tracking-widest">{copied && act.label === 'Share Link' ? 'Copied!' : act.label}</span>
                     </button>
                 ))}
            </div>

            {/* AUTHORITY CAROUSEL */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Verified Authority</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                     {[
                         { l: 'FIFA Registered', i: <ShieldCheck size={24}/>, c: 'text-blue-400' },
                         { l: 'UEFA Licensed', i: <Award size={24}/>, c: 'text-scout-accent' },
                         { l: 'FC Köln Partner', i: <Briefcase size={24}/>, c: 'text-scout-highlight' },
                         { l: 'Verified Agent', i: <BadgeCheck size={24}/>, c: 'text-purple-400' }
                     ].map((auth, idx) => (
                         <div key={idx} className="min-w-[160px] bg-scout-800/40 border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 hover:bg-scout-800/60 transition-colors">
                             <div className={`${auth.c} p-4 bg-scout-900 rounded-2xl`}>{auth.i}</div>
                             <span className="text-[10px] font-black text-gray-300 uppercase tracking-tight leading-snug">{auth.l}</span>
                         </div>
                     ))}
                </div>
            </div>

            {/* PERFORMANCE HUB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-10 flex flex-col items-center justify-center text-center group hover:border-scout-accent/40 transition-all">
                    <div className="text-6xl font-black text-white mb-2 group-hover:scale-110 transition-transform">{totalPlacements}</div>
                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Confirmed Placements</div>
                    <div className="mt-6 flex items-center gap-2 text-scout-accent text-xs font-bold bg-scout-accent/10 px-4 py-1.5 rounded-full border border-scout-accent/20">
                        <TrendingUp size={14}/> Top 5% Globally
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-scout-800 rounded-[2rem] border border-scout-700 p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-3xl font-black text-white mb-1">{players.length}</div>
                        <div className="text-[9px] text-gray-500 font-black uppercase">Talent Pool</div>
                    </div>
                    <div className="bg-scout-800 rounded-[2rem] border border-scout-700 p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-3xl font-black text-white mb-1">{events.length}</div>
                        <div className="text-[9px] text-gray-500 font-black uppercase">Events</div>
                    </div>
                    <div className="bg-scout-800 rounded-[2rem] border border-scout-700 p-6 flex flex-col items-center justify-center text-center col-span-2">
                        <div className="text-3xl font-black text-scout-highlight mb-1">1,242</div>
                        <div className="text-[9px] text-gray-500 font-black uppercase">Link Views</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileTab;
