import React from 'react';
import {
    User, Activity, GraduationCap, Sparkles, Mail, Phone,
    ShieldCheck, Award, Target, Users, SmartphoneIcon,
    Ruler, Globe, Footprints, Video, Brain, ChevronLeft, Loader2,
    Calendar, Flame, Zap
} from 'lucide-react';
import { Player } from '../../types';
import { FormField, ScoutInput, ScoutSelect, AuditSlider, POSITIONS, TEAM_LEVELS, FEET } from './FormComponents';
import { StepIndicator } from './StepIndicator';
import PlayerCard from '../PlayerCard';

interface FormData {
    firstName: string;
    lastName: string;
    position: string;
    secondaryPosition: string;
    dominantFoot: 'Right' | 'Left' | 'Both';
    nationality: string;
    hasEuPassport: boolean;
    dob: string;
    club: string;
    teamLevel: string;
    height: string;
    weight: string;
    pace: number;
    physical: number;
    technical: number;
    tactical: number;
    coachable: number;
    gradYear: string;
    gpa: string;
    satAct: string;
    videoLink: string;
    email: string;
    phone: string;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
}

interface PlayerBuildFormProps {
    buildStep: number;
    setBuildStep: React.Dispatch<React.SetStateAction<number>>;
    formData: FormData;
    handleInputChange: (field: string, value: any) => void;
    draftPlayer: Player;
    loading: boolean;
    editingPlayer: Player | null | undefined;
    onSubmit: () => void;
}

