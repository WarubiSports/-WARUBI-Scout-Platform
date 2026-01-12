
import React, { useState, useEffect, useRef } from 'react';
import {
    X, CheckCircle, Loader2, User, Activity, GraduationCap, Sparkles, Mail, Phone, Save,
    ChevronRight, Wand2, ArrowLeft, ShieldCheck, Award, Target, Users, Smartphone, Keyboard,
    Ruler, Weight, Calendar, Globe, Footprints, Video, Plus, MessageSquare, ChevronLeft, SmartphoneIcon,
    Flame, Zap, Brain, FileUp, Link, ArrowRight, Check, Trash2
} from 'lucide-react';
import { evaluatePlayer, parsePlayerDetails, checkPlayerDuplicates, extractPlayersFromBulkData } from '../services/geminiService';
import { Player, PlayerStatus, PlayerEvaluation } from '../types';
import PlayerCard from './PlayerCard';
import { handleMobileFocus } from '../hooks/useMobileFeatures';

interface PlayerSubmissionProps {
    onClose: () => void;
    onAddPlayer: (player: Player) => void;
    onUpdatePlayer?: (player: Player) => void;
    existingPlayers: Player[];
    editingPlayer?: Player | null;
}

type SubmissionMode = 'HUB' | 'SCANNING' | 'BUILD' | 'FIELD' | 'BULK';

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
const TEAM_LEVELS = ["MLS Next", "ECNL", "GA", "High School Varsity", "NPL", "Regional", "International Academy"];
const FEET = ["Right", "Left", "Both"];

