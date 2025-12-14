import React, { useState } from 'react';
import { X, Upload, CheckCircle, Loader2, FlaskConical, User, Calendar, Activity, GraduationCap, ClipboardPaste, Sparkles, Mail, Phone, Save, AlertCircle } from 'lucide-react';
import { evaluatePlayer, parsePlayerDetails } from '../services/geminiService';
import { Player, PlayerStatus, PlayerEvaluation } from '../types';

interface PlayerSubmissionProps {
  onClose: () => void;
  onAddPlayer: (player: Player) => void;
}

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
const TEAM_LEVELS = ["Professional Academy", "Elite National (MLS Next/ECNL/GA)", "Regional (NPL/RL)", "High School Varsity", "District/Local", "Recreational"];
const RATINGS = ["Elite", "Top 10%", "Above Average", "Average", "Below Average"];

const PlayerSubmission: React.FC<PlayerSubmissionProps> = ({ onClose, onAddPlayer }) => {
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  // Single Player Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    gradYear: '',
    dob: '',
    region: '',
    nationality: 'USA',
    heightFt: '',
    heightIn: '',
    foot: 'Right',
    position: 'CM',
    secondaryPosition: '',
    club: '',
    teamLevel: 'Elite National (MLS Next/ECNL/GA)',
    gpa: '',
    testScore: '',
    email: '',
    phone: '',
    parentEmail: '',
    ratings: {
      speed: 'Above Average',
      strength: 'Above Average',
      endurance: 'Above Average',
      workRate: 'Above Average',
      technical: 'Above Average',
      tactical: 'Above Average'
    }
  });

  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [evalResult, setEvalResult] = useState<PlayerEvaluation | null>(null);
  const [pasteInput, setPasteInput] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRatingChange = (rating: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [rating]: value }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            setImage(base64Data);
            setMimeType(file.type);
        };
        reader.readAsDataURL(file);
    }
  };

  const fillDemoData = () => {
    setImage(null);
    setFormData({
      firstName: 'Marco',
      lastName: 'Rossi',
      gender: 'Male',
      gradYear: '2025',
      dob: '2006-05-15',
      region: 'New Jersey',
      nationality: 'Italy / USA',
      heightFt: '5',
      heightIn: '10',
      foot: 'Right',
      position: 'RB',
      secondaryPosition: 'RWB',
      club: 'East Coast Elite Academy',
      teamLevel: 'Elite National (MLS Next/ECNL/GA)',
      gpa: '3.6',
      testScore: '1250 SAT',
      email: 'marco.rossi@example.com',
      phone: '555-0123',
      parentEmail: 'mario.rossi@example.com',
      ratings: {
        speed: 'Elite',
        strength: 'Average',
        endurance: 'Top 10%',
        workRate: 'Top 10%',
        technical: 'Above Average',
        tactical: 'Above Average'
      }
    });
  };

  const handleAutoFill = async () => {
      if (!pasteInput.trim()) return;
      setParsing(true);
      try {
          const parsed = await parsePlayerDetails(pasteInput);
          if (parsed) {
              setFormData(prev => ({
                  ...prev,
                  firstName: parsed.firstName || prev.firstName,
                  lastName: parsed.lastName || prev.lastName,
                  email: parsed.email || prev.email,
                  phone: parsed.phone || prev.phone,
                  parentEmail: parsed.parentEmail || prev.parentEmail,
                  position: parsed.position || prev.position,
                  dob: parsed.dob || prev.dob,
                  gradYear: parsed.gradYear || prev.gradYear,
                  club: parsed.club || prev.club,
                  teamLevel: parsed.teamLevel || prev.teamLevel,
                  region: parsed.region || prev.region,
                  heightFt: parsed.heightFt || prev.heightFt,
                  heightIn: parsed.heightIn || prev.heightIn,
                  gpa: parsed.gpa || prev.gpa,
              }));
              setPasteInput(''); // Clear input on success
          } else {
              alert("Could not extract data. Please try again.");
          }
      } catch (e) {
          alert("Parsing error.");
      } finally {
          setParsing(false);
      }
  };

  // Helper to calc age
  const calculateAge = (dobString: string) => {
      if (!dobString) return 17; // Default fallback
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age;
  };

  // Quick Save (Skip AI)
  const handleQuickSave = () => {
      // Validate minimum fields for Quick Save
      if (!formData.firstName && !formData.lastName) {
          alert("Please provide at least a First Name or Last Name to save.");
          return;
      }

      const newPlayer: Player = {
        id: Date.now().toString(),
        name: `${formData.firstName} ${formData.lastName}`.trim() || "Unknown Player",
        age: calculateAge(formData.dob),
        position: formData.position || "Unknown",
        status: PlayerStatus.LEAD, // Default to Lead
        email: formData.email,
        phone: formData.phone,
        parentEmail: formData.parentEmail,
        interestedProgram: formData.club ? `${formData.club} (${formData.teamLevel})` : formData.teamLevel, // Store context
        submittedAt: new Date().toISOString(),
        outreachLogs: [],
        evaluation: null // Explicitly null to indicate pending evaluation
    };

    onAddPlayer(newPlayer);
    onClose();
  };

  // Single Player AI Submit
  const handleSubmit = async () => {
    // Validate minimum fields
    if (!image && (!formData.firstName || !formData.lastName)) {
        alert("Please provide at least a name or upload an image to run AI analysis.");
        return;
    }

    setLoading(true);
    setEvalResult(null);

    try {
        const isImage = !!image;
        let data = "";

        if (isImage) {
            data = image!;
        } else {
            // Construct structured prompt from form data
            data = `
Player Profile:
Name: ${formData.firstName} ${formData.lastName}
Gender: ${formData.gender}
DOB: ${formData.dob} (Grad Year: ${formData.gradYear})
Location: ${formData.region}, ${formData.nationality}
Club: ${formData.club}
Team Level: ${formData.teamLevel}
Contact: ${formData.email}, ${formData.phone}, Parent: ${formData.parentEmail}
Physical: ${formData.heightFt}'${formData.heightIn}", ${formData.foot}-footed
Position: ${formData.position} (Secondary: ${formData.secondaryPosition})
Academics: GPA ${formData.gpa}, Test ${formData.testScore}

Scout Ratings (vs Teammates):
- Speed: ${formData.ratings.speed}
- Strength: ${formData.ratings.strength}
- Endurance: ${formData.ratings.endurance}
- Work Rate: ${formData.ratings.workRate}
- Technical: ${formData.ratings.technical}
- Tactical: ${formData.ratings.tactical}
            `;
        }

        const result = await evaluatePlayer(data, isImage, mimeType);
        
        if (result) {
            setEvalResult(result);
            setStep('review');
        } else {
             alert("The AI could not generate a result. Please check the input and try again.");
        }
    } catch (e) {
        console.error("Submission error:", e);
        alert("Evaluation failed due to an unexpected error.");
    } finally {
        setLoading(false);
    }
  };

  const confirmPlayer = () => {
    if (!evalResult) return;
    
    const newPlayer: Player = {
        id: Date.now().toString(),
        name: `${formData.firstName} ${formData.lastName}`.trim() || "New Recruit",
        age: calculateAge(formData.dob),
        position: formData.position || "Unknown",
        status: PlayerStatus.LEAD,
        email: formData.email,
        phone: formData.phone,
        parentEmail: formData.parentEmail,
        submittedAt: new Date().toISOString(),
        outreachLogs: [],
        evaluation: evalResult
    };

    onAddPlayer(newPlayer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-scout-900 w-full max-w-4xl rounded-2xl border border-scout-700 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-scout-900">
                {/* Header */}
                <div className="p-4 border-b border-scout-700 flex justify-between items-center bg-scout-800/50">
                    <div>
                         <h2 className="text-xl font-bold text-white">Manual Player Entry</h2>
                         <p className="text-xs text-gray-400">Add a single player to your pipeline.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-scout-900 custom-scrollbar">
                    {step === 'input' && (
                        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">Player Profile Builder</h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        <span className="text-scout-accent font-bold">Tip:</span> Only <span className="text-white font-bold">Name</span> is required. Capture now, refine later.
                                    </p>
                                </div>
                                <button 
                                    onClick={fillDemoData}
                                    className="text-xs flex items-center gap-1 text-scout-accent hover:text-white transition-colors bg-scout-800 px-3 py-1.5 rounded-full border border-scout-700"
                                >
                                    <FlaskConical size={12} /> Fill Demo Data
                                </button>
                            </div>

                            {/* AUTO-FILL / PASTE SECTION */}
                            <div className="bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-600 rounded-xl p-4 shadow-lg">
                                <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                                    <Sparkles size={16} className="text-scout-highlight" />
                                    <span>Quick Fill from Text</span>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={pasteInput}
                                        onChange={(e) => setPasteInput(e.target.value)}
                                        placeholder="Paste info here (Partial info OK)..."
                                        className="flex-1 bg-scout-900 border border-scout-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent placeholder-gray-600"
                                    />
                                    <button 
                                        onClick={handleAutoFill}
                                        disabled={parsing || !pasteInput}
                                        className="bg-scout-700 hover:bg-scout-600 text-white px-4 py-2 rounded text-xs font-bold whitespace-nowrap border border-scout-600 transition-colors flex items-center gap-2"
                                    >
                                        {parsing ? <Loader2 size={14} className="animate-spin"/> : <ClipboardPaste size={14} />}
                                        Auto-Fill
                                    </button>
                                </div>
                            </div>

                            {/* Upload Banner */}
                            <div className="bg-scout-800/30 border border-dashed border-scout-700 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-scout-800 rounded-full flex items-center justify-center text-scout-accent">
                                        <Upload size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Have a bio image? (Optional)</h4>
                                        <p className="text-xs text-gray-500">Upload a screenshot to auto-fill details.</p>
                                    </div>
                                </div>
                                <input type="file" id="submissionFile" className="hidden" accept="image/*" onChange={handleFileChange} />
                                <label htmlFor="submissionFile" className="cursor-pointer bg-scout-800 hover:bg-scout-700 text-white text-xs px-3 py-2 rounded border border-scout-600 transition-colors">
                                    {image ? 'Image Attached' : 'Select Image'}
                                </label>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* SECTION 1: BIO & PHYSICAL & CONTACT */}
                                <div className="bg-scout-800 rounded-xl border border-scout-700 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-scout-accent">
                                            <User size={18} />
                                            <h4 className="font-bold text-white">Bio & Details</h4>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-medium">NAME REQUIRED <span className="text-red-500">*</span></span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">First Name <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.firstName}
                                                    onChange={e => handleInputChange('firstName', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Last Name <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.lastName}
                                                    onChange={e => handleInputChange('lastName', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Contact Section */}
                                        <div className="bg-scout-900/50 p-2 rounded border border-scout-700/50 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1"><Mail size={10}/> Email</label>
                                                    <input type="text" className="w-full bg-scout-800 border border-scout-600 rounded px-2 py-1 text-xs text-white focus:outline-none" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="player@email.com" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1"><Phone size={10}/> Phone</label>
                                                    <input type="text" className="w-full bg-scout-800 border border-scout-600 rounded px-2 py-1 text-xs text-white focus:outline-none" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} placeholder="555-0123" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1"><User size={10}/> Parent Email</label>
                                                <input type="text" className="w-full bg-scout-800 border border-scout-600 rounded px-2 py-1 text-xs text-white focus:outline-none" value={formData.parentEmail} onChange={e => handleInputChange('parentEmail', e.target.value)} placeholder="parent@email.com" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">DOB</label>
                                                <div className="relative">
                                                    <input 
                                                        type="date" 
                                                        className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                        value={formData.dob}
                                                        onChange={e => handleInputChange('dob', e.target.value)}
                                                    />
                                                    <Calendar size={14} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Grad Year</label>
                                                    <input 
                                                    type="number" 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    placeholder="2025"
                                                    value={formData.gradYear}
                                                    onChange={e => handleInputChange('gradYear', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* New 3-Column Grid for Position / Club / Level */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Position</label>
                                                <select 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.position}
                                                    onChange={e => handleInputChange('position', e.target.value)}
                                                >
                                                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Club/Team</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.club}
                                                    onChange={e => handleInputChange('club', e.target.value)}
                                                    placeholder="e.g. Dallas Texans"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Team Level</label>
                                                <select 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.teamLevel}
                                                    onChange={e => handleInputChange('teamLevel', e.target.value)}
                                                >
                                                    {TEAM_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Height (Ft)</label>
                                                <input type="number" className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.heightFt} onChange={e => handleInputChange('heightFt', e.target.value)} placeholder="5" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Height (In)</label>
                                                <input type="number" className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.heightIn} onChange={e => handleInputChange('heightIn', e.target.value)} placeholder="10" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Foot</label>
                                                <select className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.foot} onChange={e => handleInputChange('foot', e.target.value)}>
                                                    <option>Right</option>
                                                    <option>Left</option>
                                                    <option>Both</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Region</label>
                                                <input type="text" className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.region} onChange={e => handleInputChange('region', e.target.value)} placeholder="State/City" />
                                            </div>
                                            <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Nationality</label>
                                                    <input type="text" className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.nationality} onChange={e => handleInputChange('nationality', e.target.value)} placeholder="USA" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                        {/* SECTION 2: RATINGS */}
                                    <div className="bg-scout-800 rounded-xl border border-scout-700 p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-scout-highlight">
                                                <Activity size={18} />
                                                <h4 className="font-bold text-white">Player Ratings</h4>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium">(OPTIONAL)</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.keys(formData.ratings).map((key) => (
                                                <div key={key}>
                                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1 capitalize">{key}</label>
                                                    <select 
                                                        className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-scout-accent"
                                                        value={(formData.ratings as any)[key]}
                                                        onChange={e => handleRatingChange(key, e.target.value)}
                                                    >
                                                        {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SECTION 3: ACADEMICS */}
                                    <div className="bg-scout-800 rounded-xl border border-scout-700 p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-blue-400">
                                                <GraduationCap size={18} />
                                                <h4 className="font-bold text-white">Academic Standing</h4>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium">(OPTIONAL)</span>
                                        </div>
                                            <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">GPA (Unweighted)</label>
                                                <input type="text" className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.gpa} onChange={e => handleInputChange('gpa', e.target.value)} placeholder="3.5" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Test Score (SAT/ACT)</label>
                                                <input type="text" className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={formData.testScore} onChange={e => handleInputChange('testScore', e.target.value)} placeholder="Optional" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={handleQuickSave}
                                    className="flex-1 bg-transparent hover:bg-scout-800 text-gray-300 font-bold py-4 rounded-lg border border-scout-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> Quick Save (Skip AI)
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={loading || (!image && !formData.firstName)}
                                    className="flex-[2] bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Run AI Analysis & Submit'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'review' && evalResult && (
                        <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 text-scout-accent">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Evaluation Complete</h3>
                            </div>

                            <div className="bg-scout-800 rounded-xl border border-scout-700 p-6">
                                <div className="flex justify-between items-center mb-4 border-b border-scout-700 pb-4">
                                    <div>
                                        <div className="text-sm text-gray-400">Projected Tier</div>
                                        <div className="text-xl font-bold text-white">{evalResult.scholarshipTier}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Score</div>
                                        <div className="text-3xl font-black text-scout-accent">{evalResult.score}</div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-gray-500 text-xs uppercase font-bold">Summary</span>
                                        <p className="text-gray-300 italic">"{evalResult.summary}"</p>
                                    </div>
                                    
                                    {/* Recommended Pathways */}
                                    {evalResult.recommendedPathways && evalResult.recommendedPathways.length > 0 && (
                                        <div className="bg-scout-900 p-3 rounded">
                                            <span className="text-blue-400 text-xs font-bold uppercase mb-2 block">Recommended Pathways</span>
                                            <div className="flex flex-wrap gap-2">
                                                {evalResult.recommendedPathways.map((path, idx) => (
                                                    <span key={idx} className="text-xs bg-scout-800 border border-scout-600 px-2 py-1 rounded text-white">{path}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-scout-900 p-3 rounded">
                                            <span className="text-green-500 text-xs font-bold">STRENGTHS</span>
                                            <ul className="list-disc list-inside text-sm text-gray-300 mt-1">
                                                {evalResult.strengths.map(s => <li key={s}>{s}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-scout-900 p-3 rounded">
                                            <span className="text-yellow-500 text-xs font-bold">WEAKNESSES</span>
                                            <ul className="list-disc list-inside text-sm text-gray-300 mt-1">
                                                {evalResult.weaknesses.map(w => <li key={w}>{w}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep('input')} className="flex-1 py-3 text-gray-400 hover:text-white">Back</button>
                                <button onClick={confirmPlayer} className="flex-[2] bg-white text-scout-900 font-bold rounded-lg hover:bg-gray-100">
                                    Confirm & Add to Pipeline
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default PlayerSubmission;