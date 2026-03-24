import React, { useState } from 'react';
import { UserProfile, Player, ScoutingEvent } from '../types';
import { Loader2, User, ArrowRight, BrainCircuit, ShieldCheck, Sparkles, MapPin, Check, GraduationCap, Shield, Briefcase, Users, LogOut } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface OnboardingProps {
    onComplete: (profile: UserProfile, initialPlayers: Player[], initialEvents: ScoutingEvent[]) => void;
    approvedScoutInfo?: { isAdmin: boolean; name?: string; region?: string } | null;
}

const ROLES = [
    { id: 'club', label: 'Club Coach', icon: <Shield size={20}/>, desc: 'I coach a team and want to get my players seen' },
    { id: 'regional', label: 'Scout', icon: <Users size={20}/>, desc: 'I find talent in my region and build a pipeline' },
    { id: 'college', label: 'College Coach', icon: <GraduationCap size={20}/>, desc: 'I recruit players for my college program' },
    { id: 'agent', label: 'Agent', icon: <Briefcase size={20}/>, desc: 'I represent players professionally' },
    { id: 'tournament', label: 'Event Director', icon: <ShieldCheck size={20}/>, desc: 'I organize showcases and ID events' },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, approvedScoutInfo }) => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signOut } = useAuthContext();

    const isAdmin = approvedScoutInfo?.isAdmin || false;

    const [name, setName] = useState(approvedScoutInfo?.name || '');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [region, setRegion] = useState(approvedScoutInfo?.region || '');

    const handleBackToLogin = async () => {
        await signOut();
    };

    const handleComplete = async () => {
        setLoading(true);
        setError(null);
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

            await onComplete(user, [], []);
            // If we get here without error, the save worked
        } catch (e) {
            console.error('Onboarding error:', e);
            setError(e instanceof Error ? e.message : 'Failed to complete setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#05080f]">
            <div className="max-w-xl w-full bg-scout-800 border border-scout-700 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">

                {step === 0 && (
                    <div className="space-y-8 animate-fade-in text-center">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                                Scout<span className="text-scout-accent">Buddy</span>
                            </h1>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Get your players in front of 200+ US college programs and European academies like FC Köln's ITP.
                            </p>
                        </div>

                        <div className="space-y-3 text-left">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">How it works</p>
                            {[
                                { num: '1', text: 'Add players or share your link — they complete a free career analysis' },
                                { num: '2', text: 'AI evaluates talent and collects parent contacts automatically' },
                                { num: '3', text: 'You manage the pipeline and connect players to real opportunities' },
                            ].map(({ num, text }) => (
                                <div key={num} className="flex items-center gap-4 bg-scout-900 p-4 rounded-xl border border-scout-700">
                                    <div className="w-8 h-8 bg-scout-accent text-scout-900 rounded-lg flex items-center justify-center font-black text-sm shrink-0">{num}</div>
                                    <p className="text-sm text-gray-300">{text}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full bg-scout-accent hover:bg-emerald-600 text-scout-900 font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-sm"
                        >
                            Get Started <ArrowRight size={20}/>
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
                            <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Scout<span className="text-scout-accent">Buddy</span></h1>
                            <p className="text-gray-400 font-medium">Set up your profile</p>
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
                                    placeholder="Your Region (e.g. Texas, Bavaria)"
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-1">What best describes you?</p>
                            <div className="grid grid-cols-1 gap-2">
                                {ROLES.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRoles([role.id])}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                            selectedRoles.includes(role.id)
                                            ? 'bg-scout-accent/10 border-scout-accent text-white'
                                            : 'bg-scout-900 border-scout-700 text-gray-500 hover:border-scout-600'
                                        }`}
                                    >
                                        <div className={selectedRoles.includes(role.id) ? 'text-scout-accent' : 'text-gray-600'}>{role.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-bold block">{role.label}</span>
                                            <span className="text-[10px] text-gray-500">{role.desc}</span>
                                        </div>
                                        {selectedRoles.includes(role.id) && <Check size={16} className="text-scout-accent shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!name || !region || selectedRoles.length === 0 || loading}
                            className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-30 text-scout-900 font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Next <ArrowRight size={20}/></>}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 text-scout-accent border-2 border-scout-accent/30">
                                <Sparkles size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Your ExposureEngine Link</h2>
                            <p className="text-gray-400 text-sm mt-2">Share this link anywhere — Instagram bio, WhatsApp, coaches. <br/>Players get a free career analysis, you get qualified leads.</p>
                        </div>

                        <div className="bg-scout-900 p-6 rounded-[2rem] border border-scout-700">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 bg-scout-800 rounded-lg flex items-center justify-center text-blue-400"><ShieldCheck size={24}/></div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">ExposureEngine — Free Career Analysis</h4>
                                    <p className="text-[10px] text-gray-500 uppercase font-black">app.warubi-sports.com?ref=<span className="text-scout-accent">you</span></p>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "AI evaluates every player automatically",
                                    "Parent contact info collected",
                                    "Players land directly in your pipeline"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                        <Check size={14} className="text-scout-accent" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleComplete}
                            disabled={loading}
                            className="w-full bg-white hover:bg-gray-100 text-scout-900 font-black py-5 rounded-2xl transition-all shadow-2xl active:scale-95 uppercase tracking-wide flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><BrainCircuit size={20}/> Launch Scout Buddy</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
