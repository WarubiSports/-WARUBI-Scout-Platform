
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle, Loader2, User, Activity, GraduationCap, Sparkles, Mail, Phone, Save, 
  ChevronRight, Wand2, ArrowLeft, ShieldCheck, Award, Target, Users, Smartphone, Keyboard,
  Ruler, Weight, Calendar, Globe, Footprints, Video, Plus, MessageSquare, ChevronLeft, SmartphoneIcon,
  Flame, Zap, Brain
} from 'lucide-react';
import { evaluatePlayer, parsePlayerDetails, checkPlayerDuplicates } from '../services/geminiService';
import { Player, PlayerStatus, PlayerEvaluation } from '../types';
import PlayerCard from './PlayerCard';

interface PlayerSubmissionProps {
  onClose: () => void;
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer?: (player: Player) => void;
  existingPlayers: Player[];
  editingPlayer?: Player | null;
}

type SubmissionMode = 'HUB' | 'SCANNING' | 'BUILD' | 'FIELD';

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
const TEAM_LEVELS = ["MLS Next", "ECNL", "GA", "High School Varsity", "NPL", "Regional", "International Academy"];
const FEET = ["Right", "Left", "Both"];

const PlayerSubmission: React.FC<PlayerSubmissionProps> = ({ onClose, onAddPlayer, onUpdatePlayer, existingPlayers, editingPlayer }) => {
  const [mode, setMode] = useState<SubmissionMode>(editingPlayer ? 'BUILD' : 'HUB');
  const [buildStep, setBuildStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fieldInput, setFieldInput] = useState('');

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
              position: editingPlayer.position as any,
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
              {Icon && <Icon size={10} className="text-scout-accent"/>} {label}
          </label>
          {children}
      </div>
  );

  const Input = (props: any) => (
      <input 
          {...props} 
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
      const getGlowColor = (val: number) => {
          if (val >= 85) return 'shadow-[0_0_15px_rgba(16,185,129,0.4)]';
          if (val >= 70) return 'shadow-[0_0_10px_rgba(251,191,36,0.3)]';
          return '';
      };

      return (
          <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      {Icon && <Icon size={14} className="text-gray-500" />}
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                  </div>
                  <span className={`text-sm font-mono font-black ${value >= 85 ? 'text-scout-accent' : value >= 70 ? 'text-scout-highlight' : 'text-gray-500'}`}>
                      {value}
                  </span>
              </div>
              <div className="relative h-6 flex items-center">
                  <input 
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => onChange(parseInt(e.target.value))}
                      className={`w-full h-1.5 bg-scout-900 rounded-full appearance-none cursor-pointer accent-scout-accent hover:accent-emerald-400 transition-all ${getGlowColor(value)}`}
                  />
                  {/* Visual Benchmarks */}
                  <div className="absolute left-[70%] top-0 bottom-0 w-px bg-scout-700/50 pointer-events-none" title="College Ready"></div>
                  <div className="absolute left-[85%] top-0 bottom-0 w-px bg-scout-accent/30 pointer-events-none" title="Pro Prospect"></div>
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
          <button onClick={onClose} className="p-3 text-gray-600 hover:text-white transition-colors bg-white/5 rounded-full"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {mode === 'HUB' && (
            <div className="p-16 animate-fade-in max-w-4xl mx-auto flex flex-col items-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <button onClick={() => setMode('FIELD')} className="group flex flex-col items-center p-12 bg-scout-800 border-2 border-scout-accent/30 rounded-[3rem] hover:border-scout-accent transition-all active:scale-95 shadow-2xl">
                        <Smartphone size={48} className="text-scout-accent mb-4 group-hover:scale-110" />
                        <h4 className="text-white font-black uppercase">Field Mode</h4>
                        <p className="text-gray-500 text-xs mt-2 text-center">Fastest entry. One-line data tagger.</p>
                    </button>
                    <button onClick={() => setMode('BUILD')} className="group flex flex-col items-center p-12 bg-scout-800 border-2 border-scout-700 rounded-[3rem] hover:border-white transition-all active:scale-95 shadow-2xl">
                        <Keyboard size={48} className="text-gray-400 mb-4 group-hover:scale-110" />
                        <h4 className="text-white font-black uppercase">Office Mode</h4>
                        <p className="text-gray-500 text-xs mt-2 text-center">Comprehensive intelligence build.</p>
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
                         {loading ? <Loader2 className="animate-spin"/> : <><Wand2 size={24}/> Run AI Magic</>}
                      </button>
                  </div>
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
                                    <FormField label="First Name" icon={User}><Input value={formData.firstName} onChange={(e:any) => handleInputChange('firstName', e.target.value)} placeholder="Christopher" /></FormField>
                                    <FormField label="Last Name" icon={User}><Input value={formData.lastName} onChange={(e:any) => handleInputChange('lastName', e.target.value)} placeholder="Griebsch" /></FormField>
                                </div>
                                <div className="pt-2 border-t border-scout-700/50 space-y-6">
                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2"><SmartphoneIcon size={12}/> PLAYER CONTACT</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Player Email" icon={Mail}><Input value={formData.email} onChange={(e:any) => handleInputChange('email', e.target.value)} placeholder="player@email.com" /></FormField>
                                        <FormField label="Player Phone" icon={Phone}><Input value={formData.phone} onChange={(e:any) => handleInputChange('phone', e.target.value)} placeholder="+1..." /></FormField>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-scout-700/50 space-y-6">
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={12}/> REACHABILITY FIRST (Parent Contact)</h4>
                                    <FormField label="Parent Name"><Input value={formData.parentName} onChange={(e:any) => handleInputChange('parentName', e.target.value)} placeholder="Guardian Name" /></FormField>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Parent Email" icon={Mail}><Input value={formData.parentEmail} onChange={(e:any) => handleInputChange('parentEmail', e.target.value)} placeholder="guardian@email.com" /></FormField>
                                        <FormField label="Parent Phone" icon={Phone}><Input value={formData.parentPhone} onChange={(e:any) => handleInputChange('parentPhone', e.target.value)} placeholder="+1..." /></FormField>
                                    </div>
                                </div>
                            </div>
                        )}
                        {buildStep === 2 && (
                            <div className="space-y-6 animate-fade-in">
                                <FormField label="Primary Position" icon={Target}><Select options={POSITIONS} value={formData.position} onChange={(e:any) => handleInputChange('position', e.target.value)} /></FormField>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Current Club" icon={ShieldCheck}><Input value={formData.club} onChange={(e:any) => handleInputChange('club', e.target.value)} placeholder="FC Dallas" /></FormField>
                                    <FormField label="Level" icon={Award}><Select options={TEAM_LEVELS} value={formData.teamLevel} onChange={(e:any) => handleInputChange('teamLevel', e.target.value)} /></FormField>
                                </div>
                                <FormField label="Dominant Foot" icon={Footprints}><Select options={FEET} value={formData.dominantFoot} onChange={(e:any) => handleInputChange('dominantFoot', e.target.value)} /></FormField>
                            </div>
                        )}
                        {buildStep === 3 && (
                            <div className="space-y-10 animate-fade-in">
                                <div className="bg-scout-800/40 p-6 rounded-3xl border border-white/5 space-y-6">
                                    <h4 className="text-[10px] font-black text-scout-highlight uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Ruler size={14}/> Physical Signature</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-scout-900 border border-scout-700 rounded-2xl p-4 shadow-inner">
                                            <label className="block text-[8px] font-black text-gray-500 uppercase mb-2">Height (ft/in)</label>
                                            <input value={formData.height} onChange={(e) => handleInputChange('height', e.target.value)} className="bg-transparent text-xl font-bold text-white outline-none w-full" placeholder="6'1\"" />
                                        </div>
                                        <div className="bg-scout-900 border border-scout-700 rounded-2xl p-4 shadow-inner">
                                            <label className="block text-[8px] font-black text-gray-500 uppercase mb-2">Weight (lbs)</label>
                                            <input value={formData.weight} onChange={(e) => handleInputChange('weight', e.target.value)} className="bg-transparent text-xl font-bold text-white outline-none w-full" placeholder="180 lbs" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h4 className="text-[10px] font-black text-scout-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Zap size={14}/> Sideline Performance Audit</h4>
                                    
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
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><GraduationCap size={14}/> Academic Profile</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="HS Grad Year"><Input value={formData.gradYear} onChange={(e:any) => handleInputChange('gradYear', e.target.value)} placeholder="2026" /></FormField>
                                        <FormField label="Current GPA"><Input value={formData.gpa} onChange={(e:any) => handleInputChange('gpa', e.target.value)} placeholder="3.8" /></FormField>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-scout-highlight uppercase tracking-[0.2em] flex items-center gap-2"><Video size={14}/> Video Evidence</h4>
                                    <FormField label="Highlight Link" icon={Video}><Input value={formData.videoLink} onChange={(e:any) => handleInputChange('videoLink', e.target.value)} placeholder="YouTube/Hudl URL" /></FormField>
                                    <div className="p-4 rounded-xl bg-scout-accent/5 border border-scout-accent/20 text-scout-accent text-[10px] font-black uppercase flex items-center gap-3">
                                        <Sparkles size={16} className="shrink-0"/>
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
                        {buildStep > 1 && <button onClick={() => setBuildStep(prev => prev - 1)} className="px-5 py-4 bg-scout-800 border border-scout-700 rounded-2xl text-gray-400 hover:text-white transition-all"><ChevronLeft size={24}/></button>}
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