export const PlayerBuildForm: React.FC<PlayerBuildFormProps> = ({
    buildStep,
    setBuildStep,
    formData,
    handleInputChange,
    draftPlayer,
    loading,
    editingPlayer,
    onSubmit,
}) => (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
        <div className="flex-1 p-4 md:p-12 overflow-y-auto custom-scrollbar border-r border-white/5">
            <div className="max-w-xl mx-auto space-y-8 pb-32">
                <StepIndicator currentStep={buildStep} />
                {buildStep === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="First Name" icon={User}><ScoutInput value={formData.firstName} onChange={(e: any) => handleInputChange('firstName', e.target.value)} placeholder="Christopher" /></FormField>
                            <FormField label="Last Name" icon={User}><ScoutInput value={formData.lastName} onChange={(e: any) => handleInputChange('lastName', e.target.value)} placeholder="Griebsch" /></FormField>
                        </div>
                        <FormField label="Date of Birth" icon={Calendar}><ScoutInput value={formData.dob} onChange={(e: any) => handleInputChange('dob', e.target.value)} type="date" /></FormField>
                        <div className="pt-2 border-t border-scout-700/50 space-y-6">
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2"><SmartphoneIcon size={12} /> PLAYER CONTACT</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Player Email" icon={Mail}><ScoutInput value={formData.email} onChange={(e: any) => handleInputChange('email', e.target.value)} placeholder="player@email.com" /></FormField>
                                <FormField label="Player Phone" icon={Phone}><ScoutInput value={formData.phone} onChange={(e: any) => handleInputChange('phone', e.target.value)} placeholder="+1..." /></FormField>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-scout-700/50 space-y-6">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={12} /> REACHABILITY FIRST (Parent Contact)</h4>
                            <FormField label="Parent Name"><ScoutInput value={formData.parentName} onChange={(e: any) => handleInputChange('parentName', e.target.value)} placeholder="Guardian Name" /></FormField>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Parent Email" icon={Mail}><ScoutInput value={formData.parentEmail} onChange={(e: any) => handleInputChange('parentEmail', e.target.value)} placeholder="guardian@email.com" /></FormField>
                                <FormField label="Parent Phone" icon={Phone}><ScoutInput value={formData.parentPhone} onChange={(e: any) => handleInputChange('parentPhone', e.target.value)} placeholder="+1..." /></FormField>
                            </div>
                        </div>
                    </div>
                )}
                {buildStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <FormField label="Primary Position" icon={Target}><ScoutSelect options={POSITIONS} value={formData.position} onChange={(e: any) => handleInputChange('position', e.target.value)} /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Current Club" icon={ShieldCheck}><ScoutInput value={formData.club} onChange={(e: any) => handleInputChange('club', e.target.value)} placeholder="FC Dallas" /></FormField>
                            <FormField label="Level" icon={Award}><ScoutSelect options={TEAM_LEVELS} value={formData.teamLevel} onChange={(e: any) => handleInputChange('teamLevel', e.target.value)} /></FormField>
                        </div>
                        <FormField label="Nationality" icon={Globe}><ScoutInput value={formData.nationality} onChange={(e: any) => handleInputChange('nationality', e.target.value)} placeholder="USA" /></FormField>
                        <FormField label="Dominant Foot" icon={Footprints}><ScoutSelect options={FEET} value={formData.dominantFoot} onChange={(e: any) => handleInputChange('dominantFoot', e.target.value)} /></FormField>
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
                                <FormField label="HS Grad Year"><ScoutInput value={formData.gradYear} onChange={(e: any) => handleInputChange('gradYear', e.target.value)} placeholder="2026" /></FormField>
                                <FormField label="Current GPA"><ScoutInput value={formData.gpa} onChange={(e: any) => handleInputChange('gpa', e.target.value)} placeholder="3.8" /></FormField>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-scout-highlight uppercase tracking-[0.2em] flex items-center gap-2"><Video size={14} /> Video Evidence</h4>
                            <FormField label="Highlight Link" icon={Video}><ScoutInput value={formData.videoLink} onChange={(e: any) => handleInputChange('videoLink', e.target.value)} placeholder="YouTube/Hudl URL" /></FormField>
                            <div className="p-4 rounded-xl bg-scout-accent/5 border border-scout-accent/20 text-scout-accent text-[10px] font-black uppercase flex items-center gap-3">
                                <Sparkles size={16} className="shrink-0" />
                                <span>AI scanning will prioritize highlight tags matching audit scores.</span>
                            </div>
                        </div>
                    </div>
                )}
                {/* Mobile navigation buttons */}
                <div className="flex md:hidden gap-3 pt-4 border-t border-scout-700/50">
                    {buildStep > 1 && <button onClick={() => setBuildStep(prev => prev - 1)} className="px-5 py-4 bg-scout-800 border border-scout-700 rounded-2xl text-gray-400 hover:text-white transition-all"><ChevronLeft size={24} /></button>}
                    <button onClick={onSubmit} disabled={loading} className="flex-1 py-4 bg-scout-700 hover:bg-scout-600 text-white font-black rounded-2xl shadow-xl transition-all">{loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Quick Save'}</button>
                    {buildStep < 4 ? <button onClick={() => setBuildStep(prev => prev + 1)} className="flex-[1.5] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl transition-all shadow-glow">Next Step</button> : <button onClick={onSubmit} disabled={loading} className="flex-[1.5] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl transition-all shadow-glow">{loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : editingPlayer ? 'Confirm Update' : 'Confirm & Add'}</button>}
                </div>
            </div>
        </div>

        <div className="hidden md:flex w-[440px] bg-black/30 p-10 flex-col gap-8 relative overflow-hidden shrink-0">
            <PlayerCard player={draftPlayer} isReference={true} />
            <div className="mt-auto flex gap-3">
                {buildStep > 1 && <button onClick={() => setBuildStep(prev => prev - 1)} className="px-5 py-4 bg-scout-800 border border-scout-700 rounded-2xl text-gray-400 hover:text-white transition-all"><ChevronLeft size={24} /></button>}
                <button onClick={onSubmit} disabled={loading} className="flex-1 py-4 bg-scout-700 hover:bg-scout-600 text-white font-black rounded-2xl shadow-xl transition-all">{loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Quick Save'}</button>
                {buildStep < 4 ? <button onClick={() => setBuildStep(prev => prev + 1)} className="flex-[1.5] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl transition-all shadow-glow">Next Step</button> : <button onClick={onSubmit} disabled={loading} className="flex-[1.5] py-4 bg-scout-accent text-scout-900 font-black rounded-2xl transition-all shadow-glow">{loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : editingPlayer ? 'Confirm Update' : 'Confirm & Add'}</button>}
            </div>
        </div>
    </div>
);
