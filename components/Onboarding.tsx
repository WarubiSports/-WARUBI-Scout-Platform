import React, { useState } from 'react';
import { UserProfile, Player, ScoutingEvent } from '../types';
import { Loader2, User, ArrowRight, BrainCircuit, ShieldCheck, Sparkles, MapPin, Check, GraduationCap, Shield, Briefcase, Users, Heart, FileText, Scale, LogOut } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface OnboardingProps {
    onComplete: (profile: UserProfile, initialPlayers: Player[], initialEvents: ScoutingEvent[]) => void;
    approvedScoutInfo?: { isAdmin: boolean; name?: string; region?: string } | null;
}

const ROLES = [
    { id: 'college', label: 'College Coach', icon: <GraduationCap size={20}/> },
    { id: 'club', label: 'Club Coach', icon: <Shield size={20}/> },
    { id: 'agent', label: 'Pro Agent', icon: <Briefcase size={20}/> },
    { id: 'regional', label: 'Regional Scout', icon: <Users size={20}/> },
    { id: 'parent', label: 'Parent / Advisor', icon: <Heart size={20}/> },
    { id: 'tournament', label: 'Event Director', icon: <ShieldCheck size={20}/> },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, approvedScoutInfo }) => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const { signOut } = useAuthContext();

    // Check if user is admin (can select roles) or regular scout (auto-assigned)
    const isAdmin = approvedScoutInfo?.isAdmin || false;

    // Pre-fill from approved scout info if available
    const [name, setName] = useState(approvedScoutInfo?.name || '');
    // Regular scouts are auto-assigned as "Regional Scout"
    const [selectedRoles, setSelectedRoles] = useState<string[]>(isAdmin ? [] : ['regional']);
    const [region, setRegion] = useState(approvedScoutInfo?.region || '');

    const toggleRole = (roleId: string) => {
        setSelectedRoles(prev =>
            prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
        );
    };

    const handleBackToLogin = async () => {
        await signOut();
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const scoutId = `scout-${Math.random().toString(36).substr(2, 9)}`;
            const user: UserProfile = {
                name,
                roles: selectedRoles,
                region,
                weeklyTasks: ["Set up Instagram Link", "Add first 3 players"],
                scoutPersona: selectedRoles.length > 1 ? "The Unified Expert" : "The Specialist",
                scoutId,
                leadMagnetActive: true,
                isAdmin: approvedScoutInfo?.isAdmin || false,
            };

            setTimeout(() => {
                onComplete(user, [], []);
                setLoading(false);
            }, 1500);
        } catch (e) {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#05080f]">
            <div className="max-w-xl w-full bg-scout-800 border border-scout-700 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">

                {step === 0 && (
                    <div className="space-y-8 animate-fade-in text-center">
                        <div className="space-y-4">
                            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic border-b border-scout-accent/30 pb-4">
                                The Warubi Protocol
                            </h1>
                            <p className="text-gray-400 font-mono text-sm leading-relaxed text-left bg-scout-950/50 p-6 rounded-2xl border border-white/5">
                                <span className="text-scout-accent font-bold block mb-2">Eliminating Information Asymmetry.</span>
                                Scouting is a profession of evidence, not promises. We provide the first verifiable data ledger for talent discovery, backed by UEFA instruction and FIFA licensing. Access is earned, not bought.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="p-4 bg-scout-900 rounded-xl border border-scout-700">
                                <FileText className="text-blue-400 mb-2" size={20}/>
                                <p className="text-[10px] font-black text-gray-500 uppercase">Verification</p>
                                <p className="text-xs text-white font-bold">UEFA Methodology</p>
                            </div>
                            <div className="p-4 bg-scout-900 rounded-xl border border-scout-700">
                                <Scale className="text-scout-highlight mb-2" size={20}/>
                                <p className="text-[10px] font-black text-gray-500 uppercase">Integrity</p>
                                <p className="text-xs text-white font-bold">No Pay-To-Play</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setStep(1)}
                            className="w-full bg-scout-accent hover:bg-emerald-600 text-scout-900 font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-sm"
                        >
                            Acknowledge the Standard <ArrowRight size={20}/>
                        </button>

                        <button
                            onClick={handleBackToLogin}
                            className="w-full text-gray-500 text-xs hover:text-gray-300 transition-colors flex items-center justify-center gap-2 mt-4"
                        >
                            <LogOut size={14} />
                            Back to Login
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center">
                            <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Warubi<span className="text-scout-accent">Scout</span></h1>
                            <p className="text-gray-400 font-medium">
                                {isAdmin ? 'Define your unified scouting identity.' : 'Confirm your scouting profile.'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-scout-900 border-2 border-scout-700 rounded-2xl px-4 py-3 flex items-center gap-4 focus-within:border-scout-accent transition-all">
                                <User className="text-scout-accent" size={20} />
                                <input
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="bg-transparent w-full text-white font-bold outline-none placeholder-gray-600"
                                    placeholder="Full Name"
                                />
                            </div>
                            <div className="bg-scout-900 border-2 border-scout-700 rounded-2xl px-4 py-3 flex items-center gap-4 focus-within:border-scout-accent transition-all">
                                <MapPin className="text-scout-accent" size={20} />
                                <input
                                    value={region} onChange={e => setRegion(e.target.value)}
                                    className="bg-transparent w-full text-white font-bold outline-none placeholder-gray-600"
                                    placeholder="Scouting Region (e.g. Bavaria, Germany)"
                                />
                            </div>
                        </div>

                        {/* Role selection only for admins */}
                        {isAdmin && (
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-1">Identity Matrix</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {ROLES.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => toggleRole(role.id)}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                                selectedRoles.includes(role.id)
                                                ? 'bg-scout-accent/10 border-scout-accent text-white'
                                                : 'bg-scout-900 border-scout-700 text-gray-500 hover:border-scout-600'
                                            }`}
                                        >
                                            <div className={selectedRoles.includes(role.id) ? 'text-scout-accent' : 'text-gray-600'}>{role.icon}</div>
                                            <span className="text-xs font-bold uppercase tracking-tight">{role.label}</span>
                                            {selectedRoles.includes(role.id) && <Check size={14} className="ml-auto text-scout-accent" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Show assigned role for regular scouts */}
                        {!isAdmin && (
                            <div className="bg-scout-900/50 border border-scout-700 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Your Role</p>
                                <div className="flex items-center gap-3 text-white">
                                    <Users size={20} className="text-scout-accent" />
                                    <span className="font-bold">Regional Scout</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setStep(2)}
                            disabled={!name || !region || (isAdmin && selectedRoles.length === 0) || loading}
                            className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-30 text-scout-900 font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Next Step <ArrowRight size={20}/></>}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 text-scout-accent border-2 border-scout-accent/30">
                                <Sparkles size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Activate Lead Magnet</h2>
                            <p className="text-gray-400 text-sm mt-2">Every elite scout needs a link in their Instagram bio. <br/>Players submit details, AI evaluates, you approve.</p>
                        </div>

                        <div className="bg-scout-900 p-6 rounded-[2rem] border border-scout-700">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 bg-scout-800 rounded-lg flex items-center justify-center text-blue-400"><ShieldCheck size={24}/></div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Smart Apply Link</h4>
                                    <p className="text-[10px] text-gray-500 uppercase font-black">warubi.com/apply/<span className="text-scout-accent">your-unique-id</span></p>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "Automated evaluations on arrival",
                                    "Direct Parent contact collection",
                                    "Pipeline integration"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                        <Check size={14} className="text-scout-accent" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={handleComplete}
                            disabled={loading}
                            className="w-full bg-white hover:bg-gray-100 text-scout-900 font-black py-5 rounded-2xl transition-all shadow-2xl active:scale-95 uppercase tracking-wide flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><BrainCircuit size={20}/> Generate Intelligence Hub</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
