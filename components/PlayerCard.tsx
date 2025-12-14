import React, { useState } from 'react';
import { Player, PlayerStatus } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, MessageCircle, ChevronDown, ChevronUp, MapPin, School, Compass, Send, GripVertical, Flame, Eye } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onStatusChange?: (id: string, newStatus: PlayerStatus, extraData?: string) => void;
  onOutreach?: (player: Player) => void;
  isReference?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onStatusChange, 
  onOutreach, 
  isReference = false,
  onDragStart,
  onDragEnd
}) => {
  const [extraInput, setExtraInput] = useState(player.interestedProgram || player.placedLocation || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-scout-accent';
    if (score >= 70) return 'text-scout-highlight';
    return 'text-gray-400';
  };

  const tierColor = (tier?: string) => {
    if (tier === 'Tier 1') return 'bg-scout-accent text-scout-900 border-scout-accent';
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

  // Helper to determine if "active recently"
  const isRecentlyActive = () => {
      if (!player.lastActive) return false;
      const diff = new Date().getTime() - new Date(player.lastActive).getTime();
      return diff < 1000 * 60 * 60; // 1 hour
  };

  return (
    <div 
        draggable={!isReference}
        onDragStart={(e) => {
            if (!isReference && onDragStart) {
                onDragStart(player.id);
                // Required for Firefox
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', player.id);
            }
        }}
        onDragEnd={() => {
            if (!isReference && onDragEnd) onDragEnd();
        }}
        className={`bg-scout-800 rounded-lg border shadow-sm flex flex-col w-full transition-all 
        ${isReference ? 'opacity-80 border-scout-700' : 'border-scout-600 hover:border-scout-accent/50 cursor-grab active:cursor-grabbing hover:shadow-md'}`}
    >
      <div className="p-3 flex-1 flex flex-col relative">
        {/* Hot Lead Indicator */}
        {!isReference && player.activityStatus && player.activityStatus !== 'none' && (
             <div className="absolute top-0 right-0 p-1">
                 {player.activityStatus === 'submitted' ? (
                     <div className="bg-scout-accent text-scout-900 rounded-full p-1 shadow-lg shadow-scout-accent/20" title="Assessment Completed">
                         <CheckCircle size={12} fill="currentColor" className="text-white" />
                     </div>
                 ) : (
                    <div className={`${isRecentlyActive() ? 'text-orange-500' : 'text-gray-500'} bg-scout-900/80 rounded-full p-1`} title="Link Viewed">
                         <Flame size={12} fill={isRecentlyActive() ? "currentColor" : "none"} />
                    </div>
                 )}
             </div>
        )}

        <div className="flex justify-between items-start mb-2">
            <div className="min-w-0 flex items-start gap-1">
                {!isReference && (
                    <GripVertical size={14} className="text-gray-600 mt-1 shrink-0" />
                )}
                <div>
                    <h3 className="text-base font-bold text-white leading-tight truncate pr-2">{player.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        {player.position} • {player.age} yo
                        {isRecentlyActive() && (
                            <span className="text-[9px] text-green-400 bg-green-900/30 px-1 rounded flex items-center gap-0.5 animate-pulse">
                                <Eye size={8}/> Online
                            </span>
                        )}
                    </p>
                    
                    <div className="flex gap-1.5 mt-1.5 items-center flex-wrap">
                        {player.evaluation?.scholarshipTier && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tierColor(player.evaluation.scholarshipTier)}`}>
                                {player.evaluation.scholarshipTier}
                            </span>
                        )}
                        
                        {/* Status Dropdown */}
                        {!isReference ? (
                            <div className="relative group">
                                <select 
                                    value={player.status}
                                    onChange={handleStatusChange}
                                    className="appearance-none bg-scout-900 text-[9px] font-bold uppercase tracking-wider pl-1.5 pr-4 py-0.5 rounded border border-scout-700 text-gray-300 focus:border-scout-accent focus:outline-none cursor-pointer hover:bg-scout-700"
                                >
                                    <option value={PlayerStatus.PROSPECT}>Prospect (Hidden)</option>
                                    <option value={PlayerStatus.LEAD}>Lead</option>
                                    <option value={PlayerStatus.INTERESTED}>Interested</option>
                                    <option value={PlayerStatus.FINAL_REVIEW}>Final Review</option>
                                    <option value={PlayerStatus.OFFERED}>Offered</option>
                                    <option value={PlayerStatus.PLACED}>Placed</option>
                                    <option value={PlayerStatus.ARCHIVED}>Archived</option>
                                </select>
                                <ChevronDown size={8} className="absolute right-1 top-1 text-gray-500 pointer-events-none" />
                            </div>
                        ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-scout-900 border border-scout-700 text-gray-400">
                                {player.status}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="text-center pl-1 shrink-0">
                <div className={`text-xl font-black leading-none ${scoreColor(player.evaluation?.score || 0)}`}>
                    {player.evaluation?.score || '?'}
                </div>
                <span className="text-[8px] text-gray-500 uppercase tracking-tighter block">Score</span>
            </div>
        </div>

        {/* Pipeline Details Input */}
        {!isReference && (player.status === PlayerStatus.INTERESTED || player.status === PlayerStatus.PLACED) && (
            <div className="mb-2 bg-scout-900/50 p-1.5 rounded border border-scout-700/50 text-[10px]">
                 <div className="flex justify-between items-center mb-0.5 text-gray-400">
                    <span className="flex items-center gap-1">
                        {player.status === PlayerStatus.INTERESTED ? <School size={10}/> : <MapPin size={10}/>}
                        {player.status === PlayerStatus.INTERESTED ? "Interested Program" : "Placement Location"}
                    </span>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-scout-accent hover:underline text-[9px]">
                        {isEditing ? 'Save' : 'Edit'}
                    </button>
                 </div>
                 {isEditing ? (
                     <div className="flex gap-1">
                        <input 
                            value={extraInput}
                            onChange={(e) => setExtraInput(e.target.value)}
                            className="bg-scout-800 border border-scout-600 rounded px-1.5 py-0.5 w-full text-white focus:outline-none"
                            placeholder={player.status === PlayerStatus.INTERESTED ? "e.g. UCLA" : "e.g. FC Dallas"}
                        />
                        <button onClick={saveExtraData} className="bg-scout-accent text-scout-900 px-1.5 rounded font-bold">OK</button>
                     </div>
                 ) : (
                     <p className="text-white font-medium pl-1 truncate">
                         {player.status === PlayerStatus.INTERESTED ? (player.interestedProgram || "Not set") : (player.placedLocation || "Not set")}
                     </p>
                 )}
            </div>
        )}

        {/* Collapsible Evaluation Details */}
        {player.evaluation && (
            <div className="mt-auto pt-1">
                 <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-gray-500 hover:text-white py-1 transition-colors border-t border-scout-700/50"
                >
                    {isExpanded ? 'Hide Analysis' : 'Show Analysis'}
                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>

                {isExpanded && (
                    <div className="animate-fade-in space-y-2 mt-1">
                        {/* Pathways Tags */}
                        {player.evaluation.recommendedPathways && player.evaluation.recommendedPathways.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {player.evaluation.recommendedPathways.map((path, idx) => (
                                    <span key={idx} className={`text-[9px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${getPathwayStyle(path)}`}>
                                        <Compass size={8} /> {path}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="bg-scout-900/50 p-2 rounded border border-scout-700/50">
                            <div className="flex items-center gap-1.5 mb-0.5 text-scout-accent text-xs font-semibold">
                                <TrendingUp size={12} /> College Projection
                            </div>
                            <p className="text-xs text-gray-300">{player.evaluation.collegeLevel}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                                <p className="text-gray-500 mb-0.5 flex items-center gap-1"><CheckCircle size={8} /> Strengths</p>
                                <ul className="list-disc list-inside text-gray-300 leading-tight">
                                    {(player.evaluation.strengths || []).slice(0, 2).map((s, i) => <li key={i} className="truncate">{s}</li>)}
                                </ul>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-0.5 flex items-center gap-1"><AlertTriangle size={8} /> Focus Areas</p>
                                <ul className="list-disc list-inside text-gray-300 leading-tight">
                                    {(player.evaluation.weaknesses || []).slice(0, 2).map((w, i) => <li key={i} className="truncate">{w}</li>)}
                                </ul>
                            </div>
                        </div>
                        
                        <div className="pt-1 border-t border-scout-700 mt-1">
                            <p className="text-[10px] text-gray-400 italic line-clamp-2">"{player.evaluation.summary}"</p>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Action Footer */}
      {!isReference && player.status === PlayerStatus.FINAL_REVIEW ? (
         <div className="bg-scout-900 p-2 border-t border-scout-700 rounded-b-lg flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-scout-accent uppercase font-bold block">Ready for Review</span>
              </div>
              <button 
                onClick={sendFinalReviewEmail}
                className="bg-scout-accent hover:bg-emerald-600 text-white px-2 py-1 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold whitespace-nowrap border border-emerald-600 shadow-lg shadow-emerald-900/20"
                title="Send to HQ"
              >
                  <Send size={12} /> Submit
              </button>
          </div>
      ) : !isReference && player.status === PlayerStatus.OFFERED ? (
         <div className="bg-scout-900 p-2 border-t border-scout-700 rounded-b-lg flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex-1 min-w-0">
                  <span className="text-[8px] text-gray-500 uppercase font-bold block mb-0.5">Next Step</span>
                  <span className="text-[10px] text-white font-medium block truncate">Follow up with player or HQ</span>
              </div>
              <button 
                onClick={() => onOutreach && onOutreach(player)}
                className="bg-scout-700 hover:bg-scout-600 text-white px-2 py-1.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold whitespace-nowrap border border-scout-600"
                title="Draft Message"
              >
                  <MessageCircle size={12} className="text-scout-accent"/> Follow Up
              </button>
          </div>
      ) : !isReference && player.evaluation?.nextAction && (
          <div className="bg-scout-900 p-2 border-t border-scout-700 rounded-b-lg flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                  <span className="text-[8px] text-gray-500 uppercase font-bold block mb-0.5">Next Step</span>
                  <span className="text-[10px] text-white font-medium block truncate">{player.evaluation.nextAction}</span>
              </div>
              <button 
                onClick={() => onOutreach && onOutreach(player)}
                className="bg-scout-700 hover:bg-scout-600 text-white px-2 py-1.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold whitespace-nowrap border border-scout-600"
                title="Draft Message"
              >
                  <MessageCircle size={12} className="text-scout-accent"/> Action
              </button>
          </div>
      )}
    </div>
  );
};

export default PlayerCard;