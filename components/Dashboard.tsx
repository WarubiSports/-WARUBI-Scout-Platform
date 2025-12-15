import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Player, DashboardTab, ScoutingEvent, PlayerStatus, OutreachLog, NewsItem, AppNotification, StrategyTask } from '../types';
import { ITP_REFERENCE_PLAYERS } from '../constants';
import PlayerCard from './PlayerCard';
import EventHub from './EventHub';
import KnowledgeTab from './KnowledgeTab';
import ProfileTab from './ProfileTab';
import OutreachTab from './OutreachTab';
import NewsTab from './NewsTab';
import PlayerSubmission from './PlayerSubmission';
import TutorialOverlay from './TutorialOverlay';
import Confetti from './Confetti';
import StrategyPanel from './StrategyPanel';
import { generateDailyStrategy } from '../services/geminiService';
import { LayoutDashboard, Users, CalendarDays, GraduationCap, CheckCircle, UserCircle, MessageSquare, LayoutGrid, List, ChevronDown, MessageCircle as MsgIcon, Search, Filter, ChevronLeft, ChevronRight, HelpCircle, PlusCircle, Sparkles, Newspaper, X, Zap, Info, Trophy, BookOpen, EyeOff, Award, Bell, Check, Wifi, WifiOff, CloudOff, Plus, ChevronUp, Send, MoreHorizontal, StickyNote, Edit2, MapPin, Sun, Moon } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  players: Player[];
  events: ScoutingEvent[];
  newsItems: NewsItem[];
  tickerItems: string[];
  notifications: AppNotification[];
  scoutScore?: number; // New Prop
  onAddPlayer: (player: Player) => void;
  onUpdateProfile?: (profile: UserProfile) => void;
  onAddEvent: (event: ScoutingEvent) => void;
  onUpdateEvent: (event: ScoutingEvent) => void;
  onAddNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  onMarkAllRead: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    user, 
    players: initialPlayers, 
    events, 
    newsItems,
    tickerItems,
    notifications,
    scoutScore = 0,
    onAddPlayer, 
    onUpdateProfile,
    onAddEvent,
    onUpdateEvent,
    onAddNotification,
    onMarkAllRead
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.PLAYERS);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true); // Default to showing tutorial on load
  const [showDailyKickoff, setShowDailyKickoff] = useState(true); // Default to show
  const [showTierGuide, setShowTierGuide] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false); // New Celebration State
  const [placedPlayerName, setPlacedPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);
  
  // Strategy Task State
  const [strategyTasks, setStrategyTasks] = useState<StrategyTask[]>([]);

  // Offline & Notification State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  
  // High Contrast Mode
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Mobile Specific State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobilePipelineMode, setMobilePipelineMode] = useState<'STAGES' | 'LIST'>('STAGES');
  const [mobileStage, setMobileStage] = useState<PlayerStatus>(PlayerStatus.LEAD);
  const [selectedMobilePlayer, setSelectedMobilePlayer] = useState<Player | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme Toggle Effect
  useEffect(() => {
      if (isHighContrast) {
          document.body.classList.add('light-mode');
      } else {
          document.body.classList.remove('light-mode');
      }
  }, [isHighContrast]);

  // Strategy Generation Effect
  useEffect(() => {
      if (user.strategyTasks && user.strategyTasks.length > 0) {
          setStrategyTasks(user.strategyTasks);
      } else {
          // Generate new strategy if none exists
          const tasks = generateDailyStrategy(players, events);
          setStrategyTasks(tasks);
          // Ideally persist this back to user profile via onUpdateProfile if we had API persistence
      }
  }, [user, players, events]); // Re-run if data changes significantly
  
  // Drag and Drop State
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  // View & Filter State
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All'); // Primarily for List View
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const prospectCount = players.filter(p => p.status === PlayerStatus.PROSPECT).length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // --- OFFLINE SYNC LOGIC ---
  useEffect(() => {
      // Sync players if initialPlayers changes (though local state might diverge)
      setPlayers(initialPlayers);
  }, [initialPlayers]);

  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
          // Check for offline queue
          const offlineQueue = JSON.parse(localStorage.getItem('warubi_offline_players') || '[]');
          if (offlineQueue.length > 0) {
              onAddNotification({
                  type: 'SUCCESS',
                  title: 'Connection Restored',
                  message: `Syncing ${offlineQueue.length} players added while offline...`
              });
              
              // Simulate Sync Process
              setTimeout(() => {
                  offlineQueue.forEach((p: Player) => onAddPlayer(p));
                  localStorage.removeItem('warubi_offline_players');
                  onAddNotification({
                      type: 'SUCCESS',
                      title: 'Sync Complete',
                      message: 'All offline data has been uploaded to the cloud.'
                  });
              }, 1500);
          } else {
              onAddNotification({ type: 'INFO', title: 'Back Online', message: 'Connection restored.' });
          }
      };

      const handleOffline = () => {
          setIsOnline(false);
          onAddNotification({ type: 'WARNING', title: 'Offline Mode Active', message: 'You can still add players. Data will sync when connection returns.' });
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, [onAddNotification, onAddPlayer]);

  const handleNewPlayer = (player: Player) => {
      if (!isOnline) {
          // Save to local storage queue
          const currentQueue = JSON.parse(localStorage.getItem('warubi_offline_players') || '[]');
          const playerWithFlag = { ...player, notes: (player.notes || '') + ' [Pending Sync]' };
          localStorage.setItem('warubi_offline_players', JSON.stringify([...currentQueue, playerWithFlag]));
          
          // Update local state immediately for UX
          setPlayers(prev => [playerWithFlag, ...prev]);
          setActiveTab(DashboardTab.PLAYERS);
          return;
      }

      setPlayers(prev => [player, ...prev]);
      onAddPlayer(player);
      setActiveTab(DashboardTab.PLAYERS);
  };

  const handleBulkAddPlayers = (newPlayers: Player[]) => {
      setPlayers(prev => [...newPlayers, ...prev]);
      newPlayers.forEach(p => onAddPlayer(p));
  };

  const handleStatusChange = (id: string, newStatus: PlayerStatus, extraData?: string) => {
      // Check for Placement Celebration
      if (newStatus === PlayerStatus.PLACED) {
          const player = players.find(p => p.id === id);
          if (player && player.status !== PlayerStatus.PLACED) {
              setPlacedPlayerName(player.name);
              setShowCelebration(true);
          }
      }

      setPlayers(prev => prev.map(p => {
          if (p.id !== id) return p;
          const updated = {
              ...p,
              status: newStatus,
              interestedProgram: newStatus === PlayerStatus.INTERESTED && extraData ? extraData : p.interestedProgram,
              placedLocation: newStatus === PlayerStatus.PLACED && extraData ? extraData : p.placedLocation
          };
          // Update selected mobile player if active to reflect changes immediately in modal
          if (selectedMobilePlayer && selectedMobilePlayer.id === id) {
              setSelectedMobilePlayer(updated);
          }
          return updated;
      }));
  };

  const handleUpdateNotes = (id: string, notes: string) => {
      setPlayers(prev => prev.map(p => {
          if (p.id !== id) return p;
          const updated = { ...p, notes };
          if (selectedMobilePlayer && selectedMobilePlayer.id === id) {
              setSelectedMobilePlayer(updated);
          }
          return updated;
      }));
  };

  const handleMessageSent = (id: string, log: Omit<OutreachLog, 'id'>) => {
      setPlayers(prev => prev.map(p => {
          if (p.id !== id) return p;
          const newLog: OutreachLog = {
              ...log,
              id: Date.now().toString()
          };
          // Ensure logs exist (handling potential old data structure)
          const currentLogs = p.outreachLogs || [];
          return {
              ...p,
              outreachLogs: [newLog, ...currentLogs]
          };
      }));
  };

  // --- SMART LINK TRACKING & SHADOW PIPELINE LOGIC ---
  const handlePlayerAction = (playerId: string, action: 'viewed' | 'submitted') => {
      setPlayers(prev => prev.map(p => {
          if (p.id !== playerId) return p;
          
          const updates: Partial<Player> = {
              lastActive: new Date().toISOString(),
              activityStatus: action
          };

          // SHADOW PIPELINE LOGIC:
          // If a hidden PROSPECT submits the form, they are promoted to INTERESTED automatically.
          if (action === 'submitted') {
               if (p.status === PlayerStatus.PROSPECT || p.status === PlayerStatus.LEAD) {
                   updates.status = PlayerStatus.INTERESTED;
                   updates.interestedProgram = "Assessment Received (Pending Review)"; 
                   // Trigger notification instead of alert
                   onAddNotification({
                       type: 'SUCCESS',
                       title: 'Shadow Pipeline Activated',
                       message: `${p.name} completed the assessment! Promoted from '${p.status}' to 'Interested'.`
                   });
               }
          }

          return { ...p, ...updates };
      }));
  };

  const jumpToOutreach = (player: Player) => {
      setOutreachTargetId(player.id);
      setActiveTab(DashboardTab.OUTREACH);
      setSelectedMobilePlayer(null); // Close modal if open
  };

  // Strategy Action Handler
  const handleStrategyAction = (actionLink: string) => {
      if (!actionLink) return;
      
      const parts = actionLink.split(':');
      const actionType = parts[0]; // e.g. TAB, MODAL

      if (actionType === 'TAB') {
          const tabName = parts[1];
          const param = parts[2];

          switch(tabName) {
              case 'OUTREACH':
                  setActiveTab(DashboardTab.OUTREACH);
                  if (param) setOutreachTargetId(param);
                  break;
              case 'EVENTS':
                  setActiveTab(DashboardTab.EVENTS);
                  // Could add logic to auto-expand event if param exists
                  break;
              case 'KNOWLEDGE':
                  setActiveTab(DashboardTab.KNOWLEDGE);
                  break;
              case 'PLAYERS':
                  setActiveTab(DashboardTab.PLAYERS);
                  break;
              default:
                  break;
          }
      } else if (actionType === 'MODAL') {
          if (parts[1] === 'ADD_PLAYER') {
              setIsSubmissionOpen(true);
          }
      }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (id: string) => {
      setDraggedPlayerId(id);
  };

  const handleDragEnd = () => {
      setDraggedPlayerId(null);
  };

  const handleDrop = (e: React.DragEvent, status: PlayerStatus) => {
      e.preventDefault();
      if (draggedPlayerId) {
          handleStatusChange(draggedPlayerId, status);
          setDraggedPlayerId(null);
      }
  };

  // --- Filtering Logic ---
  const filteredPlayers = players.filter(p => {
      // SHADOW PIPELINE: Hide Prospects from the main board/list
      // They only appear in Outreach or if they get promoted
      if (p.status === PlayerStatus.PROSPECT) return false;

      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.evaluation?.summary || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTier = tierFilter === 'All' || p.evaluation?.scholarshipTier === tierFilter;
      
      // For Board View, we usually want to see all statuses in columns, so we ignore statusFilter
      // For List View, we might want to filter by specific status
      const matchesStatus = viewMode === 'board' ? true : (statusFilter === 'All' || p.status === statusFilter);

      return matchesSearch && matchesTier && matchesStatus;
  });

  // --- Pagination Logic (List View) ---
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = filteredPlayers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const PipelineColumn = ({ title, status, count, children }: { title: string, status: PlayerStatus, count: number, children?: React.ReactNode }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div 
            className={`flex-1 min-w-[300px] flex flex-col h-full rounded-xl border transition-colors ${isDragOver ? 'bg-scout-800/80 border-scout-accent shadow-lg shadow-scout-accent/10' : 'bg-scout-800/30 border-scout-700/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { setIsDragOver(false); handleDrop(e, status); }}
        >
            <div className="p-4 border-b border-scout-700/50 flex justify-between items-center sticky top-0 bg-scout-900/90 backdrop-blur rounded-t-xl z-10">
                <h3 className="font-bold text-white">{title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border border-scout-700 ${isDragOver ? 'bg-scout-accent text-scout-900 font-bold' : 'bg-scout-800 text-gray-300'}`}>{count}</span>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {children}
                {isDragOver && (
                    <div className="border-2 border-dashed border-scout-accent/50 rounded-lg h-24 flex items-center justify-center bg-scout-accent/5 animate-pulse">
                        <span className="text-scout-accent font-medium text-sm">Drop here</span>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const tierColor = (tier?: string) => {
    if (tier === 'Tier 1') return 'bg-scout-accent text-scout-900 border-scout-accent';
    if (tier === 'Tier 2') return 'bg-scout-highlight/20 text-scout-highlight border-scout-highlight';
    return 'bg-gray-700 text-gray-300 border-gray-600';
  };

  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-scout-accent';
    if (score >= 70) return 'text-scout-highlight';
    return 'text-gray-400';
  };

  // --- Daily Kickoff Component ---
  const DailyKickoff = () => (
      <div className="mb-6 bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-600 rounded-xl p-6 relative overflow-hidden animate-fade-in shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-scout-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          
          <button onClick={() => setShowDailyKickoff(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white">
              <X size={16} />
          </button>

          <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 bg-scout-accent rounded-full flex items-center justify-center text-scout-900 font-bold shrink-0 shadow-glow">
                  <Zap size={24} />
              </div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">Daily Kickoff</h3>
                  <p className="text-sm text-gray-400">Keep the pipeline moving. Choose one high-impact action for today:</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto overflow-x-auto">
                   <div className="bg-scout-900/50 border border-scout-700 p-3 rounded-lg min-w-[140px] text-center cursor-pointer hover:border-scout-accent transition-colors" onClick={() => setActiveTab(DashboardTab.OUTREACH)}>
                      <MessageSquare size={16} className="mx-auto mb-2 text-blue-400" />
                      <div className="text-xs font-bold text-white">Message 1 Lead</div>
                   </div>
                   <div className="bg-scout-900/50 border border-scout-700 p-3 rounded-lg min-w-[140px] text-center cursor-pointer hover:border-scout-accent transition-colors" onClick={() => setIsSubmissionOpen(true)}>
                      <PlusCircle size={16} className="mx-auto mb-2 text-green-400" />
                      <div className="text-xs font-bold text-white">Log 1 Player</div>
                   </div>
                   <div className="bg-scout-900/50 border border-scout-700 p-3 rounded-lg min-w-[140px] text-center cursor-pointer hover:border-scout-accent transition-colors" onClick={() => setActiveTab(DashboardTab.KNOWLEDGE)}>
                      <GraduationCap size={16} className="mx-auto mb-2 text-yellow-400" />
                      <div className="text-xs font-bold text-white">Learn 1 Rule</div>
                   </div>
              </div>
          </div>
      </div>
  );

  // ... (Keeping all other existing sub-components like MobilePlayerDetail, MobilePipelineView, TierExplanationModal, CelebrationOverlay) ...
  // Re-declaring for brevity in response, but logic remains same.
  
  const MobilePlayerDetail = ({ player, onClose }: { player: Player, onClose: () => void }) => {
      // (Implementation same as before)
      const [editNote, setEditNote] = useState(player.notes || '');
      const [isEditingNote, setIsEditingNote] = useState(false);
      const saveNote = () => { handleUpdateNotes(player.id, editNote); setIsEditingNote(false); }
      return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
              <div className="bg-scout-900 w-full rounded-t-2xl border-t border-scout-700 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}><div className="w-12 h-1.5 bg-scout-700 rounded-full"></div></div>
                  <div className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-4 items-center">
                              <div className="w-16 h-16 rounded-full bg-scout-800 border-2 border-scout-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg">{player.name.charAt(0)}</div>
                              <div><h2 className="text-2xl font-black text-white leading-none mb-1">{player.name}</h2><p className="text-gray-400 font-medium">{player.position} • {player.age} yo</p><p className="text-xs text-scout-accent mt-1">{player.evaluation?.collegeLevel || 'Unrated'}</p></div>
                          </div>
                          <div className="text-center bg-scout-800 p-2 rounded-lg border border-scout-700"><div className={`text-2xl font-black leading-none ${scoreColor(player.evaluation?.score || 0)}`}>{player.evaluation?.score || '-'}</div><div className="text-[9px] text-gray-500 uppercase font-bold">Score</div></div>
                      </div>
                      <div className="bg-scout-800 p-3 rounded-xl border border-scout-700 flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-gray-400 uppercase">Pipeline Status</span>
                          <div className="relative">
                              <select value={player.status} onChange={(e) => handleStatusChange(player.id, e.target.value as PlayerStatus)} className="appearance-none bg-scout-900 text-xs font-bold text-white pl-3 pr-8 py-2 rounded-lg border border-scout-600 focus:outline-none focus:border-scout-accent">
                                  <option value={PlayerStatus.LEAD}>Lead</option><option value={PlayerStatus.INTERESTED}>Interested</option><option value={PlayerStatus.FINAL_REVIEW}>Final Review</option><option value={PlayerStatus.OFFERED}>Offered</option><option value={PlayerStatus.PLACED}>Placed</option><option value={PlayerStatus.ARCHIVED}>Archived</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-6">
                      {player.evaluation?.summary && <div className="bg-scout-800/50 p-4 rounded-xl border-l-4 border-scout-accent"><h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2"><Sparkles size={12}/> Scout Assessment</h4><p className="text-sm text-gray-200 italic leading-relaxed">"{player.evaluation.summary}"</p></div>}
                      <div className="grid grid-cols-2 gap-3"><div className="bg-scout-800 p-3 rounded-lg border border-scout-700"><span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Scholarship Tier</span><span className={`text-xs font-bold px-2 py-1 rounded border inline-block ${tierColor(player.evaluation?.scholarshipTier)}`}>{player.evaluation?.scholarshipTier || 'N/A'}</span></div><div className="bg-scout-800 p-3 rounded-lg border border-scout-700"><span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Club / Team</span><span className="text-xs font-bold text-white truncate block">{player.interestedProgram?.split('(')[0] || 'Unknown'}</span></div></div>
                      <div>
                          <div className="flex justify-between items-center mb-2"><h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><StickyNote size={12}/> Notes</h4><button onClick={() => setIsEditingNote(!isEditingNote)} className="text-xs text-scout-accent hover:text-white">{isEditingNote ? 'Cancel' : 'Edit'}</button></div>
                          {isEditingNote ? <div className="space-y-2"><textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} className="w-full bg-scout-800 border border-scout-600 rounded p-3 text-sm text-white focus:outline-none focus:border-scout-accent h-32" placeholder="Add private notes..." /><button onClick={saveNote} className="w-full bg-scout-700 hover:bg-scout-600 text-white py-2 rounded font-bold text-xs">Save Note</button></div> : <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 min-h-[80px]"><p className="text-sm text-gray-300 whitespace-pre-wrap">{player.notes || 'No notes added.'}</p></div>}
                      </div>
                  </div>
                  <div className="p-4 border-t border-scout-700 bg-scout-800 flex gap-3 pb-safe"><button onClick={() => jumpToOutreach(player)} className="flex-1 bg-white text-scout-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><MessageSquare size={18} /> Message</button><button onClick={onClose} className="px-6 py-3 bg-scout-700 text-gray-300 font-bold rounded-xl active:scale-95 transition-transform">Close</button></div>
              </div>
          </div>
      );
  }

  const MobilePipelineView = () => {
      const stages = [PlayerStatus.LEAD, PlayerStatus.INTERESTED, PlayerStatus.FINAL_REVIEW, PlayerStatus.OFFERED, PlayerStatus.PLACED];
      const displayedPlayers = mobilePipelineMode === 'LIST' ? filteredPlayers : filteredPlayers.filter(p => p.status === mobileStage);
      return (
          <div className="flex flex-col h-full relative">
              <div className="sticky top-0 bg-scout-900 z-10 space-y-3 pb-2 border-b border-scout-800 mb-2">
                  <div className="bg-scout-800 p-1 rounded-lg flex border border-scout-700"><button onClick={() => setMobilePipelineMode('STAGES')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${mobilePipelineMode === 'STAGES' ? 'bg-scout-700 text-white shadow-sm' : 'text-gray-400'}`}>By Stage</button><button onClick={() => setMobilePipelineMode('LIST')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${mobilePipelineMode === 'LIST' ? 'bg-scout-700 text-white shadow-sm' : 'text-gray-400'}`}>All Players</button></div>
                  {mobilePipelineMode === 'STAGES' ? (<div className="flex overflow-x-auto custom-scrollbar gap-2 pb-1">{stages.map(stage => { const count = players.filter(p => p.status === stage).length; return (<button key={stage} onClick={() => setMobileStage(stage)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-2 ${mobileStage === stage ? 'bg-scout-accent text-scout-900 border-scout-accent' : 'bg-scout-800 text-gray-400 border-scout-700'}`}>{stage}<span className={`px-1.5 py-0.5 rounded-full text-[10px] ${mobileStage === stage ? 'bg-scout-900/20 text-scout-900' : 'bg-scout-900 text-gray-500'}`}>{count}</span></button>); })}</div>) : (<div className="relative"><Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="text" placeholder="Search all players..." className="w-full bg-scout-800 border border-scout-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>)}
              </div>
              <div className="flex-1 space-y-3 pb-24 overflow-y-auto custom-scrollbar">
                  {displayedPlayers.length === 0 ? <div className="text-center py-10 text-gray-500 border-2 border-dashed border-scout-700 rounded-xl mt-4"><p>No players found.</p><button onClick={() => setIsSubmissionOpen(true)} className="text-scout-accent text-sm font-bold mt-2">Add New Player</button></div> : displayedPlayers.map(p => (<div key={p.id} onClick={() => setSelectedMobilePlayer(p)} className="bg-scout-800 border border-scout-700 rounded-xl overflow-hidden active:scale-[0.98] transition-transform p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-scout-700 border border-scout-600 flex items-center justify-center font-bold text-white text-sm shrink-0">{p.name.charAt(0)}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><h4 className="font-bold text-white text-sm truncate">{p.name}</h4>{p.evaluation?.scholarshipTier && <span className={`text-[9px] px-1.5 rounded border ${tierColor(p.evaluation.scholarshipTier)}`}>{p.evaluation.scholarshipTier.replace('Tier ', 'T')}</span>}</div><p className="text-xs text-gray-400 truncate">{p.position} • {p.age}yo • {p.interestedProgram || 'Free Agent'}</p></div><div className={`w-3 h-3 rounded-full shrink-0 ${p.status === 'Placed' ? 'bg-scout-accent' : p.status === 'Offered' ? 'bg-yellow-500' : p.status === 'Interested' ? 'bg-blue-500' : 'bg-gray-600'}`}></div></div>))}
              </div>
              {selectedMobilePlayer && <MobilePlayerDetail player={selectedMobilePlayer} onClose={() => setSelectedMobilePlayer(null)} />}
          </div>
      );
  };

  const TierExplanationModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-scout-900 w-full max-w-4xl rounded-2xl border border-scout-700 shadow-2xl relative overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-scout-700 flex justify-between items-center bg-scout-800">
                <div><h2 className="text-xl font-bold text-white">The Warubi Tier System</h2><p className="text-gray-400 text-sm">We find opportunities for every level of player.</p></div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-8 grid md:grid-cols-3 gap-6 bg-scout-900 overflow-y-auto max-h-[70vh]">
                <div className="bg-gradient-to-b from-emerald-900/20 to-scout-800 border border-emerald-500/30 rounded-xl p-6 relative group hover:border-emerald-500 transition-all"><div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Trophy size={64} /></div><span className="inline-block px-2 py-1 rounded bg-emerald-500 text-emerald-950 font-bold text-xs uppercase mb-4">Tier 1 • Elite</span><h3 className="text-2xl font-bold text-white mb-2">Pro & Top D1</h3><p className="text-gray-400 text-sm mb-6 min-h-[40px]">National team youth, academy standouts, or freak athletes.</p><div className="space-y-3"><div className="flex items-center gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span><span>Full Scholarships (NCAA D1)</span></div><div className="flex items-center gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span><span>Pro Development Contracts</span></div></div></div>
                <div className="bg-gradient-to-b from-amber-900/20 to-scout-800 border border-amber-500/30 rounded-xl p-6 relative group hover:border-amber-500 transition-all"><div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles size={64} /></div><span className="inline-block px-2 py-1 rounded bg-amber-500 text-amber-950 font-bold text-xs uppercase mb-4">Tier 2 • Competitive</span><h3 className="text-2xl font-bold text-white mb-2">Scholarship Level</h3><p className="text-gray-400 text-sm mb-6 min-h-[40px]">High-level regional players, ECNL/GA starters, strong stats.</p><div className="space-y-3"><div className="flex items-center gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span><span>Partial Scholarships (D1/D2/NAIA)</span></div><div className="flex items-center gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span><span>High Academic Merit Aid</span></div></div></div>
                <div className="bg-gradient-to-b from-blue-900/20 to-scout-800 border border-blue-500/30 rounded-xl p-6 relative group hover:border-blue-500 transition-all"><div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><BookOpen size={64} /></div><span className="inline-block px-2 py-1 rounded bg-blue-500 text-blue-950 font-bold text-xs uppercase mb-4">Tier 3 • Development</span><h3 className="text-2xl font-bold text-white mb-2">Roster & Academic</h3><p className="text-gray-400 text-sm mb-6 min-h-[40px]">Raw talent needing development or high-academic students.</p><div className="space-y-3"><div className="flex items-center gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span><span>Roster Spots (D3 / JuCo)</span></div><div className="flex items-center gap-2 text-sm text-gray-300"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span><span>Gap Year Programs</span></div></div></div>
            </div>
            <div className="p-6 bg-scout-800 border-t border-scout-700 text-center"><p className="text-white font-medium text-lg mb-1">"Don't filter too early."</p><p className="text-gray-400 text-sm">Submit every player with potential. Our network has placement partners for all 3 tiers.</p><button onClick={onClose} className="mt-4 px-6 py-2 bg-scout-700 hover:bg-scout-600 text-white rounded-lg font-bold transition-colors">Got it, I'll submit them all</button></div>
        </div>
    </div>
  );

  const CelebrationOverlay = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"><div className="bg-scout-900/90 backdrop-blur-md p-8 rounded-2xl border-2 border-scout-accent shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center animate-fade-in pointer-events-auto max-w-sm"><div className="w-20 h-20 bg-gradient-to-tr from-scout-accent to-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><Award size={40} className="text-scout-900" /></div><h2 className="text-3xl font-black text-white mb-1 tracking-tight">PLAYER PLACED!</h2><p className="text-gray-300 text-lg mb-4">Great work securing a future for <br/><strong className="text-white">{placedPlayerName}</strong>.</p><div className="bg-scout-800 p-3 rounded-lg border border-scout-700 text-sm text-gray-400 mb-6"><p>Commission Status: <span className="text-scout-accent font-bold">Unlocked</span></p></div><button onClick={() => setShowCelebration(false)} className="bg-white hover:bg-gray-100 text-scout-900 font-bold px-6 py-3 rounded-xl shadow-lg transition-all">Keep Scouting</button></div></div>
  );

  const BottomTab = ({ icon, label, isActive, onClick }: any) => (
      <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${isActive ? 'text-scout-accent' : 'text-gray-500 hover:text-gray-300'}`}>{React.cloneElement(icon, { size: 20, className: isActive ? 'text-scout-accent' : 'text-gray-500' })}<span className="text-[10px] font-bold mt-1">{label}</span></button>
  );

  return (
    <div className="flex h-screen bg-scout-900 text-white overflow-hidden relative transition-colors duration-300">
        {/* Confetti & Celebration */}
        {showCelebration && (<><Confetti onComplete={() => setShowCelebration(false)} /><CelebrationOverlay /></>)}

        {/* Offline Warning Banner */}
        {!isOnline && (<div className="absolute top-0 w-full bg-red-600/90 text-white text-xs font-bold text-center py-1 z-[60] flex items-center justify-center gap-2"><WifiOff size={12} /> Offline Mode: Changes saved to device</div>)}

        {/* Sidebar (Desktop) */}
        <aside className="w-64 bg-scout-800 border-r border-scout-700 flex flex-col hidden md:flex transition-colors duration-300">
            <div className="p-6 border-b border-scout-700">
                <h1 className="text-xl font-black tracking-tighter text-white">WARUBI<span className="text-scout-accent">SCOUT</span></h1>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
                <div className="text-xs font-bold text-gray-500 px-4 mb-2 uppercase tracking-wider">Platform</div>
                <button onClick={() => setActiveTab(DashboardTab.PLAYERS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.PLAYERS ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}><Users size={20} /> My Pipeline</button>
                <button onClick={() => setActiveTab(DashboardTab.EVENTS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.EVENTS ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}><CalendarDays size={20} /> Events</button>
                <button onClick={() => setActiveTab(DashboardTab.OUTREACH)} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all mt-2 group ${activeTab === DashboardTab.OUTREACH ? 'bg-scout-accent text-white shadow-lg shadow-emerald-900/30' : 'text-gray-300 hover:text-white hover:bg-scout-700/50'}`}><div className={`p-1 rounded ${activeTab === DashboardTab.OUTREACH ? 'bg-white/20' : 'bg-scout-accent/20 text-scout-accent group-hover:text-white group-hover:bg-scout-accent'}`}><MessageSquare size={16} /></div><span className="font-semibold">AI Outreach</span></button>
                <div className="text-xs font-bold text-gray-500 px-4 mt-6 mb-2 uppercase tracking-wider">Network</div>
                <button onClick={() => setActiveTab(DashboardTab.NEWS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.NEWS ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}><Newspaper size={20} /> Network News</button>
                <div className="text-xs font-bold text-gray-500 px-4 mt-6 mb-2 uppercase tracking-wider">Account</div>
                <button onClick={() => setActiveTab(DashboardTab.KNOWLEDGE)} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.KNOWLEDGE ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}><GraduationCap size={20} /> Knowledge</button>
                 <button onClick={() => setActiveTab(DashboardTab.PROFILE)} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.PROFILE ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}><UserCircle size={20} /> My Profile</button>
            </nav>

            {/* DYNAMIC STRATEGY PANEL (Replaces Static List) */}
            <StrategyPanel 
                persona={user.scoutPersona || 'The Scout'} 
                tasks={strategyTasks} 
                onAction={handleStrategyAction} 
            />
            
            <div className="p-4 border-t border-scout-700 space-y-3">
                {/* Theme Toggle Desktop */}
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs text-gray-500 font-bold uppercase">Display Mode</span>
                    <button 
                        onClick={() => setIsHighContrast(!isHighContrast)}
                        className={`relative w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isHighContrast ? 'bg-yellow-400' : 'bg-scout-900 border border-scout-600'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isHighContrast ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        <Sun size={10} className={`absolute right-1.5 text-white ${isHighContrast ? 'opacity-100' : 'opacity-0'}`} />
                        <Moon size={10} className={`absolute left-1.5 text-gray-400 ${!isHighContrast ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer hover:bg-scout-700/50 p-2 rounded transition-colors overflow-hidden relative group" onClick={() => setActiveTab(DashboardTab.PROFILE)}>
                        <div className="w-8 h-8 rounded-full bg-scout-accent flex items-center justify-center font-bold text-scout-900 shrink-0">{user.name.charAt(0)}</div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                            <p className="text-xs text-scout-highlight font-bold truncate">{scoutScore} XP</p>
                        </div>
                    </div>
                    <button onClick={() => setShowTutorial(true)} className="p-2 text-gray-500 hover:text-white hover:bg-scout-700/50 rounded transition-colors shrink-0" title="App Tutorial"><HelpCircle size={18} /></button>
                </div>
            </div>
        </aside>

        {/* Mobile Header (Minimal) */}
        <div className="md:hidden fixed top-0 w-full bg-scout-800 z-40 p-4 flex justify-between items-center border-b border-scout-700 shadow-md">
             <h1 className="text-lg font-bold">WARUBI<span className="text-scout-accent">SCOUT</span></h1>
             <div className="flex gap-4 items-center">
                 <div className="text-xs font-bold text-scout-highlight bg-scout-900 px-2 py-1 rounded border border-scout-700">{scoutScore} XP</div>
                 <button onClick={() => setIsHighContrast(!isHighContrast)} className="text-gray-400 hover:text-white">
                     {isHighContrast ? <Sun size={20} className="text-yellow-400 fill-yellow-400" /> : <Moon size={20} />}
                 </button>
                 {isOnline ? <Wifi size={18} className="text-green-500"/> : <CloudOff size={18} className="text-red-500"/>}
                 <button onClick={() => setShowTutorial(true)} className="text-gray-400"><HelpCircle size={24} /></button>
             </div>
        </div>

        {/* Mobile FAB (Add Player) - Only show on Players/Outreach tabs */}
        {(activeTab === DashboardTab.PLAYERS || activeTab === DashboardTab.OUTREACH) && (
            <button 
                onClick={() => setIsSubmissionOpen(true)}
                className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-scout-accent hover:bg-emerald-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-2xl shadow-emerald-900/50 border-4 border-scout-900 active:scale-95 transition-all"
            >
                <Plus size={32} />
            </button>
        )}

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 w-full bg-scout-800 border-t border-scout-700 z-40 pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                <BottomTab icon={<Users/>} label="Pipeline" isActive={activeTab === DashboardTab.PLAYERS} onClick={() => setActiveTab(DashboardTab.PLAYERS)} />
                <BottomTab icon={<CalendarDays/>} label="Events" isActive={activeTab === DashboardTab.EVENTS} onClick={() => setActiveTab(DashboardTab.EVENTS)} />
                <div className="w-16"></div>
                <BottomTab icon={<MessageSquare/>} label="Outreach" isActive={activeTab === DashboardTab.OUTREACH} onClick={() => setActiveTab(DashboardTab.OUTREACH)} />
                <BottomTab icon={<UserCircle/>} label="Profile" isActive={activeTab === DashboardTab.PROFILE} onClick={() => setActiveTab(DashboardTab.PROFILE)} />
            </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8 bg-scout-900 relative transition-colors duration-300">
            {/* Notification Bell */}
            <div className="absolute top-6 right-8 z-30 hidden md:block" ref={notifButtonRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 bg-scout-800 border border-scout-700 rounded-full hover:bg-scout-700 transition-colors text-gray-300 hover:text-white"><Bell size={20} />{unreadNotifications > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-scout-900 animate-pulse"></span>}</button>
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-scout-800 border border-scout-600 rounded-xl shadow-2xl overflow-hidden z-40 animate-fade-in">
                        <div className="p-3 border-b border-scout-700 flex justify-between items-center bg-scout-900/50"><h4 className="text-xs font-bold text-white uppercase">Notifications</h4><button onClick={onMarkAllRead} className="text-[10px] text-scout-accent hover:underline">Mark all read</button></div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">{notifications.length === 0 ? (<div className="p-4 text-center text-xs text-gray-500">No new notifications</div>) : (notifications.map(notif => (<div key={notif.id} className={`p-3 border-b border-scout-700/50 hover:bg-scout-700/30 transition-colors ${!notif.read ? 'bg-scout-700/20' : ''}`}><div className="flex gap-3"><div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.read ? 'bg-scout-accent' : 'bg-gray-600'}`}></div><div><p className="text-xs text-gray-400 mb-0.5 font-bold flex items-center gap-1">{notif.type === 'SUCCESS' && <CheckCircle size={10} className="text-green-400"/>}{notif.type === 'WARNING' && <Award size={10} className="text-yellow-400"/>}{notif.title}</p><p className="text-xs text-white leading-snug">{notif.message}</p><p className="text-[9px] text-gray-600 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p></div></div></div>)))}</div>
                    </div>
                )}
            </div>

            {/* Content Tabs */}
            {activeTab === DashboardTab.PLAYERS && (
                <div className="space-y-6 animate-fade-in h-full flex flex-col">
                    {/* ... Existing Player View ... */}
                    {isMobile ? (<MobilePipelineView />) : (<>{showDailyKickoff && <DailyKickoff />}<div className="flex flex-col md:flex-row justify-between items-end gap-4 flex-shrink-0"><div><h2 className="text-3xl font-bold mb-1">Recruiting Pipeline</h2><p className="text-gray-400">Manage and track your talent pool.</p></div><div className="flex gap-4 items-center hidden md:flex"><button onClick={() => setIsSubmissionOpen(true)} className="bg-scout-accent hover:bg-emerald-600 text-white px-6 py-2.5 rounded font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2"><PlusCircle size={18} className="text-scout-900" /> Add Player</button></div></div><div className="bg-scout-800 p-3 rounded-lg border border-scout-700 flex flex-col md:flex-row gap-4 items-center justify-between flex-shrink-0"><div className="flex items-center gap-3 w-full md:w-auto"><div className="relative w-full md:w-64"><Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="text" placeholder="Search database..." className="w-full bg-scout-900 border border-scout-700 rounded pl-9 pr-3 py-2 text-sm text-white focus:border-scout-accent outline-none" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} /></div><div className="relative group/filter"><div className="flex items-center gap-2 bg-scout-900 border border-scout-700 px-3 py-2 rounded text-sm text-gray-300 cursor-pointer hover:border-scout-500"><Filter size={16} /><span>{tierFilter === 'All' ? 'All Tiers' : tierFilter}</span><ChevronDown size={14} /></div><select className="absolute inset-0 opacity-0 cursor-pointer" value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setCurrentPage(1); }}><option value="All">All Tiers</option><option value="Tier 1">Tier 1 (Elite)</option><option value="Tier 2">Tier 2 (Competitive)</option><option value="Tier 3">Tier 3 (Development)</option></select></div><button onClick={() => setShowTierGuide(true)} className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors border border-transparent hover:border-scout-700 rounded" title="Understanding Tiers"><Info size={16} /> <span className="hidden md:inline">Tier Guide</span></button>{viewMode === 'list' && (<div className="relative group/filter"><div className="flex items-center gap-2 bg-scout-900 border border-scout-700 px-3 py-2 rounded text-sm text-gray-300 cursor-pointer hover:border-scout-500"><span>{statusFilter === 'All' ? 'All Status' : statusFilter}</span><ChevronDown size={14} /></div><select className="absolute inset-0 opacity-0 cursor-pointer" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}><option value="All">All Statuses</option><option value={PlayerStatus.LEAD}>Leads</option><option value={PlayerStatus.INTERESTED}>Interested</option><option value={PlayerStatus.FINAL_REVIEW}>Final Review</option><option value={PlayerStatus.OFFERED}>Offered</option><option value={PlayerStatus.PLACED}>Placed</option></select></div>)}</div><div className="flex bg-scout-900 rounded p-1 border border-scout-700"><button onClick={() => setViewMode('board')} className={`p-2 rounded flex items-center gap-2 transition-colors ${viewMode === 'board' ? 'bg-scout-700 text-white' : 'text-gray-400 hover:text-gray-200'}`} title="Board View"><LayoutGrid size={18} /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-scout-700 text-white' : 'text-gray-400 hover:text-gray-200'}`} title="Compact List View"><List size={18} /></button></div></div>{viewMode === 'board' ? (<div className="flex gap-4 overflow-x-auto pb-4 flex-1"><PipelineColumn title="Leads" status={PlayerStatus.LEAD} count={filteredPlayers.filter(p => p.status === PlayerStatus.LEAD).length}>{filteredPlayers.filter(p => p.status === PlayerStatus.LEAD).map(p => (<PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onUpdateNotes={handleUpdateNotes}/>))}{filteredPlayers.filter(p => p.status === PlayerStatus.LEAD).length === 0 && (<div className="text-center py-10 text-gray-500 border-2 border-dashed border-scout-700 rounded-lg text-sm flex flex-col items-center justify-center"><p className="mb-2">No active leads found.</p>{prospectCount > 0 && (<div className="bg-scout-900/50 p-3 rounded-lg border border-scout-700/50 inline-block max-w-xs mt-2"><p className="text-xs text-gray-300 mb-2"><EyeOff size={12} className="inline mr-1 text-scout-highlight"/>You have <strong>{prospectCount} hidden prospects</strong> in your Shadow Pipeline.</p><button onClick={() => setActiveTab(DashboardTab.OUTREACH)} className="text-xs bg-scout-accent text-scout-900 px-3 py-1.5 rounded font-bold hover:bg-white transition-colors">Go to Outreach to Activate</button></div>)}</div>)}</PipelineColumn><PipelineColumn title="Interested" status={PlayerStatus.INTERESTED} count={filteredPlayers.filter(p => p.status === PlayerStatus.INTERESTED).length}>{filteredPlayers.filter(p => p.status === PlayerStatus.INTERESTED).map(p => (<PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onUpdateNotes={handleUpdateNotes}/>))}</PipelineColumn><PipelineColumn title="Final Review" status={PlayerStatus.FINAL_REVIEW} count={filteredPlayers.filter(p => p.status === PlayerStatus.FINAL_REVIEW).length}>{filteredPlayers.filter(p => p.status === PlayerStatus.FINAL_REVIEW).map(p => (<PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onUpdateNotes={handleUpdateNotes}/>))}</PipelineColumn><PipelineColumn title="Offered" status={PlayerStatus.OFFERED} count={filteredPlayers.filter(p => p.status === PlayerStatus.OFFERED).length}>{filteredPlayers.filter(p => p.status === PlayerStatus.OFFERED).map(p => (<PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onUpdateNotes={handleUpdateNotes}/>))}</PipelineColumn><PipelineColumn title="Placed" status={PlayerStatus.PLACED} count={filteredPlayers.filter(p => p.status === PlayerStatus.PLACED).length}>{filteredPlayers.filter(p => p.status === PlayerStatus.PLACED).map(p => (<PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onUpdateNotes={handleUpdateNotes}/>))}</PipelineColumn></div>) : (<div className="flex-1 bg-scout-800 rounded-xl border border-scout-700 overflow-hidden flex flex-col"><div className="overflow-auto flex-1 custom-scrollbar"><table className="w-full text-left border-collapse"><thead className="bg-scout-900 sticky top-0 z-10 text-xs uppercase font-bold text-gray-500 shadow-sm"><tr><th className="p-4 border-b border-scout-700">Player Name</th><th className="p-4 border-b border-scout-700">Position</th><th className="p-4 border-b border-scout-700">Age</th><th className="p-4 border-b border-scout-700">Status</th><th className="p-4 border-b border-scout-700 text-center">Score</th><th className="p-4 border-b border-scout-700">Projection</th><th className="p-4 border-b border-scout-700">Target Program</th><th className="p-4 border-b border-scout-700 text-right">Action</th></tr></thead><tbody className="divide-y divide-scout-700/50 text-sm">{paginatedPlayers.length > 0 ? paginatedPlayers.map(p => (<tr key={p.id} className="hover:bg-scout-700/30 transition-colors group"><td className="p-4 text-white font-medium"><div className="flex flex-col"><span>{p.name}</span>{p.evaluation?.scholarshipTier && (<span className={`text-[10px] w-fit px-1.5 rounded mt-1 border ${tierColor(p.evaluation.scholarshipTier)}`}>{p.evaluation.scholarshipTier}</span>)}</div></td><td className="p-4 text-gray-300">{p.position}</td><td className="p-4 text-gray-300">{p.age}</td><td className="p-4"><div className="relative group/select w-fit"><select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value as PlayerStatus)} className="appearance-none bg-scout-900 text-[10px] font-bold uppercase tracking-wider pl-2 pr-6 py-1 rounded border border-scout-700 text-gray-300 focus:border-scout-accent focus:outline-none cursor-pointer hover:bg-scout-700 transition-colors"><option value={PlayerStatus.LEAD}>Lead</option><option value={PlayerStatus.INTERESTED}>Interested</option><option value={PlayerStatus.FINAL_REVIEW}>Final Review</option><option value={PlayerStatus.OFFERED}>Offered</option><option value={PlayerStatus.PLACED}>Placed</option><option value={PlayerStatus.ARCHIVED}>Archived</option></select><ChevronDown size={10} className="absolute right-1.5 top-2 text-gray-500 pointer-events-none" /></div></td><td className="p-4 text-center"><span className={`font-black text-lg ${scoreColor(p.evaluation?.score || 0)}`}>{p.evaluation?.score || '-'}</span></td><td className="p-4 text-gray-400 text-xs">{p.evaluation?.collegeLevel || 'Pending'}</td><td className="p-4 text-gray-400 text-xs font-medium text-scout-highlight">{(p.status === PlayerStatus.INTERESTED && p.interestedProgram) ? p.interestedProgram : (p.status === PlayerStatus.PLACED && p.placedLocation) ? p.placedLocation : (p.status === PlayerStatus.OFFERED && p.placedLocation) ? p.placedLocation : '-'}</td><td className="p-4 text-right"><button onClick={() => jumpToOutreach(p)} className="p-2 rounded hover:bg-scout-700 text-scout-accent transition-colors" title="Message Player"><MsgIcon size={18} /></button></td></tr>)) : (<tr><td colSpan={8} className="p-8 text-center text-gray-500">No players found matching your filters.</td></tr>)}</tbody></table></div><div className="p-3 border-t border-scout-700 bg-scout-900 flex justify-between items-center text-sm"><span className="text-gray-500">Showing {paginatedPlayers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredPlayers.length)} of {filteredPlayers.length}</span><div className="flex gap-2"><button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded hover:bg-scout-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300"><ChevronLeft size={16} /></button><span className="px-3 py-2 text-gray-400 font-medium">Page {currentPage} of {totalPages || 1}</span><button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded hover:bg-scout-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300"><ChevronRight size={16} /></button></div></div></div>)}</>)}
                </div>
            )}

            {activeTab === DashboardTab.EVENTS && (
                <div className="animate-fade-in h-[calc(100vh-100px)]">
                    <EventHub 
                        events={events} 
                        user={user}
                        onAddEvent={onAddEvent} 
                        onUpdateEvent={onUpdateEvent}
                    />
                </div>
            )}

            {activeTab === DashboardTab.OUTREACH && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">AI Outreach Center</h2>
                    <OutreachTab 
                        players={players} 
                        user={user} 
                        initialPlayerId={outreachTargetId}
                        onMessageSent={handleMessageSent}
                        onAddPlayers={handleBulkAddPlayers}
                        onPlayerAction={handlePlayerAction}
                        onAddNotification={onAddNotification}
                    />
                </div>
            )}

            {activeTab === DashboardTab.NEWS && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">Network News & Updates</h2>
                    <NewsTab newsItems={newsItems} tickerItems={tickerItems} user={user} scoutScore={scoutScore} />
                </div>
            )}

            {activeTab === DashboardTab.KNOWLEDGE && (
                <div className="animate-fade-in">
                    <KnowledgeTab user={user} />
                    <div className="mt-8 border-t border-scout-700 pt-8">
                         <h3 className="text-xl font-bold mb-4 text-gray-300">Reference Profiles (Standards)</h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                            {ITP_REFERENCE_PLAYERS.map((p) => (
                                <PlayerCard key={p.id} player={p} isReference={true} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === DashboardTab.PROFILE && (
                <div className="animate-fade-in">
                    <ProfileTab 
                        user={user} 
                        players={players} 
                        events={events} 
                        onUpdateUser={onUpdateProfile} 
                        onNavigate={setActiveTab}
                    />
                </div>
            )}
            
            {/* Player Submission Modal */}
            {isSubmissionOpen && (
                <PlayerSubmission 
                    onClose={() => setIsSubmissionOpen(false)} 
                    onAddPlayer={handleNewPlayer} 
                    existingPlayers={players}
                />
            )}

             {/* Tutorial Overlay */}
             {showTutorial && (
                <TutorialOverlay onClose={() => setShowTutorial(false)} />
             )}

             {/* Tier Guide Modal */}
             {showTierGuide && (
                <TierExplanationModal onClose={() => setShowTierGuide(false)} />
             )}
        </main>
    </div>
  );
};

export default Dashboard;