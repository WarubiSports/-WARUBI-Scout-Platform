
import React, { useState } from 'react';
import { UserProfile, Player, PlayerStatus } from '../types';
import { evaluatePlayer, generateOnboardingData } from '../services/geminiService';
import { Loader2, Upload, User, ArrowRight, CheckCircle2, FlaskConical, LayoutDashboard } from 'lucide-react';

interface OnboardingProps {
    onComplete: (profile: UserProfile, firstPlayer: Player | null) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Step 1 State
    const [name, setName] = useState('');
    const [role, setRole] = useState('Coach');
    const [region, setRegion] = useState('');

    // Step 2 State
    const [playerInput, setPlayerInput] = useState('');
    const [playerImage, setPlayerImage] = useState<string | null>(null);
    const [playerMimeType, setPlayerMimeType] = useState('image/jpeg');

    // Step 3 State
    const [aiEvaluation, setAiEvaluation] = useState<any>(null);
    const [generatedTasks, setGeneratedTasks] = useState<string[]>([]);
    const [welcomeMessage, setWelcomeMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data URL prefix for API
                const base64Data = base64String.split(',')[1]; 
                setPlayerImage(base64Data);
                setPlayerMimeType(file.type);
            };
            reader.readAsDataURL(file);
        }
    };

    const submitProfile = async () => {
        if (!name || !region) return;
        setLoading(true);
        try {
            // Generate personalization data here so it's available even if they skip step 2
            const personalization = await generateOnboardingData(role, region);
            setGeneratedTasks(personalization.tasks);
            setWelcomeMessage(personalization.welcomeMessage);
            setStep(2);
        } catch (e) {
            console.error("Error generating profile data", e);
            // Fallback defaults if AI fails
            setGeneratedTasks(["Explore the dashboard", "Review reference players", "Check knowledge base"]);
            setWelcomeMessage("Welcome to the platform!");
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        const user: UserProfile = {
            name, role, region,
            weeklyTasks: generatedTasks,
            scoutId: `scout-${Date.now().toString(36)}`
        };
        // Complete onboarding without a player
        onComplete(user, null);
    };

    const handleDemoLogin = () => {
        const demoUser: UserProfile = {
            name: "Alex Scout (Demo)",
            role: "Head Coach",
            region: "California, USA",
            affiliation: "West Coast Academy",
            weeklyTasks: ["Identify 2 new wingers", "Finalize showcase roster", "Review ITP standards"],
            scoutId: "demo-alex-123"
        };

        const demoPlayer: Player = {
            id: "demo-player-1",
            name: "Lucas Silva",
            age: 17,
            position: "LW",
            status: PlayerStatus.LEAD,
            submittedAt: new Date().toISOString(),
            outreachLogs: [],
            evaluation: {
                score: 82,
                collegeLevel: "D1 Mid-Major",
                scholarshipTier: "Tier 2",
                recommendedPathways: ["College Pathway", "Exposure Events"],
                strengths: ["Pace", "Dribbling", "Crossing"],
                weaknesses: ["Physicality", "Aerial Duels"],
                nextAction: "Request Full Match Video",
                summary: "Exciting winger with great pace, needs to bulk up for the next level."
            }
        };

        onComplete(demoUser, demoPlayer);
    };

    const fillDemoData = () => {
        setPlayerImage(null);
        setPlayerInput(
`Name: Leo "The Architect" Silva
Age: 17
Position: Central Midfielder (CM/CAM)
Club: Metro City Academy U18
Stats: 8 goals, 15 assists in 24 matches.
Attributes: Excellent vision, passing range, and ball control.
Areas for Improvement: Defensive work rate and stamina.
Academics: 3.8 GPA.
Goal: Earn a scholarship to a D1 college.`
        );
    };

    const submitPlayer = async () => {
        if (!playerInput && !playerImage) return;
        setLoading(true);
        try {
            // Evaluate Player
            const isImage = !!playerImage;
            const dataToEval = isImage ? playerImage! : playerInput;
            const evalResult = await evaluatePlayer(dataToEval, isImage, playerMimeType);
            
            setAiEvaluation(evalResult);
            setStep(3);
        } catch (error) {
            console.error(error);
            alert("Error analyzing player. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const finishOnboarding = () => {
        const user: UserProfile = {
            name, role, region,
            weeklyTasks: generatedTasks,
            scoutId: `scout-${Date.now().toString(36)}`
        };
        
        const player: Player = {
            id: Date.now().toString(),
            name: "New Recruit", // AI could extract this, simplified for now
            age: 0,
            position: "Unknown",
            status: PlayerStatus.LEAD,
            submittedAt: new Date().toISOString(),
            outreachLogs: [],
            evaluation: aiEvaluation
        };

        onComplete(user, player);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-scout-900 to-black">
            <div className="max-w-xl w-full bg-scout-800 border border-scout-700 rounded-2xl shadow-2xl p-8">
                
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-scout-accent' : 'bg-scout-700'}`}></div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-white mb-2">Create Scout Profile</h1>
                            <p className="text-gray-400">Tell us a bit about yourself so AI can tailor your experience.</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                                <input 
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="w-full bg-scout-900 border border-scout-700 rounded p-3 text-white focus:border-scout-accent outline-none" 
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                                <select 
                                    value={role} onChange={e => setRole(e.target.value)}
                                    className="w-full bg-scout-900 border border-scout-700 rounded p-3 text-white focus:border-scout-accent outline-none"
                                >
                                    <option>Coach</option>
                                    <option>Player</option>
                                    <option>Agent</option>
                                    <option>Parent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
                                <input 
                                    value={region} onChange={e => setRegion(e.target.value)}
                                    className="w-full bg-scout-900 border border-scout-700 rounded p-3 text-white focus:border-scout-accent outline-none" 
                                    placeholder="e.g. Florida, USA"
                                />
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={submitProfile} 
                                disabled={loading || !name || !region}
                                className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <>Next Step <ArrowRight size={18}/></>}
                            </button>

                            <button 
                                onClick={handleDemoLogin}
                                className="w-full bg-scout-800 hover:bg-scout-700 border border-scout-600 text-gray-300 hover:text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <LayoutDashboard size={18} /> Try Demo Account
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                         <div className="text-center">
                            <h1 className="text-3xl font-bold text-white mb-2">Analyze First Player</h1>
                            <p className="text-gray-400">Upload a screenshot of stats, a roster, or just type notes. AI does the rest.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-scout-700 rounded-xl p-6 text-center hover:border-scout-accent transition-colors">
                                <input type="file" id="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                                    <Upload size={32} className="text-scout-highlight mb-2" />
                                    <span className="text-white font-medium">Upload Screenshot / Photo</span>
                                    <span className="text-xs text-gray-500 mt-1">{playerImage ? 'Image selected' : 'Supports JPG, PNG'}</span>
                                </label>
                            </div>
                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-scout-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-scout-800 text-gray-500">OR</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">Manual Entry</span>
                                    <button 
                                        onClick={fillDemoData}
                                        className="text-xs flex items-center gap-1 text-scout-accent hover:text-white transition-colors"
                                    >
                                        <FlaskConical size={12} />
                                        Use Demo Player Data
                                    </button>
                                </div>
                                <textarea 
                                    value={playerInput} onChange={e => setPlayerInput(e.target.value)}
                                    className="w-full h-32 bg-scout-900 border border-scout-700 rounded p-3 text-white focus:border-scout-accent outline-none resize-none"
                                    placeholder="Paste player details, stats, or notes here..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={submitPlayer} 
                                disabled={loading || (!playerInput && !playerImage)}
                                className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Run AI Analysis'}
                            </button>
                            
                            <button
                                onClick={handleSkip}
                                className="text-gray-500 hover:text-gray-300 text-sm font-medium py-2 transition-colors"
                            >
                                I don't have a player yet, skip for now
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && aiEvaluation && (
                     <div className="space-y-6 animate-fade-in text-center">
                         <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-scout-accent/20 rounded-full flex items-center justify-center mb-4 text-scout-accent">
                                <CheckCircle2 size={40} />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-1">Analysis Complete</h1>
                            <p className="text-scout-highlight italic mb-4">"{welcomeMessage}"</p>
                        </div>

                        <div className="bg-scout-900 p-4 rounded-lg border border-scout-700 text-left">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Recruitability Score</span>
                                <span className="text-2xl font-bold text-white">{aiEvaluation.score}/100</span>
                            </div>
                            <div className="w-full bg-scout-800 h-2 rounded-full mb-4">
                                <div className="bg-scout-accent h-2 rounded-full" style={{width: `${aiEvaluation.score}%`}}></div>
                            </div>
                            <p className="text-sm text-gray-300"><span className="font-bold text-scout-accent">Verdict:</span> {aiEvaluation.summary}</p>
                        </div>

                        <button 
                            onClick={finishOnboarding} 
                            className="w-full bg-white hover:bg-gray-100 text-scout-900 font-bold py-3 rounded-lg transition-all"
                        >
                            Enter Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
