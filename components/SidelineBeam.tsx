
import React, { useState } from 'react';
import { X, QrCode, Share2, Copy, CheckCircle2, MessageCircle, Trophy, GraduationCap, Calculator, ShieldCheck, Smartphone, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { UserProfile } from '../types';

interface SidelineBeamProps {
  user: UserProfile;
  onClose: () => void;
}

const TOOLS = [
    {
        id: 'assessment',
        title: 'Player Assessment',
        hook: 'The AI Evaluator',
        desc: 'Scan to get tiered and benchmarked instantly.',
        icon: <Trophy size={28} />,
        color: 'text-emerald-400',
        link: (scoutId: string) => `warubi-sports.com/apply/${scoutId}?hook=pro`
    },
    {
        id: 'profile',
        title: 'Scout Identity',
        hook: 'Digital VCard',
        desc: 'Verified Warubi Scout credentials and contact.',
        icon: <ShieldCheck size={28} />,
        color: 'text-blue-400',
        link: (scoutId: string) => `warubi-sports.com/scout/${scoutId}`
    },
    {
        id: 'roi',
        title: 'Cost Calculator',
        hook: 'The ROI Proof',
        desc: 'Show parents the math: ITP vs US College Debt.',
        icon: <Calculator size={28} />,
        color: 'text-scout-highlight',
        link: (scoutId: string) => `warubi-sports.com/roi?scout=${scoutId}`
    }
];

const SidelineBeam: React.FC<SidelineBeamProps> = ({ user, onClose }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const currentTool = TOOLS[activeIndex];
    const scoutId = user.scoutId || 'demo';
    const activeLink = currentTool.link(scoutId);

    const handleCopy = () => {
        navigator.clipboard.writeText(activeLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const text = `Hi, I'm ${user.name}. Use this link to start your evaluation: ${activeLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#05080f] flex flex-col animate-fade-in md:hidden">
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-white/5 bg-scout-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-scout-accent/10 rounded-full flex items-center justify-center text-scout-accent border border-scout-accent/20">
                        <Share2 size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Sideline Beam</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Share verified tools</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-600 hover:text-white transition-colors bg-white/5 rounded-full">
                    <X size={24} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
                {/* High Brightness QR Frame */}
                <div className="w-full max-w-[320px] aspect-square bg-white rounded-[3rem] p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] relative group animate-pulse-fast">
                    {/* Corner Brackets */}
                    <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-scout-900 rounded-tl-2xl opacity-20"></div>
                    <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-scout-900 rounded-tr-2xl opacity-20"></div>
                    <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-scout-900 rounded-bl-2xl opacity-20"></div>
                    <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-scout-900 rounded-br-2xl opacity-20"></div>
                    
                    {/* Simulated QR Code with Brand Identity */}
                    <div className="w-full h-full border-2 border-scout-900/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                        <QrCode size={160} className="text-scout-900" strokeWidth={1.5} />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-scout-accent/5 to-transparent"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-lg border-2 border-scout-900 shadow-xl">
                            <h4 className="text-[10px] font-black text-scout-900 tracking-tighter uppercase leading-none">WARUBI</h4>
                        </div>
                    </div>
                    
                    {/* Scanning Label */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-scout-900 text-scout-accent px-4 py-1.5 rounded-full border border-scout-accent/30 font-black text-[10px] uppercase tracking-widest shadow-xl whitespace-nowrap">
                        Ready for Scan
                    </div>
                </div>

                {/* Tool Switcher */}
                <div className="w-full max-w-sm space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <button 
                            onClick={() => setActiveIndex(prev => (prev > 0 ? prev - 1 : TOOLS.length - 1))}
                            className="p-3 bg-scout-800 rounded-2xl border border-scout-700 text-gray-500 active:scale-90"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        
                        <div className="flex-1 text-center animate-fade-in" key={currentTool.id}>
                            <div className={`flex justify-center mb-2 ${currentTool.color}`}>{currentTool.icon}</div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">{currentTool.title}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{currentTool.hook}</p>
                        </div>

                        <button 
                            onClick={() => setActiveIndex(prev => (prev < TOOLS.length - 1 ? prev + 1 : 0))}
                            className="p-3 bg-scout-800 rounded-2xl border border-scout-700 text-gray-500 active:scale-90"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <div className="bg-scout-900/50 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-sm text-gray-400 font-medium leading-relaxed italic">"{currentTool.desc}"</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="w-full max-w-sm grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleShareWhatsApp}
                        className="bg-[#25D366] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all text-xs uppercase"
                    >
                        <MessageCircle size={20} /> WhatsApp
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="bg-white text-scout-900 font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all text-xs uppercase"
                    >
                        {copied ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Copy size={20} />} {copied ? 'Linked' : 'Copy Link'}
                    </button>
                </div>
            </div>

            {/* Footer Help */}
            <div className="p-8 bg-scout-900/80 border-t border-white/5 text-center space-y-4">
                <div className="flex items-center justify-center gap-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-1"><Smartphone size={12}/> High Visibility</div>
                    <div className="flex items-center gap-1"><Info size={12}/> Pro Discovery</div>
                </div>
                <div className="relative w-full h-12 bg-scout-800 rounded-xl border border-scout-700 flex items-center justify-center px-4 overflow-hidden">
                    <span className="text-[10px] font-mono text-scout-accent truncate">{activeLink}</span>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-scout-800 to-transparent"></div>
                </div>
            </div>
        </div>
    );
};

export default SidelineBeam;
