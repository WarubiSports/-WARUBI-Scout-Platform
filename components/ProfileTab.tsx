
import React, { useState } from 'react';
import { UserProfile, Player, ScoutingEvent, PlayerStatus, DashboardTab } from '../types';
// Added Globe to the lucide-react imports
import { 
  BadgeCheck, Share2, Award, MapPin, Users, Calendar, 
  Briefcase, QrCode, TrendingUp, ChevronRight, 
  ShieldCheck, Copy, CheckCircle2, Zap, Edit2, Save, X, Sparkles, Calculator, Info, MessageCircle, ChevronLeft, Instagram, Radio, Download, ExternalLink, Flame, Trophy, Globe
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
    const [copied, setCopied] = useState(false);
    const applyLink = `warubi.com/apply/${user.scoutId || 'demo'}`;

    const copyApplyLink = () => {
        navigator.clipboard.writeText(applyLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        const shareData = {
            title: `Warubi Scout Profile: ${user.name}`,
            text: `View my verified scouting credentials and start your player assessment.`,
            url: `https://app.warubi-sports.com/scout/${user.scoutId || 'demo'}`
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                copyApplyLink();
            }
        } else {
            copyApplyLink();
        }
    };

    const totalPlacements = players.filter(p => p.status === PlayerStatus.PLACED).length;
    const progressToNextLevel = (scoutScore % 500) / 500 * 100;
    const currentLevel = Math.floor(scoutScore / 500) + 1;

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
            {/* HERO IDENTITY - ELITE SCOUT PASS */}
            <div className="flex flex-col gap-10 items-center">
                
                {/* FIFA FUT STYLE CARD */}
                <div className="relative group w-full max-w-[340px] md:max-w-md aspect-[3/4.5] md:aspect-[4/3] flex flex-col md:flex-row bg-[#0a0f1d] rounded-[2.5rem] border-2 border-[#fbbf24]/30 shadow-[0_0_50px_rgba(251,191,36,0.1)] overflow-hidden">
                    {/* Holographic Shimmer Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                    
                    {/* Left/Top Section: Visual & Logo */}
                    <div className="w-full md:w-1/2 p-8 flex flex-col items-center justify-center relative bg-gradient-to-b from-[#0a0f1d] to-[#0d1428] border-b md:border-b-0 md:border-r border-white/5">
                        <div className="absolute top-6 left-6 flex items-center gap-2">
                             <div className="w-8 h-8 bg-scout-accent rounded-lg flex items-center justify-center font-black text-scout-900 text-sm shadow-glow">W</div>
                             <span className="text-[10px] font-black text-white tracking-widest uppercase italic">PRO</span>
                        </div>
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-scout-accent/20 to-scout-highlight/10 rounded-[2.5rem] border-2 border-white/10 flex items-center justify-center text-5xl md:text-6xl font-black text-white shadow-2xl relative">
                            {user.name.charAt(0)}
                            <div className="absolute -bottom-2 -right-2 bg-[#fbbf24] text-[#0a0f1d] w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border-4 border-[#0a0f1d] shadow-lg">
                                {currentLevel}
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                             <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{user.name.split(' ')[0]}</h2>
                             <h2 className="text-4xl font-black text-[#fbbf24] uppercase tracking-tighter italic leading-tight">{user.name.split(' ').slice(1).join(' ')}</h2>
                        </div>
                    </div>

                    {/* Right/Bottom Section: Stats & Region */}
                    <div className="flex-1 p-8 flex flex-col justify-between relative overflow-hidden bg-[#0d1428]">
                         <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Region</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-1.5"><MapPin size={12} className="text-scout-accent"/> {user.region}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</p>
                                    <span className="bg-scout-accent/10 text-scout-accent text-[9px] font-black px-2 py-0.5 rounded border border-scout-accent/30 uppercase">Verified</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Pool</p>
                                    <p className="text-2xl font-black text-white font-mono">{players.length}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Placements</p>
                                    <p className="text-2xl font-black text-[#fbbf24] font-mono">{totalPlacements}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Core Pathway</p>
                                    <p className="text-xs font-bold text-gray-300 uppercase">{user.roles[0] || 'Regional Scout'}</p>
                                </div>
                            </div>
                         </div>

                         <div className="pt-6 border-t border-white/5 flex items-center gap-2 grayscale opacity-40">
                             <ShieldCheck size={18}/> <Award size={18}/> <Globe size={18}/>
                         </div>
                    </div>
                </div>

                {/* XP PROGRESS BAR HUB */}
                <div className="w-full max-w-xl bg-scout-800/50 border border-scout-700 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic flex items-center gap-2"><Trophy size={18} className="text-scout-highlight"/> Level {currentLevel} Scout</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{scoutScore} Total XP Earned</p>
                        </div>
                        <span className="text-[10px] font-black text-scout-accent uppercase">Next Level: {500 - (scoutScore % 500)} XP</span>
                    </div>
                    <div className="w-full bg-scout-900 h-3 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-gradient-to-r from-scout-accent to-emerald-400 h-full transition-all duration-1000 shadow-glow" style={{ width: `${progressToNextLevel}%` }}></div>
                    </div>
                </div>

                {/* SIDELINE ACTION HUB */}
                <div className="w-full max-w-xl grid grid-cols-3 gap-3">
                    <button 
                        onClick={onOpenBeam}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-scout-accent text-scout-900 rounded-[2rem] shadow-glow hover:scale-105 active:scale-95 transition-all group"
                    >
                        <Radio size={24} className="group-hover:animate-pulse"/>
                        <span className="text-[10px] font-black uppercase tracking-tight">Signal Beam</span>
                    </button>
                    <button 
                        onClick={handleShare}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white text-scout-900 rounded-[2rem] shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                        <Share2 size={24} />
                        <span className="text-[10px] font-black uppercase tracking-tight">Share Profile</span>
                    </button>
                    <button 
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-scout-800 text-white rounded-[2rem] border border-scout-700 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Download size={24} className="text-scout-highlight"/>
                        <span className="text-[10px] font-black uppercase tracking-tight">Save V-Card</span>
                    </button>
                </div>
            </div>

            {/* AUTHORITY CAROUSEL */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Verified Authority</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                     {[
                         { l: 'FIFA Registered', i: <ShieldCheck size={24}/>, c: 'text-blue-400' },
                         { l: 'UEFA Licensed', i: <Award size={24}/>, c: 'text-scout-accent' },
                         { l: 'FC Köln Partner', i: <Briefcase size={24}/>, c: 'text-scout-highlight' },
                         { l: 'Verified Agent', i: <BadgeCheck size={24}/>, c: 'text-purple-400' }
                     ].map((auth, idx) => (
                         <div key={idx} className="min-w-[160px] bg-scout-800/40 border border-white/5 p-4 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-scout-800/60 transition-colors">
                             <div className={`${auth.c} p-3 bg-scout-900 rounded-2xl`}>{auth.i}</div>
                             <span className="text-[10px] font-black text-gray-300 uppercase tracking-tight">{auth.l}</span>
                         </div>
                     ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEAD MAGNET CARD */}
                <div className="bg-gradient-to-br from-scout-800 to-scout-900 border-2 border-scout-accent/30 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-scout-accent/5 rounded-full blur-3xl"></div>
                    <div className="flex flex-col h-full relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-scout-900 rounded-2xl border border-scout-accent/20 text-scout-accent">
                                <Instagram size={32} />
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</div>
                                <div className="flex items-center gap-2 text-scout-accent font-bold text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-scout-accent animate-pulse"></div> LIVE
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Lead Magnet Link</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Place this in your Instagram bio to capture talent while you sleep. AI evaluates every applicant instantly.</p>
                        
                        <div className="bg-scout-900 p-4 rounded-2xl border border-scout-700 flex items-center justify-between mb-8 group cursor-pointer" onClick={copyApplyLink}>
                            <span className="text-scout-accent font-mono text-sm font-bold truncate pr-4">{applyLink}</span>
                            <div className="shrink-0">{copied ? <CheckCircle2 size={18} className="text-scout-accent"/> : <Copy size={18} className="text-gray-600 group-hover:text-white transition-colors" />}</div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
                                <span>Total Link Views</span>
                                <span className="text-white">142</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* NETWORK STATS */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 flex flex-col items-center text-center justify-center hover:border-white/20 transition-all cursor-default">
                        <div className="text-5xl font-black text-white mb-2">{players.length}</div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Talent Pool</div>
                     </div>
                     <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 flex flex-col items-center text-center justify-center hover:border-scout-accent/40 transition-all cursor-default group">
                        <div className="text-5xl font-black text-scout-accent mb-2 group-hover:scale-110 transition-transform">{totalPlacements}</div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Placements</div>
                     </div>
                     <div className="bg-scout-800 rounded-[2.5rem] border border-scout-700 p-8 flex flex-col items-center text-center justify-center col-span-2 hover:border-scout-highlight/40 transition-all cursor-default">
                        <div className="text-5xl font-black text-scout-highlight mb-2">{events.length}</div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Hosted Events</div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileTab;
