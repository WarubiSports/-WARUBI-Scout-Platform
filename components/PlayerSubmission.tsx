import React, { useState } from 'react';
import { X, Upload, CheckCircle, Loader2, FlaskConical, User, Calendar, Activity, GraduationCap } from 'lucide-react';
import { evaluatePlayer } from '../services/geminiService';
import { Player, PlayerStatus, PlayerEvaluation } from '../types';

interface PlayerSubmissionProps {
  onClose: () => void;
  onAddPlayer: (player: Player) => void;
}

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
const RATINGS = ["Elite", "Top 10%", "Above Average", "Average", "Below Average"];

const PlayerSubmission: React.FC<PlayerSubmissionProps> = ({ onClose, onAddPlayer }) => {
  const [loading, setLoading] = useState(false);
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
    gpa: '',
    testScore: '',
    club: '',
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
      gpa: '3.6',
      testScore: '1250 SAT',
      club: 'East Coast Elite Academy',
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

  // Single Player Submit
  const handleSubmit = async () => {
    // Validate minimum fields
    if (!image && (!formData.firstName || !formData.lastName)) {
        alert("Please provide at least a name or upload an image.");
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
    
    // Calculate age from DOB if available
    let age = 17;
    if (formData.dob) {
        const birthDate = new Date(formData.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    const newPlayer: Player = {
        id: Date.now().toString(),
        name: `${formData.firstName} ${formData.lastName}`.trim() || "New Recruit",
        age: age,
        position: formData.position || "Unknown",
        status: PlayerStatus.LEAD,
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
                                    <p className="text-gray-400">Fill out standardized data for accurate AI evaluation.</p>
                                </div>
                                <button 
                                    onClick={fillDemoData}
                                    className="text-xs flex items-center gap-1 text-scout-accent hover:text-white transition-colors bg-scout-800 px-3 py-1.5 rounded-full border border-scout-700"
                                >
                                    <FlaskConical size={12} /> Fill Demo Data
                                </button>
                            </div>

                            {/* Upload Banner */}
                            <div className="bg-scout-800/30 border border-dashed border-scout-700 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-scout-800 rounded-full flex items-center justify-center text-scout-accent">
                                        <Upload size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Have a bio image?</h4>
                                        <p className="text-xs text-gray-500">Upload a screenshot to auto-fill or just evaluate the image.</p>
                                    </div>
                                </div>
                                <input type="file" id="submissionFile" className="hidden" accept="image/*" onChange={handleFileChange} />
                                <label htmlFor="submissionFile" className="cursor-pointer bg-scout-800 hover:bg-scout-700 text-white text-xs px-3 py-2 rounded border border-scout-600 transition-colors">
                                    {image ? 'Image Attached' : 'Select Image'}
                                </label>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* SECTION 1: BIO & PHYSICAL */}
                                <div className="bg-scout-800 rounded-xl border border-scout-700 p-5">
                                    <div className="flex items-center gap-2 mb-4 text-scout-accent">
                                        <User size={18} />
                                        <h4 className="font-bold text-white">Bio & Physical</h4>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">First Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.firstName}
                                                    onChange={e => handleInputChange('firstName', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Last Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-scout-900 border border-scout-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent"
                                                    value={formData.lastName}
                                                    onChange={e => handleInputChange('lastName', e.target.value)}
                                                />
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

                                        <div className="grid grid-cols-2 gap-3">
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
                                                />
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
                                        <div className="flex items-center gap-2 mb-4 text-scout-highlight">
                                            <Activity size={18} />
                                            <h4 className="font-bold text-white">Player Ratings (vs Peers)</h4>
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
                                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                                            <GraduationCap size={18} />
                                            <h4 className="font-bold text-white">Academic Standing</h4>
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

                            <button 
                                onClick={handleSubmit}
                                disabled={loading || (!image && !formData.firstName)}
                                className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Run AI Analysis & Submit'}
                            </button>
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