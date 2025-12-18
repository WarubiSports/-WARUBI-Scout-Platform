
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Player, DashboardTab, ScoutingEvent, PlayerStatus, AppNotification, StrategyTask } from '../types';
import PlayerCard from './PlayerCard';
import EventHub from './EventHub';
import KnowledgeTab from './KnowledgeTab';
import ProfileTab from './ProfileTab';
import OutreachTab from './OutreachTab';
import NewsTab from './NewsTab';
import PlayerSubmission from './PlayerSubmission';
import SidelineBeam from './SidelineBeam';
import TutorialOverlay from './TutorialOverlay';
import Confetti from './Confetti';
import StrategyPanel from './StrategyPanel';
import { generateDailyStrategy } from '../services/geminiService';
import { Users, CalendarDays, UserCircle, MessageSquare, Newspaper, Zap, Plus, Sparkles, X, Check, PlusCircle, Flame, List, LayoutGrid, Search, MessageCircle, MoreHorizontal, ChevronDown, Ghost, Edit2, Trophy, Radio } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  players: Player[];
  events: ScoutingEvent[];
  newsItems: any[];
  tickerItems: string[];
  notifications: AppNotification[];
  scoutScore?: number; 
  onAddPlayer: (player: Player) => void;
  onUpdateProfile?: (profile: UserProfile) => void;
  onAddEvent: (event: ScoutingEvent) => void;
  onUpdateEvent: (event: ScoutingEvent) => void;
  onUpdatePlayer: (player: Player) => void;
  onAddNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  onMarkAllRead: () => void;
  onMessageSent?: (id: string, log: any) => void;
  onStatusChange?: (id: string, newStatus: PlayerStatus) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    user, 
    players, 
    events, 
    newsItems,
    tickerItems,
    notifications,
    scoutScore = 0,
    onAddPlayer, 
    onUpdateProfile,
    onAddEvent,
    onUpdateEvent,
    onUpdatePlayer,
    onAddNotification,
    onMarkAllRead,
    onMessageSent,
    onStatusChange
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.PLAYERS);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isBeamOpen, setIsBeamOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showCelebration, setShowCelebration] = useState(false); 
  const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);
  const [strategyTasks, setStrategyTasks] = useState<StrategyTask[]>([]);
  const [draggedOverStatus, setDraggedOverStatus] = useState<PlayerStatus | null>(null);
  const [listSearch, setListSearch] = useState('');
  
  // SPOTLIGHT QUEUE: Only show Prospects who have finishing assessment or clicked link
  const spotlights = players.filter(p => p.status === PlayerStatus.PROSPECT && (p.activityStatus === 'spotlight' || p.activityStatus === 'signal'));
  const shadowCount = players.filter(p => p.status === PlayerStatus.PROSPECT).length;
  const [reviewIdx, setReviewIdx] = useState(0);
  const currentSpotlight = spotlights[reviewIdx];

  useEffect(() => {
      setStrategyTasks(generateDailyStrategy(players, events));
  }, [players, events]); 

  const handleStatusChange = (id: string, newStatus: PlayerStatus) => {
      if (newStatus === PlayerStatus.PLACED) setShowCelebration(true);
      if (onStatusChange) onStatusChange(id, newStatus);
  };

  const promoteLead = (id: string) => {
      handleStatusChange(id, PlayerStatus.LEAD);
      if (reviewIdx >= spotlights.length - 1) setReviewIdx(0);
  };

  const jumpToOutreach = (player: Player) => { setOutreachTargetId(player.id); setActiveTab(DashboardTab.OUTREACH); };

  const handleEditPlayer = (player: Player) => {
      setEditingPlayer(player);
      setIsSubmissionOpen(true);
  };

  const handleCloseSubmission = () => {
      setIsSubmissionOpen(false);
      setEditingPlayer(null);
  };

  // DRAG AND DROP HANDLERS
  const onDragOver = (e: React.DragEvent, status: PlayerStatus) => {
      e.preventDefault();
      setDraggedOverStatus(status);
  };

  const onDrop = (e: React.DragEvent, status: PlayerStatus) => {
      e.preventDefault();
      setDraggedOverStatus(null);
      const playerId = e.dataTransfer.getData('playerId');
      if (playerId) {
          handleStatusChange(playerId, status);
      }
  };

  const onDragLeave = () => {
      setDraggedOverStatus(null);
  };

  const ListView = () => {
    const filteredPlayers = players.filter(p => 
        p.status !== PlayerStatus.PROSPECT && 
        p.name.toLowerCase().includes(listSearch.toLowerCase())
    );

    return (
        <div className="bg-scout-800/50 rounded-[2rem] border border-scout-700/50 overflow-hidden animate-fade-in shadow-xl">
            <div className="p-6 border-b border-scout-700/50 bg-scout-900/40 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Filter active pipeline..." 
                        className="w-full bg-scout-950 border border-scout-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-scout-accent transition-all"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4 text-xs font-black uppercase tracking-widest text-gray-500">
                    <span>{filteredPlayers.length} Active Candidates</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-scout-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-scout-700">
                            <th className="px-6 py-4">Player</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Projected Level</th>
                            <th className="px-6 py-4">Outreach</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-scout-700/30">
                        {filteredPlayers.map((p, i) => (
                            <tr key={p.id} className={`${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} hover:bg-scout-accent/5 transition-colors group`}>
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="font-bold text-white text-sm">{p.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-black">{p.position} • {p.age}yo</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative inline-block group/select">
                                        <select 
                                            value={p.status}
                                            onChange={(e) => handleStatusChange(p.id, e.target.value as PlayerStatus)}
                                            className="appearance-none bg-scout-900/50 border border-scout-700/50 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-300 focus:outline-none focus:border-scout-accent cursor-pointer pr-8"
                                        >
                                            {Object.values(PlayerStatus).filter(s => s !== PlayerStatus.PROSPECT).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2 text-gray-600 pointer-events-none" />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs text-gray-300">{p.evaluation?.collegeLevel || 'Unknown'}</div>
                                    <div className="text-[9px] text-scout-highlight font-black uppercase">{p.evaluation?.scholarshipTier || 'No Tier'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {p.outreachLogs.length > 0 ? (
                                        <div>
                                            <div className="text-[10px] text-scout-accent font-black uppercase flex items-center gap-1">
                                                <MessageSquare size={10} fill="currentColor"/> {p.outreachLogs[p.outreachLogs.length-1].templateName}
                                            </div>
                                            <div className="text-[9px] text-gray-500 uppercase font-black mt-0.5">
                                                {new Date(p.lastContactedAt!).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-gray-600 font-black uppercase">No Contact</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`text-lg font-black ${p.evaluation && p.evaluation.score >= 85 ? 'text-scout-accent' : p.evaluation && p.evaluation.score >= 70 ? 'text-scout-highlight' : 'text-gray-500'}`}>
                                        {p.evaluation?.score || '?'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEditPlayer(p)}
                                            className="p-2 bg-scout-900 border border-scout-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                            title="Edit Profile"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => jumpToOutreach(p)}
                                            className="p-2 bg-scout-900 border border-scout-700 rounded-lg text-gray-400 hover:text-scout-accent transition-colors"
                                            title="Outreach"
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                        <button 
                                            className="p-2 bg-scout-900 border border-scout-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                            title="View Details"
                                        >
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#05080f] text-white overflow-hidden relative">
        {showCelebration && <Confetti onComplete={() => setShowCelebration(false)} />}
        
        {/* SIDEBAR */}
        <aside className="w-72 bg-scout-800 border-r border-scout-700 hidden md:flex flex-col shrink-0">
            <div className="p-8 border-b border-scout-700">
                <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Warubi<span className="text-scout-accent">Scout</span></h1>
            </div>
            <nav className="flex-1 p-4 space-y-2 mt-4">
                <button onClick={() => setActiveTab(DashboardTab.PLAYERS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.PLAYERS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:bg-scout-900/50'}`}><Users size={20} /> Pipeline</button>
                <button onClick={() => setActiveTab(DashboardTab.OUTREACH)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.OUTREACH ? 'bg-scout-accent text-scout-900' : 'text-gray-300 hover:text-white'}`}><MessageSquare size={20} /> Outreach</button>
                <button onClick={() => setActiveTab(DashboardTab.EVENTS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.EVENTS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><CalendarDays size={20} /> Events</button>
                <div className="text-[10px] font-black text-gray-600 px-5 mt-10 mb-2 uppercase tracking-[0.3em]">Intel</div>
                <button onClick={() => setActiveTab(DashboardTab.NEWS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.NEWS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Newspaper size={20} /> News</button>
                <button onClick={() => setActiveTab(DashboardTab.KNOWLEDGE)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.KNOWLEDGE ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Zap size={20} /> Training</button>
            </nav>
            <StrategyPanel persona={user.scoutPersona || 'The Scout'} tasks={strategyTasks} onAction={(link) => setActiveTab(DashboardTab.OUTREACH)} />
            <div className="p-6 border-t border-scout-700 bg-scout-900/30">
                <div onClick={() => setActiveTab(DashboardTab.PROFILE)} className="flex items-center gap-4 p-3 bg-scout-800 rounded-2xl border border-scout-700 cursor-pointer hover:border-scout-accent transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-scout-accent flex items-center justify-center font-black text-scout-900 text-xl">{user.name.charAt(0)}</div>
                    <div className="min-w-0"><p className="text-sm font-black text-white truncate mb-1">{user.name}</p><p className="text-[10px] text-scout-highlight font-black uppercase">{scoutScore} XP</p></div>
                </div>
            </div>
        </aside>

        <main className="flex-1 overflow-auto p-6 md:p-10 pb-32 md:pb-10 custom-scrollbar">
            {activeTab === DashboardTab.PLAYERS && (
                <div className="space-y-12 animate-fade-in">
                    {/* SPOTLIGHT PROMOTIONS */}
                    {spotlights.length > 0 && (
                        <div className="bg-emerald-500/5 border-2 border-scout-accent/30 rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-scout-accent/5 rounded-full blur-3xl"></div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                                <div className="flex-1">
                                    <div className="inline-flex items-center gap-2 bg-scout-accent text-scout-900 text-[10px] font-black px-3 py-1 rounded-full uppercase mb-4 tracking-widest animate-pulse">
                                        <Trophy size={12}/> {spotlights.length} Spotlight Ready Signals
                                    </div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-2">Spotlight Review</h2>
                                    <p className="text-gray-400 font-medium max-w-lg">Undiscovered talent that has engaged with your portal. Review their verified data and promote them to your main board.</p>
                                </div>
                                <div className="w-full max-w-sm">
                                    {currentSpotlight && (
                                        <div className="bg-scout-800 border border-scout-700 rounded-3xl p-6 shadow-2xl animate-fade-in">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-2xl font-black text-white">{currentSpotlight.name}</h3>
                                                    <p className="text-sm text-scout-accent font-bold">{currentSpotlight.position} • {currentSpotlight.nationality || 'Unconfirmed'}</p>
                                                </div>
                                                <div className="text-center bg-scout-900 p-2 rounded-xl">
                                                    <span className="text-[8px] text-emerald-400 uppercase font-black">Verified</span>
                                                </div>
                                            </div>
                                            <div className="bg-scout-900/50 p-3 rounded-xl border border-scout-700/50 text-[10px] text-gray-400 mb-6 italic leading-relaxed">
                                                {currentSpotlight.activityStatus === 'spotlight' ? "Assessment completed. Data verified." : "Signal detected. Engagement active."}
                                            </div>
                                            <div className="flex gap-3 w-full">
                                                <button onClick={() => handleStatusChange(currentSpotlight.id, PlayerStatus.ARCHIVED)} className="flex-1 bg-scout-700 hover:bg-red-900/50 text-white font-black py-4 rounded-2xl border border-white/5 flex items-center justify-center gap-2 transition-all"><X size={18}/> Dismiss</button>
                                                <button onClick={() => promoteLead(currentSpotlight.id)} className="flex-[1.5] bg-scout-accent hover:bg-emerald-600 text-scout-900 font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"><Trophy size={18}/> Promote</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Pipeline Board</h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-3">
                                Verified Leads & Propects
                                {shadowCount > 0 && (
                                    <button 
                                        onClick={() => setActiveTab(DashboardTab.OUTREACH)}
                                        className="bg-scout-900 border border-scout-700 rounded-full px-3 py-1 text-[10px] font-black text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                                    >
                                        <Ghost size={10} className="text-scout-highlight"/> {shadowCount} Undiscovered in Shadow
                                    </button>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* View Switcher */}
                            <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex shadow-inner">
                                <button 
                                    onClick={() => setViewMode('board')}
                                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-black uppercase ${viewMode === 'board' ? 'bg-scout-accent text-scout-900 shadow-md' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <LayoutGrid size={16} /> Board
                                </button>
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-black uppercase ${viewMode === 'list' ? 'bg-scout-accent text-scout-900 shadow-md' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <List size={16} /> List
                                </button>
                            </div>

                            <button onClick={() => setIsSubmissionOpen(true)} className="bg-scout-accent hover:bg-emerald-600 text-scout-900 px-8 py-4 rounded-2xl font-black shadow-glow flex items-center gap-3 active:scale-95 transition-all">
                                <PlusCircle size={24} /> New Manual Lead
                            </button>
                        </div>
                    </div>

                    {viewMode === 'board' ? (
                        <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar min-h-[500px]">
                            {[PlayerStatus.LEAD, PlayerStatus.INTERESTED, PlayerStatus.FINAL_REVIEW, PlayerStatus.PLACED].map(status => (
                                <div 
                                    key={status} 
                                    onDragOver={(e) => onDragOver(e, status)}
                                    onDrop={(e) => onDrop(e, status)}
                                    onDragLeave={onDragLeave}
                                    className={`flex-1 min-w-[340px] flex flex-col bg-scout-800/20 rounded-[3rem] border transition-all duration-300 ${draggedOverStatus === status ? 'border-scout-accent bg-scout-accent/5 ring-4 ring-scout-accent/10 shadow-glow' : 'border-scout-700/50'}`}
                                >
                                    <div className="p-8 border-b border-scout-700/50 bg-scout-900/20 backdrop-blur-md flex justify-between items-center rounded-t-[3rem]">
                                        <h3 className={`font-black uppercase text-[10px] tracking-[0.3em] transition-colors ${draggedOverStatus === status ? 'text-scout-accent' : 'text-white opacity-50'}`}>{status}</h3>
                                        <span className={`text-[10px] px-3 py-1 rounded-full border transition-all ${draggedOverStatus === status ? 'bg-scout-accent border-scout-accent text-scout-900' : 'bg-scout-900 border-scout-700 text-gray-500 font-black'}`}>{players.filter(p => p.status === status).length}</span>
                                    </div>
                                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(100vh-450px)]">
                                        {players.filter(p => p.status === status).map(p => (
                                            <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onEdit={handleEditPlayer} />
                                        ))}
                                        {players.filter(p => p.status === status).length === 0 && (
                                            <div className="h-32 flex items-center justify-center border-2 border-dashed border-scout-700/30 rounded-3xl opacity-30 italic text-xs font-medium text-gray-500">
                                                Drop to promote talent
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ListView />
                    )}
                </div>
            )}

            {activeTab === DashboardTab.OUTREACH && (
                <OutreachTab 
                    players={players} 
                    user={user} 
                    initialPlayerId={outreachTargetId} 
                    onMessageSent={onMessageSent || (() => {})} 
                    onAddPlayers={(pls) => pls.forEach(p => onAddPlayer(p))} 
                    onStatusChange={handleStatusChange}
                />
            )}
            {activeTab === DashboardTab.EVENTS && <EventHub events={events} user={user} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} />}
            {activeTab === DashboardTab.NEWS && <NewsTab newsItems={newsItems} tickerItems={tickerItems} user={user} scoutScore={scoutScore} />}
            {activeTab === DashboardTab.PROFILE && <ProfileTab user={user} players={players} events={events} onUpdateUser={onUpdateProfile} onNavigate={setActiveTab} scoutScore={scoutScore} onOpenBeam={() => setIsBeamOpen(true)} />}
            {activeTab === DashboardTab.KNOWLEDGE && <KnowledgeTab user={user} />}
            
            {isSubmissionOpen && <PlayerSubmission onClose={handleCloseSubmission} onAddPlayer={onAddPlayer} onUpdatePlayer={onUpdatePlayer} existingPlayers={players} editingPlayer={editingPlayer} />}
            {isBeamOpen && <SidelineBeam user={user} onClose={() => setIsBeamOpen(false)} />}
        </main>

        <nav className="md:hidden fixed bottom-0 w-full bg-[#05080f]/90 backdrop-blur-2xl border-t border-scout-700 z-[110] p-4 flex justify-around pb-8">
            <button onClick={() => setActiveTab(DashboardTab.PLAYERS)} className={activeTab === DashboardTab.PLAYERS ? 'text-scout-accent' : 'text-gray-600'}><Users size={28}/></button>
            <button onClick={() => setIsBeamOpen(true)} className="text-scout-highlight animate-pulse"><Radio size={28}/></button>
            <div className="-mt-12 bg-[#05080f] p-3 rounded-full border-t border-scout-700 shadow-2xl">
                 <button onClick={() => setIsSubmissionOpen(true)} className="w-16 h-16 bg-scout-accent text-scout-900 rounded-full flex items-center justify-center shadow-glow"><Plus size={32}/></button>
            </div>
            <button onClick={() => setActiveTab(DashboardTab.OUTREACH)} className={activeTab === DashboardTab.OUTREACH ? 'text-scout-accent' : 'text-gray-600'}><MessageSquare size={28}/></button>
            <button onClick={() => setActiveTab(DashboardTab.PROFILE)} className={activeTab === DashboardTab.PROFILE ? 'text-scout-accent' : 'text-gray-600'}><UserCircle size={28}/></button>
        </nav>
    </div>
  );
};

export default Dashboard;
