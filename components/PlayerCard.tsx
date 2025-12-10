import React, { useState } from 'react';
import { Player, PlayerStatus } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, MessageCircle, ChevronDown, MapPin, School, Compass, Send } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onStatusChange?: (id: string, newStatus: PlayerStatus, extraData?: string) => void;
  onOutreach?: (player: Player) => void;
  isReference?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onStatusChange, onOutreach, isReference = false }) => {
  const [extraInput, setExtraInput] = useState(player.interestedProgram || player.placedLocation || '');
  const [isEditing, setIsEditing] = useState(false);

  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-scout-accent';
    if (score >= 70) return 'text-scout-highlight';
    return 'text-gray-400';
  };

  const tierColor = (tier?: string) => {
    if (tier === 'Tier 1') return 'bg-scout-accent text-white border-scout-accent';
    if (tier === 'Tier 2') return 'bg-scout-highlight/20 text-scout-highlight border-scout-highlight';
    return 'bg-gray-700 text-gray-300 border-gray-600';
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onStatusChange) return;
    onStatusChange(player.id, e.target.value as PlayerStatus);
  };

  const saveExtraData = () => {
      if (!onStatusChange) return;
      onStatusChange(player.id, player.status, extraInput);
      setIsEditing(false);
  }

  const sendFinalReviewEmail = () => {
    const subject = `Final Review Candidate: ${player.name}`;
    const body = `Hi Scouting Team,

I am submitting ${player.name} for final review.

Player Details:
- Position: ${player.position}
- Age: ${player.age}
- Scholarship Tier: ${player.evaluation?.scholarshipTier || 'N/A'}
- Scout Score: ${player.evaluation?.score || 'N/A'}

Summary:
${player.evaluation?.summary || 'N/A'}

Please advise on next steps.`;

    window.location.href = `mailto:scouting@warubi-sports.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Visual helper for pathway tags
  const getPathwayStyle = (pathway: string) => {
      switch(pathway) {
          case 'College Pathway': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
          case 'Development in Europe': return 'bg-red-500/20 text-red-300 border-red-500/30';
          case 'Exposure Events': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
          default: return 'bg-gray-700 text-gray-300 border-gray-600';
      }
  };

  return (
    <div className={`bg-scout-800 rounded-lg border shadow-lg flex flex-col h-full transition-all ${isReference ? 'opacity-80 border-scout-700' : 'border-scout-600 hover:border-scout-accent/50'}`}>
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
            <div>
            <h3 className="text-xl font-bold text-white">{player.name}</h3>
            <p className="text-sm text-gray-400">{player.position} • {player.age} yo</p>
            
            <div className="flex gap-2 mt-2 items-center">
                {player.evaluation?.scholarshipTier && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${tierColor(player.evaluation.scholarshipTier)}`}>
                        {player.evaluation.scholarshipTier}
                    </span>
                )}
                
                {/* Status Dropdown */}
                {!isReference ? (
                    <div className="relative group">
                        <select 
                            value={player.status}
                            onChange={handleStatusChange}
                            className="appearance-none bg-scout-900 text-[10px] font-bold uppercase tracking-wider pl-2 pr-6 py-0.5 rounded border border-scout-700 text-gray-300 focus:border-scout-accent focus:outline-none cursor-pointer hover:bg-scout-700"
                        >
                            <option value={PlayerStatus.LEAD}>Lead</option>
                            <option value={PlayerStatus.INTERESTED}>Interested</option>
                            <option value={PlayerStatus.FINAL_REVIEW}>Final Review</option>
                            <option value={PlayerStatus.OFFERED}>Offered</option>
                            <option value={PlayerStatus.PLACED}>Placed</option>
                            <option value={PlayerStatus.ARCHIVED}>Archived</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1.5 text-gray-500 pointer-events-none" />
                    </div>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-scout-900 border border-scout-700 text-gray-400">
                        {player.status}
                    </span>
                )}
            </div>
            </div>
            <div className="text-center">
                <div className={`text-2xl font-black ${scoreColor(player.evaluation?.score || 0)}`}>
                    {player.evaluation?.score || '?'}
                </div>
                <span className="text-[10px] text-gray-500 uppercase">Score</span>
            </div>
        </div>

        {/* Pipeline Details Input */}
        {!isReference && (player.status === PlayerStatus.INTERESTED || player.status === PlayerStatus.PLACED) && (
            <div className="mb-4 bg-scout-900/50 p-2 rounded border border-scout-700/50 text-xs">
                 <div className="flex justify-between items-center mb-1 text-gray-400">
                    <span className="flex items-center gap-1">
                        {player.status === PlayerStatus.INTERESTED ? <School size={12}/> : <MapPin size={12}/>}
                        {player.status === PlayerStatus.INTERESTED ? "Interested Program" : "Placement Location"}
                    </span>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-scout-accent hover:underline">
                        {isEditing ? 'Save' : 'Edit'}
                    </button>
                 </div>
                 {isEditing ? (
                     <div className="flex gap-2">
                        <input 
                            value={extraInput}
                            onChange={(e) => setExtraInput(e.target.value)}
                            className="bg-scout-800 border border-scout-600 rounded px-2 py-1 w-full text-white focus:outline-none"
                            placeholder={player.status === PlayerStatus.INTERESTED ? "e.g. UCLA" : "e.g. FC Dallas"}
                        />
                        <button onClick={saveExtraData} className="bg-scout-accent text-scout-900 px-2 rounded font-bold">OK</button>
                     </div>
                 ) : (
                     <p className="text-white font-medium pl-1">
                         {player.status === PlayerStatus.INTERESTED ? (player.interestedProgram || "Not set") : (player.placedLocation || "Not set")}
                     </p>
                 )}
            </div>
        )}

        {player.evaluation && (
            <div className="space-y-3">
            {/* Pathways Tags */}
            {player.evaluation.recommendedPathways && player.evaluation.recommendedPathways.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {player.evaluation.recommendedPathways.map((path, idx) => (
                         <span key={idx} className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1 ${getPathwayStyle(path)}`}>
                            <Compass size={8} /> {path}
                         </span>
                    ))}
                </div>
            )}

            <div className="bg-scout-900/50 p-3 rounded border border-scout-700/50">
                <div className="flex items-center gap-2 mb-1 text-scout-accent text-sm font-semibold">
                    <TrendingUp size={14} /> College Projection
                </div>
                <p className="text-sm text-gray-300">{player.evaluation.collegeLevel}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <p className="text-gray-500 mb-1 flex items-center gap-1"><CheckCircle size={10} /> Strengths</p>
                    <ul className="list-disc list-inside text-gray-300">
                        {(player.evaluation.strengths || []).slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
                <div>
                    <p className="text-gray-500 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Focus Areas</p>
                    <ul className="list-disc list-inside text-gray-300">
                        {(player.evaluation.weaknesses || []).slice(0, 2).map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            </div>
            
            <div className="pt-2 border-t border-scout-700 mt-2">
                <p className="text-xs text-gray-400 italic line-clamp-2">"{player.evaluation.summary}"</p>
            </div>
            </div>
        )}
      </div>

      {/* Action Footer */}
      {!isReference && player.status === PlayerStatus.FINAL_REVIEW ? (
         <div className="bg-scout-900 p-3 border-t border-scout-700 rounded-b-lg flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex-1">
                  <span className="text-[10px] text-scout-accent uppercase font-bold block">Ready for Review</span>
                  <span className="text-xs text-white font-medium">Notify Head Recruiters</span>
              </div>
              <button 
                onClick={sendFinalReviewEmail}
                className="bg-scout-accent hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap border border-emerald-600 shadow-lg shadow-emerald-900/20"
                title="Send to HQ"
              >
                  <Send size={14} /> Submit
              </button>
          </div>
      ) : !isReference && player.evaluation?.nextAction && (
          <div className="bg-scout-900 p-3 border-t border-scout-700 rounded-b-lg flex items-center justify-between gap-2">
              <div className="flex-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Next Step</span>
                  <span className="text-xs text-white font-medium">{player.evaluation.nextAction}</span>
              </div>
              <button 
                onClick={() => onOutreach && onOutreach(player)}
                className="bg-scout-700 hover:bg-scout-600 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap border border-scout-600"
                title="Draft Message"
              >
                  <MessageCircle size={14} className="text-scout-accent"/> Action
              </button>
          </div>
      )}
    </div>
  );
};

export default PlayerCard;