const PlayerSubmission: React.FC<PlayerSubmissionProps> = ({ onClose, onAddPlayer, onUpdatePlayer, existingPlayers, editingPlayer }) => {
    const [mode, setMode] = useState<SubmissionMode>(editingPlayer ? 'BUILD' : 'HUB');
    const [buildStep, setBuildStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fieldInput, setFieldInput] = useState('');
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddLoading, setQuickAddLoading] = useState(false);

    // Bulk import state
    const [rosterUrl, setRosterUrl] = useState('');
    const [bulkPlayers, setBulkPlayers] = useState<Partial<Player>[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        position: 'CM',
        secondaryPosition: '',
        dominantFoot: 'Right' as 'Right' | 'Left' | 'Both',
        nationality: '',
        hasEuPassport: false,
        dob: '',
        club: '',
        teamLevel: 'ECNL',
        height: '',
        weight: '',
        // Traits
        pace: 50,
        physical: 50,
        technical: 50,
        tactical: 50,
        coachable: 50,
        gradYear: '',
        gpa: '',
        satAct: '',
        videoLink: '',
        email: '',
        phone: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
    });

    const [evalResult, setEvalResult] = useState<PlayerEvaluation | null>(editingPlayer?.evaluation || null);

    useEffect(() => {
        if (editingPlayer) {
            const names = editingPlayer.name.split(' ');
            setFormData({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                position: editingPlayer.position || 'CM',
                secondaryPosition: editingPlayer.secondaryPosition || '',
                dominantFoot: editingPlayer.dominantFoot || 'Right',
                nationality: editingPlayer.nationality || '',
                hasEuPassport: editingPlayer.hasEuPassport || false,
                dob: '',
                club: editingPlayer.club || '',
                teamLevel: editingPlayer.teamLevel || 'ECNL',
                height: editingPlayer.height || '',
                weight: editingPlayer.weight || '',
                pace: editingPlayer.pace || 50,
                physical: editingPlayer.physical || 50,
                technical: editingPlayer.technical || 50,
                tactical: editingPlayer.tactical || 50,
                coachable: editingPlayer.coachable || 50,
                gradYear: editingPlayer.gradYear || '',
                gpa: editingPlayer.gpa || '',
                satAct: editingPlayer.satAct || '',
                videoLink: editingPlayer.videoLink || '',
                email: editingPlayer.email || '',
                phone: editingPlayer.phone || '',
                parentName: editingPlayer.parentName || '',
                parentEmail: editingPlayer.parentEmail || '',
                parentPhone: editingPlayer.parentPhone || '',
            });
        }
    }, [editingPlayer]);

    const draftPlayer: Player = {
        id: editingPlayer?.id || 'draft',
        name: `${formData.firstName} ${formData.lastName}`.trim() || 'Unnamed Prospect',
        age: formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : (editingPlayer?.age || 17),
        position: formData.position,
        secondaryPosition: formData.secondaryPosition,
        dominantFoot: formData.dominantFoot,
        nationality: formData.nationality,
        hasEuPassport: formData.hasEuPassport,
        height: formData.height,
        weight: formData.weight,
        pace: formData.pace,
        physical: formData.physical,
        technical: formData.technical,
        tactical: formData.tactical,
        coachable: formData.coachable,
        status: editingPlayer?.status || PlayerStatus.LEAD,
        email: formData.email,
        phone: formData.phone,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        gpa: formData.gpa,
        gradYear: formData.gradYear,
        satAct: formData.satAct,
        videoLink: formData.videoLink,
        club: formData.club,
        teamLevel: formData.teamLevel,
        submittedAt: editingPlayer?.submittedAt || new Date().toISOString(),
        outreachLogs: editingPlayer?.outreachLogs || [],
        notes: editingPlayer?.notes || '',
        evaluation: evalResult,
        activityStatus: editingPlayer?.activityStatus,
        lastActive: editingPlayer?.lastActive,
        lastContactedAt: editingPlayer?.lastContactedAt,
        previousScore: editingPlayer?.evaluation?.score
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const startAiMagic = async (data: string) => {
        setLoading(true);
        setMode('SCANNING');
        try {
            const result = await evaluatePlayer(data, false);
            const parsed = await parsePlayerDetails(data);
            if (parsed) {
                setFormData(prev => ({ ...prev, ...parsed }));
            }
            setEvalResult(result);
            setMode('BUILD');
            setBuildStep(1);
        } catch (e) {
            setMode('BUILD');
            setBuildStep(1);
        } finally {
            setLoading(false);
        }
    };

    // Bulk import handlers
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target?.result as string;
                const prospects = await extractPlayersFromBulkData(content, file.type.includes('image'));
                setBulkPlayers(prospects);
                setLoading(false);
            };

            if (file.type.includes('image')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            setLoading(false);
        }
    };

    const handleRosterUrlExtract = async () => {
        if (!rosterUrl.trim()) return;
        setLoading(true);
        try {
            const prospects = await extractPlayersFromBulkData(`Extract from this roster URL: ${rosterUrl}`, false);
            setBulkPlayers(prospects);
        } catch (error) {
            console.error('Error extracting from URL:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAllBulk = async () => {
        setLoading(true);

        try {
            // Add players sequentially to avoid race conditions
            for (let idx = 0; idx < bulkPlayers.length; idx++) {
                const p = bulkPlayers[idx];
                const player: Player = {
                    id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: p.name || 'Unknown',
                    age: p.age || 17,
                    position: p.position || 'CM',
                    status: PlayerStatus.LEAD,
                    submittedAt: new Date().toISOString(),
                    outreachLogs: [],
                    ...p
                };
                await onAddPlayer(player);
                // Small delay to ensure DB writes don't overlap
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            onClose();
        } catch (error) {
            console.error('Error adding bulk players:', error);
            alert('Error adding some players. Please try again.');
            setLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const fakeEvent = { target: { files: [file] } } as any;
            handleFileUpload(fakeEvent);
        }
    };

    const handleFinalSubmit = async () => {
        if (!formData.firstName && !formData.lastName) return;
        if (editingPlayer && onUpdatePlayer) {
            onUpdatePlayer({ ...draftPlayer });
        } else {
            onAddPlayer({ ...draftPlayer, id: Date.now().toString() });
        }
        onClose();
    };

    const FormField = ({ label, icon: Icon, children }: any) => (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                {Icon && <Icon size={10} className="text-scout-accent" />} {label}
            </label>
            {children}
        </div>
    );

    const Input = (props: any) => (
        <input
            {...props}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                handleMobileFocus(e);
                props.onFocus?.(e);
            }}
            className="w-full bg-scout-800 border-2 border-scout-700 rounded-xl px-4 py-3 text-white focus:border-scout-accent outline-none font-bold placeholder-gray-600 transition-all"
        />
    );

    const Select = ({ options, ...props }: any) => (
        <select
            {...props}
            className="w-full bg-scout-800 border-2 border-scout-700 rounded-xl px-4 py-3 text-white focus:border-scout-accent outline-none font-bold appearance-none transition-all"
        >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    );

    const AuditSlider = ({ label, value, onChange, icon: Icon }: any) => {
        const getTrackColor = (val: number) => {
            if (val >= 85) return 'bg-scout-accent';
            if (val >= 70) return 'bg-scout-highlight';
            return 'bg-blue-500';
        };

        return (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-gray-500" />}
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                    </div>
                    <span className={`text-sm font-mono font-black ${value >= 85 ? 'text-scout-accent' : value >= 70 ? 'text-scout-highlight' : 'text-white'}`}>
                        {value}
                    </span>
                </div>
                <div className="relative h-8 flex items-center">
                    {/* Track background */}
                    <div className="absolute inset-x-0 h-2 bg-scout-700 rounded-full" />
                    {/* Filled track */}
                    <div
                        className={`absolute left-0 h-2 rounded-full transition-all ${getTrackColor(value)}`}
                        style={{ width: `${value}%` }}
                    />
                    {/* Visual Benchmarks */}
                    <div className="absolute left-[70%] top-1 bottom-1 w-px bg-gray-500/50 pointer-events-none" title="College Ready" />
                    <div className="absolute left-[85%] top-1 bottom-1 w-px bg-scout-accent/50 pointer-events-none" title="Pro Prospect" />
                    {/* Range input (invisible but handles interaction) */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {/* Custom thumb */}
                    <div
                        className={`absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all ${getTrackColor(value)}`}
                        style={{ left: `calc(${value}% - 10px)` }}
                    />
                </div>
            </div>
        );
    };

    const StepIndicator = () => (
        <div className="flex gap-1.5 mb-8">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 flex flex-col gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${buildStep >= i ? 'bg-scout-accent' : 'bg-scout-700'}`}></div>
                    <span className={`text-[8px] font-black uppercase text-center ${buildStep === i ? 'text-scout-accent' : 'text-gray-600'}`}>Step {i}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080f]/95 backdrop-blur-xl p-4 animate-fade-in">
            <div className="bg-scout-900 w-full max-w-6xl rounded-[3.5rem] border border-scout-700 shadow-2xl flex flex-col overflow-hidden max-h-[95vh] relative">
                <div className="p-8 flex justify-between items-center border-b border-white/5 bg-scout-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-scout-accent rounded-full flex items-center justify-center text-scout-900 shadow-lg"><Plus size={24} /></div>
                        <div><h2 className="text-xl font-black text-white uppercase tracking-tighter">{editingPlayer ? 'Edit Profile' : 'Add Prospect'}</h2><p className="text-[9px] text-gray-500 font-bold uppercase">Accuracy Mode</p></div>
                    </div>
                    <button onClick={onClose} className="p-3 text-gray-600 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-0">
                    {mode === 'HUB' && (
                        <div className="p-8 md:p-16 animate-fade-in max-w-4xl mx-auto flex flex-col items-center">
                            {/* QUICK ADD - P1: Minimum friction entry */}
                            <div className="w-full mb-10 bg-gradient-to-r from-scout-accent/10 to-emerald-500/5 border-2 border-scout-accent/30 rounded-3xl p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <Zap size={20} className="text-scout-accent" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Quick Add</h3>
                                    <span className="text-[9px] bg-scout-accent/20 text-scout-accent px-2 py-1 rounded-full font-black uppercase">Fastest</span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <input
                                        type="text"
                                        placeholder="Player name"
                                        value={quickAddName}
                                        onChange={(e) => setQuickAddName(e.target.value)}
                                        className="flex-[2] bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                                    />
                                    <select
                                        value={formData.position}
                                        onChange={(e) => handleInputChange('position', e.target.value)}
                                        className="flex-1 bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-scout-accent transition-colors"
                                    >
                                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <button
                                        onClick={async () => {
                                            if (!quickAddName.trim() || quickAddLoading) return;
                                            setQuickAddLoading(true);
                                            const quickPlayer: Player = {
                                                id: `player-${Date.now()}`,
                                                name: quickAddName.trim(),
                                                age: 17,
                                                position: formData.position,
                                                status: PlayerStatus.LEAD,
                                                submittedAt: new Date().toISOString(),
                                                outreachLogs: [],
                                                evaluation: {
                                                    score: 0,
                                                    tier: 'Pending' as const,
                                                    summary: 'Quick add - awaiting full evaluation',
                                                    strengths: [],
                                                    concerns: [],
                                                    collegeProjection: 'To be determined'
                                                }
                                            };
                                            try {
                                                await onAddPlayer(quickPlayer);
                                                onClose();
                                            } catch (error) {
                                                console.error('Quick add failed:', error);
                                                setQuickAddLoading(false);
                                            }
                                        }}
                                        disabled={!quickAddName.trim() || quickAddLoading}
                                        className="px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center gap-2 shadow-glow hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {quickAddLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} {quickAddLoading ? 'Adding...' : 'Add'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-3">Add player now, enrich profile later. Score will be calculated when you add more details.</p>
                            </div>

                            <div className="text-center mb-6">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Or add full details</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                <button onClick={() => setMode('FIELD')} className="group flex flex-col items-center p-8 md:p-10 bg-scout-800 border-2 border-scout-accent/30 rounded-[2.5rem] hover:border-scout-accent transition-all active:scale-95 shadow-2xl">
                                    <Smartphone size={40} className="text-scout-accent mb-3 group-hover:scale-110" />
                                    <h4 className="text-white font-black uppercase text-sm">Field Mode</h4>
                                    <p className="text-gray-500 text-[10px] mt-2 text-center">One-line data tagger</p>
                                </button>
                                <button onClick={() => setMode('BUILD')} className="group flex flex-col items-center p-8 md:p-10 bg-scout-800 border-2 border-scout-700 rounded-[2.5rem] hover:border-white transition-all active:scale-95 shadow-2xl">
                                    <Keyboard size={40} className="text-gray-400 mb-3 group-hover:scale-110" />
                                    <h4 className="text-white font-black uppercase text-sm">Office Mode</h4>
                                    <p className="text-gray-500 text-[10px] mt-2 text-center">Full intelligence build</p>
                                </button>
                                <button onClick={() => setMode('BULK')} className="group flex flex-col items-center p-8 md:p-10 bg-scout-800 border-2 border-orange-500/30 rounded-[2.5rem] hover:border-orange-400 transition-all active:scale-95 shadow-2xl">
                                    <FileUp size={40} className="text-orange-400 mb-3 group-hover:scale-110" />
                                    <h4 className="text-white font-black uppercase text-sm">Bulk Import</h4>
                                    <p className="text-gray-500 text-[10px] mt-2 text-center">Roster file or URL</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'FIELD' && (
                        <div className="p-16 max-w-2xl mx-auto animate-fade-in h-full flex flex-col justify-center">
                            <div className="text-center mb-10"><h3 className="text-3xl font-black text-white uppercase tracking-tighter">Sideline Tagger</h3></div>
                            <div className="bg-scout-800 rounded-[2.5rem] border-2 border-scout-700 p-8 shadow-2xl focus-within:border-scout-accent">
                                <textarea autoFocus value={fieldInput} onChange={e => setFieldInput(e.target.value)} className="w-full bg-transparent border-none text-2xl font-bold text-white placeholder-gray-700 h-40" placeholder="e.g. #9, ST, Leo Silva, Fast, 2026..." />
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setMode('HUB')} className="flex-1 py-5 bg-scout-800 text-gray-400 font-black rounded-2xl">Cancel</button>
                                <button onClick={() => startAiMagic(fieldInput)} disabled={loading || !fieldInput.trim()} className="flex-[2] py-5 bg-scout-accent text-scout-900 font-black rounded-2xl shadow-xl flex items-center justify-center gap-3">
                                    {loading ? <Loader2 className="animate-spin" /> : <><Wand2 size={24} /> Run AI Magic</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'BULK' && (
                        <div className="p-8 md:p-16 animate-fade-in max-w-3xl mx-auto">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bulk Import</h3>
                                <p className="text-gray-500 text-sm mt-2">Add multiple players from a roster file or URL</p>
                            </div>

                            {bulkPlayers.length === 0 ? (
                                <div className="space-y-6">
                                    {/* Loading State */}
                                    {loading ? (
                                        <div className="border-2 border-orange-400/30 bg-orange-500/5 rounded-3xl p-12 text-center">
                                            <Loader2 size={48} className="mx-auto text-orange-400 animate-spin mb-4" />
                                            <p className="text-white font-black uppercase text-sm">
                                                AI is extracting players...
                                            </p>
                                            <p className="text-orange-400 text-xs mt-2 animate-pulse">
                                                Working hard - please be patient!
                                            </p>
                                        </div>
                                    ) : (
                                        /* File Upload */
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`cursor-pointer border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                                                isDragging
                                                    ? 'border-orange-400 bg-orange-500/10'
                                                    : 'border-scout-700 hover:border-orange-400/50'
                                            }`}
                                        >
                                            <FileUp size={48} className="mx-auto text-orange-400 mb-4" />
                                            <p className="text-white font-black uppercase text-sm">
                                                {isDragging ? 'Drop File Here' : 'Upload Roster File'}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-2">
                                                Drag & drop or click • Image, PDF, or CSV
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,.pdf,.csv,.txt"
                                        onChange={handleFileUpload}
                                    />

                                    {!loading && (
                                        <>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Or paste a URL</p>
                                            </div>

                                            {/* URL Input */}
                                            <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Link size={20} className="text-gray-500" />
                                                    <span className="text-white font-black uppercase text-xs">Paste Roster Link</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="url"
                                                        placeholder="https://club-soccer.com/u17-roster"
                                                        value={rosterUrl}
                                                        onChange={(e) => setRosterUrl(e.target.value)}
                                                        className="flex-1 bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-orange-400 transition-colors"
                                                    />
                                                    <button
                                                        onClick={handleRosterUrlExtract}
                                                        disabled={!rosterUrl.trim()}
                                                        className="px-6 py-3 bg-orange-500 text-white rounded-xl font-black uppercase text-sm hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        <ArrowRight size={18} />
                                                        Extract
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-3">AI will scan the page for player names and details</p>
                                            </div>

                                            <button
                                                onClick={() => setMode('HUB')}
                                                className="w-full py-4 bg-scout-800 text-gray-400 font-black rounded-2xl hover:text-white transition-colors"
                                            >
                                                ← Back
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Results Preview */}
                                    <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Check size={20} className="text-scout-accent" />
                                                <span className="text-white font-black uppercase text-xs">{bulkPlayers.length} Players Found</span>
                                            </div>
                                            <button
                                                onClick={() => setBulkPlayers([])}
                                                className="text-gray-500 hover:text-white text-xs font-bold"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                                            {bulkPlayers.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-scout-900 rounded-xl px-4 py-3 group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-scout-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                                            {p.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-sm">{p.name || 'Unknown'}</p>
                                                            <p className="text-gray-500 text-[10px]">{p.position || 'CM'} • {p.age || 17}yo</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setBulkPlayers(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Remove player"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setBulkPlayers([])}
                                            className="flex-1 py-4 bg-scout-800 text-gray-400 font-black rounded-2xl hover:text-white transition-colors"
                                        >
                                            Start Over
                                        </button>
                                        <button
                                            onClick={handleAddAllBulk}
                                            disabled={loading || bulkPlayers.length === 0}
                                            className="flex-[2] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl shadow-glow hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                                        >
                                            {loading ? (
                                                <><Loader2 size={20} className="animate-spin" /> Adding players...</>
                                            ) : (
                                                <><Plus size={20} /> Add All {bulkPlayers.length} Players</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'SCANNING' && (
                        <div className="p-24 text-center space-y-8 animate-fade-in h-full flex flex-col justify-center items-center">
                            <Loader2 size={64} className="text-scout-accent animate-spin" />
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">AI Structuring...</h3>
                        </div>
                    )}

                    {mode === 'BUILD' && (
                        <div className="flex flex-col md:flex-row h-full overflow-hidden">
                            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar border-r border-white/5">
                                <div className="max-w-xl mx-auto space-y-8 pb-32">
                                    <StepIndicator />
                                    {buildStep === 1 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="First Name" icon={User}><Input value={formData.firstName} onChange={(e: any) => handleInputChange('firstName', e.target.value)} placeholder="Christopher" /></FormField>
                                                <FormField label="Last Name" icon={User}><Input value={formData.lastName} onChange={(e: any) => handleInputChange('lastName', e.target.value)} placeholder="Griebsch" /></FormField>
                                            </div>
                                            <div className="pt-2 border-t border-scout-700/50 space-y-6">
                                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2"><SmartphoneIcon size={12} /> PLAYER CONTACT</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="Player Email" icon={Mail}><Input value={formData.email} onChange={(e: any) => handleInputChange('email', e.target.value)} placeholder="player@email.com" /></FormField>
                                                    <FormField label="Player Phone" icon={Phone}><Input value={formData.phone} onChange={(e: any) => handleInputChange('phone', e.target.value)} placeholder="+1..." /></FormField>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-scout-700/50 space-y-6">
                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={12} /> REACHABILITY FIRST (Parent Contact)</h4>
                                                <FormField label="Parent Name"><Input value={formData.parentName} onChange={(e: any) => handleInputChange('parentName', e.target.value)} placeholder="Guardian Name" /></FormField>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="Parent Email" icon={Mail}><Input value={formData.parentEmail} onChange={(e: any) => handleInputChange('parentEmail', e.target.value)} placeholder="guardian@email.com" /></FormField>
                                                    <FormField label="Parent Phone" icon={Phone}><Input value={formData.parentPhone} onChange={(e: any) => handleInputChange('parentPhone', e.target.value)} placeholder="+1..." /></FormField>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {buildStep === 2 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <FormField label="Primary Position" icon={Target}><Select options={POSITIONS} value={formData.position} onChange={(e: any) => handleInputChange('position', e.target.value)} /></FormField>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Current Club" icon={ShieldCheck}><Input value={formData.club} onChange={(e: any) => handleInputChange('club', e.target.value)} placeholder="FC Dallas" /></FormField>
                                                <FormField label="Level" icon={Award}><Select options={TEAM_LEVELS} value={formData.teamLevel} onChange={(e: any) => handleInputChange('teamLevel', e.target.value)} /></FormField>
                                            </div>
                                            <FormField label="Dominant Foot" icon={Footprints}><Select options={FEET} value={formData.dominantFoot} onChange={(e: any) => handleInputChange('dominantFoot', e.target.value)} /></FormField>
                                        </div>
                                    )}
                                    {buildStep === 3 && (
                                        <div className="space-y-10 animate-fade-in">
                                            <div className="bg-scout-800/40 p-6 rounded-3xl border border-white/5 space-y-6">
                                                <h4 className="text-[10px] font-black text-scout-highlight uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Ruler size={14} /> Physical Signature</h4>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="bg-scout-900 border border-scout-700 rounded-2xl p-4 shadow-inner">
                                                        <label className="block text-[8px] font-black text-gray-500 uppercase mb-2">Height (ft/in)</label>
                                                        <input value={formData.height} onChange={(e) => handleInputChange('height', e.target.value)} className="bg-transparent text-xl font-bold text-white outline-none w-full" placeholder="6&apos;1&quot;" />
                                                    </div>
                                                    <div className="bg-scout-900 border border-scout-700 rounded-2xl p-4 shadow-inner">
                                                        <label className="block text-[8px] font-black text-gray-500 uppercase mb-2">Weight (lbs)</label>
                                                        <input value={formData.weight} onChange={(e) => handleInputChange('weight', e.target.value)} className="bg-transparent text-xl font-bold text-white outline-none w-full" placeholder="180 lbs" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <h4 className="text-[10px] font-black text-scout-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Zap size={14} /> Sideline Performance Audit</h4>

                                                <div className="grid gap-8">
                                                    <AuditSlider label="Pace / Acceleration" value={formData.pace} onChange={(val: number) => handleInputChange('pace', val)} icon={Flame} />
                                                    <AuditSlider label="Physical Strength" value={formData.physical} onChange={(val: number) => handleInputChange('physical', val)} icon={Activity} />
                                                    <AuditSlider label="Technical Precision" value={formData.technical} onChange={(val: number) => handleInputChange('technical', val)} icon={Target} />
                                                    <AuditSlider label="Tactical Intelligence" value={formData.tactical} onChange={(val: number) => handleInputChange('tactical', val)} icon={Brain} />
                                                    <AuditSlider label="Coachability" value={formData.coachable} onChange={(val: number) => handleInputChange('coachable', val)} icon={Users} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {buildStep === 4 && (
                                        <div className="space-y-8 animate-fade-in">
                                            <div className="bg-scout-800/40 p-6 rounded-3xl border border-white/5 space-y-6">
                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><GraduationCap size={14} /> Academic Profile</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="HS Grad Year"><Input value={formData.gradYear} onChange={(e: any) => handleInputChange('gradYear', e.target.value)} placeholder="2026" /></FormField>
                                                    <FormField label="Current GPA"><Input value={formData.gpa} onChange={(e: any) => handleInputChange('gpa', e.target.value)} placeholder="3.8" /></FormField>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black text-scout-highlight uppercase tracking-[0.2em] flex items-center gap-2"><Video size={14} /> Video Evidence</h4>
                                                <FormField label="Highlight Link" icon={Video}><Input value={formData.videoLink} onChange={(e: any) => handleInputChange('videoLink', e.target.value)} placeholder="YouTube/Hudl URL" /></FormField>
                                                <div className="p-4 rounded-xl bg-scout-accent/5 border border-scout-accent/20 text-scout-accent text-[10px] font-black uppercase flex items-center gap-3">
                                                    <Sparkles size={16} className="shrink-0" />
                                                    <span>AI scanning will prioritize highlight tags matching audit scores.</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hidden md:flex w-[440px] bg-black/30 p-10 flex-col gap-8 relative overflow-hidden shrink-0">
                                <PlayerCard player={draftPlayer} isReference={true} />
                                <div className="mt-auto flex gap-3">
                                    {buildStep > 1 && <button onClick={() => setBuildStep(prev => prev - 1)} className="px-5 py-4 bg-scout-800 border border-scout-700 rounded-2xl text-gray-400 hover:text-white transition-all"><ChevronLeft size={24} /></button>}
                                    <button onClick={handleFinalSubmit} className="flex-1 py-4 bg-scout-700 hover:bg-scout-600 text-white font-black rounded-2xl shadow-xl transition-all">Quick Save</button>
                                    {buildStep < 4 ? <button onClick={() => setBuildStep(prev => prev + 1)} className="flex-[1.5] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl transition-all shadow-glow">Next Step</button> : <button onClick={handleFinalSubmit} className="flex-[1.5] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl transition-all shadow-glow">{editingPlayer ? 'Confirm Update' : 'Confirm & Add'}</button>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerSubmission;