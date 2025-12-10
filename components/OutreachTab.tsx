import React, { useState, useEffect } from 'react';
import { Player, UserProfile, OutreachLog, PlayerStatus } from '../types';
import { Search, Mail, Sparkles, Copy, CheckCircle, MessageCircle, Send, Link, History, Clock, Upload, Loader2, FlaskConical, AlertCircle, X, Trash2 } from 'lucide-react';
import { generateOutreachMessage, extractPlayersFromBulkData } from '../services/geminiService';

interface OutreachTabProps {
  players: Player[];
  user: UserProfile;
  initialPlayerId?: string | null;
  onMessageSent: (id: string, log: Omit<OutreachLog, 'id'>) => void;
  onAddPlayers: (players: Player[]) => void;
}

const TEMPLATES = [
  { id: 'first_contact', title: 'First Contact', desc: 'Initial intro after seeing them play' },
  { id: 'invite_id_day', title: 'Invite to ID Day', desc: 'Formal invitation to a showcase' },
  { id: 'request_video', title: 'Request Video', desc: 'Ask for highlights/full match' },
  { id: 'follow_up', title: 'Polite Follow-up', desc: 'Checking in after no response' },
  { id: 'rejection', title: 'Professional Decline', desc: 'Respectful "not right now"' },
];

const OutreachTab: React.FC<OutreachTabProps> = ({ players, user, initialPlayerId, onMessageSent, onAddPlayers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialPlayerId || null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [includeAssessment, setIncludeAssessment] = useState(false);

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState<'input' | 'review'>('input');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkImage, setBulkImage] = useState<string | null>(null);
  const [bulkMimeType, setBulkMimeType] = useState('image/jpeg');
  const [extractedPlayers, setExtractedPlayers] = useState<Partial<Player>[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  useEffect(() => {
    if (initialPlayerId) {
        setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId]);

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const handleGenerate = async () => {
    if (!selectedPlayer || !selectedTemplate) return;
    setIsLoading(true);
    setGeneratedMessage('');
    setCopied(false);

    const templateName = TEMPLATES.find(t => t.id === selectedTemplate)?.title || 'Message';
    const trackingLink = includeAssessment 
        ? `https://app.warubi-sports.com/?ref=${user.scoutId || 'demo'}`
        : undefined;

    try {
      const msg = await generateOutreachMessage(user.name, selectedPlayer, templateName, trackingLink);
      setGeneratedMessage(msg);
    } catch (error) {
      setGeneratedMessage("Error generating message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const logAction = (method: 'Email' | 'WhatsApp' | 'Clipboard') => {
      if (!selectedPlayer) return;
      
      const templateName = TEMPLATES.find(t => t.id === selectedTemplate)?.title || 'Custom Message';
      
      onMessageSent(selectedPlayer.id, {
          date: new Date().toISOString(),
          method,
          templateName,
          note: generatedMessage.substring(0, 50) + '...'
      });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    logAction('Clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const openMail = () => {
      window.open(`mailto:?subject=Warubi%20Scouting&body=${encodeURIComponent(generatedMessage)}`);
      logAction('Email');
  };

  const openWhatsApp = () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(generatedMessage)}`);
      logAction('WhatsApp');
  };

  const formatDate = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // --- Bulk Import Logic ---

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            setBulkImage(base64Data);
            setBulkMimeType(file.type);
        };
        reader.readAsDataURL(file);
    }
  };

  const fillBulkDemoData = () => {
      setBulkImage(null);
      setBulkInput(
`First Name, Last Name, Position, Age, Notes
James, Rodriguez, CAM, 17, Technical wizard, great vision
Sarah, Smith, CB, 18, Strong in air, leader
Mike, Johnson, ST, 19, Fast, good finisher, 15 goals
David, Kim, LW, 17, Dribbler, needs strength
Alex, Morgan, CDM, 18, Ball winner, high work rate`
      );
  }

  const checkLimit = () => {
      const LIMIT = 25;
      const today = new Date().toDateString();
      const usage = JSON.parse(localStorage.getItem('warubi_bulk_limit') || '{}');
      
      if (usage.date !== today) {
          usage.date = today;
          usage.count = 0;
      }
      return { usage, limit: LIMIT, remaining: LIMIT - usage.count };
  };

  const updateLimit = (count: number) => {
      const { usage } = checkLimit();
      usage.count += count;
      localStorage.setItem('warubi_bulk_limit', JSON.stringify(usage));
  };

  const handleBulkProcess = async () => {
      if (!bulkInput && !bulkImage) return;
      
      const { remaining } = checkLimit();
      if (remaining <= 0) {
          alert("Daily bulk import limit (25) reached. Please try again tomorrow to ensure quality outreach.");
          return;
      }

      setIsBulkLoading(true);
      setExtractedPlayers([]);
      
      try {
          const isImage = !!bulkImage;
          const data = isImage ? bulkImage! : bulkInput;
          const results = await extractPlayersFromBulkData(data, isImage, bulkMimeType);
          
          if (results && results.length > 0) {
              setExtractedPlayers(results);
              setBulkStep('review');
          } else {
              alert("No valid players found. Please check your input.");
          }
      } catch (e) {
          console.error(e);
          alert("Bulk processing failed.");
      } finally {
          setIsBulkLoading(false);
      }
  };

  const confirmBulkPlayers = () => {
      const { remaining } = checkLimit();
      
      if (extractedPlayers.length > remaining) {
          alert(`You can only import ${remaining} more players today.`);
          return;
      }

      const newPlayers: Player[] = extractedPlayers.map((p, idx) => ({
          id: Date.now().toString() + idx,
          name: p.name || "Unknown Player",
          age: p.age || 17,
          position: p.position || "Unknown",
          status: PlayerStatus.LEAD,
          submittedAt: new Date().toISOString(),
          outreachLogs: [],
          evaluation: {
              score: p.evaluation?.score || 50,
              collegeLevel: "Pending Review",
              scholarshipTier: (p.evaluation?.scholarshipTier as any) || "Tier 3",
              recommendedPathways: p.evaluation?.recommendedPathways || ["Exposure Events"],
              strengths: [],
              weaknesses: [],
              nextAction: "Outreach",
              summary: p.evaluation?.summary || "Imported from bulk outreach list"
          }
      }));

      updateLimit(newPlayers.length);
      onAddPlayers(newPlayers);
      setShowBulkModal(false);
      setBulkInput('');
      setBulkImage(null);
      setBulkStep('input');
  };

  const removeBulkItem = (index: number) => {
      const newList = [...extractedPlayers];
      newList.splice(index, 1);
      setExtractedPlayers(newList);
      if (newList.length === 0) setBulkStep('input');
  };


  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in relative">
      
      {/* LEFT: Player Selection */}
      <div className="w-1/3 bg-scout-800 rounded-xl border border-scout-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-scout-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white">Outreach List</h3>
            <button 
                onClick={() => setShowBulkModal(true)}
                className="text-[10px] bg-scout-accent/10 text-scout-accent border border-scout-accent/50 hover:bg-scout-accent hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
                <Upload size={10} /> Import Leads
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search players..." 
              className="w-full bg-scout-900 border border-scout-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-scout-accent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No players found</div>
          ) : (
            filteredPlayers.map(player => {
               const lastContact = player.outreachLogs && player.outreachLogs.length > 0 ? player.outreachLogs[0] : null;

               return (
                <div 
                    key={player.id}
                    onClick={() => { setSelectedPlayerId(player.id); setGeneratedMessage(''); setSelectedTemplate(null); }}
                    className={`p-4 border-b border-scout-700/50 cursor-pointer transition-colors hover:bg-scout-700/50 ${selectedPlayerId === player.id ? 'bg-scout-700/80 border-l-4 border-l-scout-accent' : ''}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <div>
                            <h4 className={`font-semibold ${selectedPlayerId === player.id ? 'text-white' : 'text-gray-300'}`}>{player.name}</h4>
                            <p className="text-xs text-gray-500">{player.position} • {player.age} yo</p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-scout-700 ${
                            player.status === 'Placed' ? 'bg-scout-accent text-white border-scout-accent' : 
                            player.status === 'Offered' ? 'bg-scout-highlight/20 text-scout-highlight border-scout-highlight' :
                            'bg-scout-900 text-gray-400'
                        }`}>
                            {player.status}
                        </span>
                    </div>

                    {lastContact && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-400 font-medium bg-green-900/20 w-fit px-1.5 py-0.5 rounded border border-green-900/30">
                            <CheckCircle size={10} />
                            <span>Contacted {formatDate(lastContact.date)} via {lastContact.method}</span>
                        </div>
                    )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Template & Generation */}
      <div className="w-2/3 flex flex-col gap-6">
        
        {/* Template Selector */}
        <div className="bg-scout-800 p-6 rounded-xl border border-scout-700">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-scout-highlight" size={20} />
            <h3 className="font-bold text-white">Choose Template</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                disabled={!selectedPlayer}
                className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group
                  ${selectedTemplate === template.id 
                    ? 'bg-scout-accent/10 border-scout-accent text-white' 
                    : 'bg-scout-900 border-scout-700 text-gray-400 hover:border-scout-500 hover:text-gray-200'
                  }
                  ${!selectedPlayer ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="font-semibold text-sm truncate">{template.title}</div>
                <div className="text-[10px] opacity-70 truncate">{template.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Draft Area */}
        <div className="flex-1 bg-scout-800 p-6 rounded-xl border border-scout-700 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white">Message Draft</h3>
            <span className="text-xs text-gray-500 italic">
               {selectedPlayer ? `Drafting for ${selectedPlayer.name}` : 'Select a player first'}
            </span>
          </div>
          
          <div className="flex-1 relative mb-4">
             <textarea 
               value={generatedMessage}
               onChange={(e) => setGeneratedMessage(e.target.value)}
               placeholder={!selectedPlayer ? "Select a player to start..." : !selectedTemplate ? "Select a template above..." : "Message will appear here..."}
               className="w-full h-full bg-scout-900 border border-scout-700 rounded-lg p-4 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-scout-accent text-sm"
             />
             {isLoading && (
               <div className="absolute inset-0 bg-scout-900/80 flex items-center justify-center rounded-lg">
                 <div className="flex flex-col items-center gap-2">
                    <Sparkles className="animate-spin text-scout-accent" size={32} />
                    <span className="text-sm font-medium text-white">AI is writing...</span>
                 </div>
               </div>
             )}
          </div>

          <div className="flex flex-col gap-3">
             <label className="flex items-center gap-2 p-3 bg-scout-900 rounded-lg border border-scout-700 cursor-pointer hover:border-scout-500 transition-colors">
                <input 
                    type="checkbox" 
                    checked={includeAssessment}
                    onChange={(e) => setIncludeAssessment(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-500 text-scout-accent focus:ring-scout-accent"
                />
                <div className="flex-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                        <Link size={14} className="text-scout-accent"/> Include Free Assessment Link
                    </span>
                    <p className="text-xs text-gray-400">Players who complete it are automatically added to your leads (Tracked).</p>
                </div>
             </label>

             <div className="flex gap-3">
                {!generatedMessage ? (
                <button 
                    onClick={handleGenerate}
                    disabled={!selectedPlayer || !selectedTemplate || isLoading}
                    className="flex-1 bg-scout-700 hover:bg-scout-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    <Sparkles size={18} /> Generate Message
                </button>
                ) : (
                    <>
                    <button 
                        onClick={handleGenerate}
                        className="px-4 bg-scout-800 border border-scout-600 hover:bg-scout-700 text-gray-300 rounded-lg transition-all"
                        title="Regenerate"
                    >
                        <Sparkles size={18} />
                    </button>
                    <button 
                        onClick={copyToClipboard}
                        className="flex-1 bg-scout-accent hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        {copied ? <><CheckCircle size={18}/> Logged!</> : <><Copy size={18} /> Copy & Log</>}
                    </button>
                    <button onClick={openWhatsApp} className="px-6 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg transition-all flex items-center justify-center gap-2" title="Open WhatsApp">
                        <MessageCircle size={20} />
                    </button>
                    <button onClick={openMail} className="px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center justify-center gap-2" title="Open Email Client">
                        <Mail size={20} />
                    </button>
                    </>
                )}
             </div>
          </div>
        </div>
        
        {/* Previous Communications History */}
        {selectedPlayer && (
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 max-h-48 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <History size={12} /> Communication History
                </h4>
                
                {selectedPlayer.outreachLogs && selectedPlayer.outreachLogs.length > 0 ? (
                    <div className="space-y-3">
                        {selectedPlayer.outreachLogs.map(log => (
                            <div key={log.id} className="text-sm border-l-2 border-scout-600 pl-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                                    <span>{new Date(log.date).toLocaleString()}</span>
                                    <span className="font-bold text-scout-accent">{log.method}</span>
                                </div>
                                <div className="text-gray-300">
                                    <span className="font-medium text-white">{log.templateName}</span>
                                    {log.note && <span className="text-gray-500"> - {log.note}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 italic">No recorded messages yet.</p>
                )}
            </div>
        )}

      </div>

      {/* --- BULK IMPORT MODAL --- */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-scout-900 w-full max-w-2xl rounded-2xl border border-scout-700 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="p-4 border-b border-scout-700 flex justify-between items-center bg-scout-800/50">
                    <div>
                         <h2 className="text-xl font-bold text-white">Import Leads (Bulk)</h2>
                         <p className="text-xs text-gray-400">Import up to 25 leads per day to your outreach list.</p>
                    </div>
                    <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-scout-900">
                    {bulkStep === 'input' ? (
                        <div className="space-y-6">
                             {/* Limit Status */}
                             <div className="bg-scout-800/50 p-3 rounded border border-scout-700 flex items-center justify-between text-sm">
                                <span className="text-gray-300">Daily Limit</span>
                                <span className="font-bold text-scout-accent">{checkLimit().remaining} / 25 remaining</span>
                             </div>

                             <div className="border-2 border-dashed border-scout-700 rounded-xl p-6 text-center hover:border-scout-accent transition-colors bg-scout-800/30">
                                <input type="file" id="bulkFile" className="hidden" accept="image/*" onChange={handleBulkFileChange} />
                                <label htmlFor="bulkFile" className="cursor-pointer flex flex-col items-center">
                                    <Upload size={32} className="text-scout-highlight mb-2" />
                                    <span className="text-white font-medium">Upload Roster Photo</span>
                                    <span className="text-xs text-gray-500 mt-1">{bulkImage ? 'Image Attached' : 'Supports JPG, PNG of Rosters'}</span>
                                </label>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-scout-700"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-scout-900 text-gray-500">OR PASTE LIST</span></div>
                            </div>

                             <div className="bg-scout-800 rounded-lg p-1 border border-scout-700">
                                <textarea 
                                    value={bulkInput}
                                    onChange={(e) => setBulkInput(e.target.value)}
                                    className="w-full h-40 bg-scout-900 border-none rounded p-4 text-white focus:ring-0 resize-none placeholder-gray-600 font-mono text-sm"
                                    placeholder="John Doe, ST, 17, Elite Academy&#10;Jane Smith, GK, 18, State Team..."
                                />
                                <div className="p-2 flex justify-end bg-scout-800">
                                        <button 
                                        onClick={fillBulkDemoData}
                                        className="text-xs flex items-center gap-1 text-scout-accent hover:text-white transition-colors"
                                    >
                                        <FlaskConical size={12} /> Fill Demo List
                                    </button>
                                </div>
                            </div>

                             <div className="bg-scout-900/50 p-3 rounded border border-scout-700 flex items-start gap-2 text-xs text-gray-400">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <p>To maintain outreach quality and prevent spam, bulk imports are strictly limited to 25 players per day.</p>
                            </div>

                             <button 
                                onClick={handleBulkProcess}
                                disabled={isBulkLoading || (!bulkInput && !bulkImage)}
                                className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
                            >
                                {isBulkLoading ? <><Loader2 className="animate-spin" /> Processing List...</> : 'Process & Extract'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in h-full flex flex-col">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Review Extracted Players</h3>
                                    <p className="text-sm text-gray-400">Found {extractedPlayers.length} players. Review before importing.</p>
                                </div>
                                <button onClick={() => setBulkStep('input')} className="text-sm text-gray-400 hover:text-white">
                                    Cancel
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-scout-800 rounded-lg border border-scout-700 custom-scrollbar max-h-60">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-scout-900 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Player Name</th>
                                            <th className="px-4 py-3">Pos</th>
                                            <th className="px-4 py-3">Age</th>
                                            <th className="px-4 py-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-scout-700">
                                        {extractedPlayers.map((p, i) => (
                                            <tr key={i} className="hover:bg-scout-700/50">
                                                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                                                <td className="px-4 py-3 text-gray-300">{p.position}</td>
                                                <td className="px-4 py-3 text-gray-300">{p.age}</td>
                                                <td className="px-4 py-3">
                                                    <button 
                                                        onClick={() => removeBulkItem(i)}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={confirmBulkPlayers}
                                    className="w-full bg-white hover:bg-gray-100 text-scout-900 font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} /> Import {extractedPlayers.length} Players
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default OutreachTab;