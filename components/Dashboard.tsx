import React, { useState } from 'react';
import { UserProfile, Player, DashboardTab, ScoutingEvent, PlayerStatus, OutreachLog } from '../types';
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
import { LayoutDashboard, Users, CalendarDays, GraduationCap, CheckCircle, UserCircle, MessageSquare, LayoutGrid, List, ChevronDown, MessageCircle as MsgIcon, Search, Filter, ChevronLeft, ChevronRight, HelpCircle, PlusCircle, Sparkles, Newspaper, X, Zap, Info, Trophy, BookOpen, EyeOff, Award } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  players: Player[];
  onAddPlayer: (player: Player) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, players: initialPlayers, onAddPlayer }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.PLAYERS);
  const [events, setEvents] = useState<ScoutingEvent[]>([]);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true); // Default to showing tutorial on load
  const [showDailyKickoff, setShowDailyKickoff] = useState(true); // Default to show
  const [showTierGuide, setShowTierGuide] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false); // New Celebration State
  const [placedPlayerName, setPlacedPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);
  
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

  const handleNewPlayer = (player: Player) => {
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
          return {
              ...p,
              status: newStatus,
              interestedProgram: newStatus === PlayerStatus.INTERESTED && extraData ? extraData : p.interestedProgram,
              placedLocation: newStatus === PlayerStatus.PLACED && extraData ? extraData : p.placedLocation
          };
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
                   // Trigger a browser alert to simulate the notification
                   setTimeout(() => alert(`🎉 SHADOW PIPELINE ACTIVATED: ${p.name} completed the assessment! Promoted from '${p.status}' to 'Interested'.`), 100);
               }
          }

          return { ...p, ...updates };
      }));
  };

  const jumpToOutreach = (player: Player) => {
      setOutreachTargetId(player.id);
      setActiveTab(DashboardTab.OUTREACH);
  };

  const handleUpdateEvent = (updatedEvent: ScoutingEvent) => {
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
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

  // --- Tier Explanation Modal ---
  const TierExplanationModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-scout-900 w-full max-w-4xl rounded-2xl border border-scout-700 shadow-2xl relative overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-scout-700 flex justify-between items-center bg-scout-800">
                <div>
                    <h2 className="text-xl font-bold text-white">The Warubi Tier System</h2>
                    <p className="text-gray-400 text-sm">We find opportunities for every level of player.</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-8 grid md:grid-cols-3 gap-6 bg-scout-900 overflow-y-auto max-h-[70vh]">
                {/* TIER 1 */}
                <div className="bg-gradient-to-b from-emerald-900/20 to-scout-800 border border-emerald-500/30 rounded-xl p-6 relative group hover:border-emerald-500 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={64} />
                    </div>
                    <span className="inline-block px-2 py-1 rounded bg-emerald-500 text-emerald-950 font-bold text-xs uppercase mb-4">Tier 1 • Elite</span>
                    <h3 className="text-2xl font-bold text-white mb-2">Pro & Top D1</h3>
                    <p className="text-gray-400 text-sm mb-6 min-h-[40px]">National team youth, academy standouts, or freak athletes.</p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span>Full Scholarships (NCAA D1)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span>Pro Development Contracts</span>
                        </div>
                    </div>
                </div>

                {/* TIER 2 */}
                <div className="bg-gradient-to-b from-amber-900/20 to-scout-800 border border-amber-500/30 rounded-xl p-6 relative group hover:border-amber-500 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles size={64} />
                    </div>
                    <span className="inline-block px-2 py-1 rounded bg-amber-500 text-amber-950 font-bold text-xs uppercase mb-4">Tier 2 • Competitive</span>
                    <h3 className="text-2xl font-bold text-white mb-2">Scholarship Level</h3>
                    <p className="text-gray-400 text-sm mb-6 min-h-[40px]">High-level regional players, ECNL/GA starters, strong stats.</p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            <span>Partial Scholarships (D1/D2/NAIA)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            <span>High Academic Merit Aid</span>
                        </div>
                    </div>
                </div>

                {/* TIER 3 */}
                <div className="bg-gradient-to-b from-blue-900/20 to-scout-800 border border-blue-500/30 rounded-xl p-6 relative group hover:border-blue-500 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpen size={64} />
                    </div>
                    <span className="inline-block px-2 py-1 rounded bg-blue-500 text-blue-950 font-bold text-xs uppercase mb-4">Tier 3 • Development</span>
                    <h3 className="text-2xl font-bold text-white mb-2">Roster & Academic</h3>
                    <p className="text-gray-400 text-sm mb-6 min-h-[40px]">Raw talent needing development or high-academic students.</p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            <span>Roster Spots (D3 / JuCo)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            <span>Gap Year Programs</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-scout-800 border-t border-scout-700 text-center">
                <p className="text-white font-medium text-lg mb-1">"Don't filter too early."</p>
                <p className="text-gray-400 text-sm">Submit every player with potential. Our network has placement partners for all 3 tiers.</p>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-scout-700 hover:bg-scout-600 text-white rounded-lg font-bold transition-colors">
                    Got it, I'll submit them all
                </button>
            </div>
        </div>
    </div>
  );

  // --- Celebration Overlay ---
  const CelebrationOverlay = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-scout-900/90 backdrop-blur-md p-8 rounded-2xl border-2 border-scout-accent shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center animate-fade-in pointer-events-auto max-w-sm">
              <div className="w-20 h-20 bg-gradient-to-tr from-scout-accent to-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Award size={40} className="text-scout-900" />
              </div>
              <h2 className="text-3xl font-black text-white mb-1 tracking-tight">PLAYER PLACED!</h2>
              <p className="text-gray-300 text-lg mb-4">Great work securing a future for <br/><strong className="text-white">{placedPlayerName}</strong>.</p>
              
              <div className="bg-scout-800 p-3 rounded-lg border border-scout-700 text-sm text-gray-400 mb-6">
                  <p>Commission Status: <span className="text-scout-accent font-bold">Unlocked</span></p>
              </div>

              <button 
                onClick={() => setShowCelebration(false)}
                className="bg-white hover:bg-gray-100 text-scout-900 font-bold px-6 py-3 rounded-xl shadow-lg transition-all"
              >
                  Keep Scouting
              </button>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen bg-scout-900 text-white overflow-hidden relative">
        {/* Confetti & Celebration */}
        {showCelebration && (
            <>
                <Confetti onComplete={() => setShowCelebration(false)} />
                <CelebrationOverlay />
            </>
        )}

        {/* Sidebar */}
        <aside className="w-64 bg-scout-800 border-r border-scout-700 flex flex-col hidden md:flex">
            <div className="p-6 border-b border-scout-700">
                <h1 className="text-xl font-black tracking-tighter text-white">WARUBI<span className="text-scout-accent">SCOUT</span></h1>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
                <div className="text-xs font-bold text-gray-500 px-4 mb-2 uppercase tracking-wider">Platform</div>
                <button 
                    onClick={() => setActiveTab(DashboardTab.PLAYERS)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.PLAYERS ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}
                >
                    <Users size={20} /> My Pipeline
                </button>
                <button 
                    onClick={() => setActiveTab(DashboardTab.EVENTS)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.EVENTS ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}
                >
                    <CalendarDays size={20} /> Events
                </button>
                <button 
                    onClick={() => setActiveTab(DashboardTab.OUTREACH)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all mt-2 group ${activeTab === DashboardTab.OUTREACH ? 'bg-scout-accent text-white shadow-lg shadow-emerald-900/30' : 'text-gray-300 hover:text-white hover:bg-scout-700/50'}`}
                >
                    <div className={`p-1 rounded ${activeTab === DashboardTab.OUTREACH ? 'bg-white/20' : 'bg-scout-accent/20 text-scout-accent group-hover:text-white group-hover:bg-scout-accent'}`}>
                        <MessageSquare size={16} />
                    </div>
                    <span className="font-semibold">AI Outreach</span>
                </button>

                <div className="text-xs font-bold text-gray-500 px-4 mt-6 mb-2 uppercase tracking-wider">Network</div>
                <button 
                    onClick={() => setActiveTab(DashboardTab.NEWS)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.NEWS ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}
                >
                    <Newspaper size={20} /> Network News
                </button>

                <div className="text-xs font-bold text-gray-500 px-4 mt-6 mb-2 uppercase tracking-wider">Account</div>
                <button 
                    onClick={() => setActiveTab(DashboardTab.KNOWLEDGE)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.KNOWLEDGE ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}
                >
                    <GraduationCap size={20} /> Knowledge
                </button>
                 <button 
                    onClick={() => setActiveTab(DashboardTab.PROFILE)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === DashboardTab.PROFILE ? 'bg-scout-700 text-white' : 'text-gray-400 hover:bg-scout-700/50'}`}
                >
                    <UserCircle size={20} /> My Profile
                </button>
            </nav>

            <div className="p-4 bg-scout-900/50 m-4 rounded-lg border border-scout-700 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-scout-highlight" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">My Strategy: {user.scoutPersona || 'The Scout'}</h3>
                </div>
                <ul className="space-y-3">
                    {user.weeklyTasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <CheckCircle size={12} className="mt-0.5 text-scout-accent shrink-0" />
                            <span className="leading-tight font-medium">{task}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="p-4 border-t border-scout-700">
                <div className="flex items-center justify-between gap-2">
                    <div 
                        className="flex-1 flex items-center gap-3 cursor-pointer hover:bg-scout-700/50 p-2 rounded transition-colors overflow-hidden"
                        onClick={() => setActiveTab(DashboardTab.PROFILE)}
                    >
                        <div className="w-8 h-8 rounded-full bg-scout-accent flex items-center justify-center font-bold text-scout-900 shrink-0">
                            {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.role}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowTutorial(true)}
                        className="p-2 text-gray-500 hover:text-white hover:bg-scout-700/50 rounded transition-colors shrink-0"
                        title="App Tutorial"
                    >
                        <HelpCircle size={18} />
                    </button>
                </div>
            </div>
        </aside>

        {/* Mobile Header (Visible on small screens) */}
        <div className="md:hidden fixed top-0 w-full bg-scout-800 z-50 p-4 flex justify-between items-center border-b border-scout-700">
             <h1 className="text-lg font-bold">WARUBI<span className="text-scout-accent">SCOUT</span></h1>
             <button onClick={() => setShowTutorial(true)} className="text-gray-400">
                <HelpCircle size={24} />
             </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 bg-scout-900 relative">
            
            {activeTab === DashboardTab.PLAYERS && (
                <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
                    
                    {/* DAILY KICKOFF CARD (Persistent high-level reminder) */}
                    {showDailyKickoff && <DailyKickoff />}

                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 flex-shrink-0">
                        <div>
                            <h2 className="text-3xl font-bold mb-1">Recruiting Pipeline</h2>
                            <p className="text-gray-400">Manage and track your talent pool.</p>
                        </div>
                        <div className="flex gap-4 items-center">
                            
                             <button 
                               onClick={() => setIsSubmissionOpen(true)}
                               className="bg-scout-accent hover:bg-emerald-600 text-white px-6 py-2.5 rounded font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                            >
                                <PlusCircle size={18} className="text-scout-900" /> Add Player
                            </button>
                        </div>
                    </div>

                    {/* Filter & View Toolbar */}
                    <div className="bg-scout-800 p-3 rounded-lg border border-scout-700 flex flex-col md:flex-row gap-4 items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search database..." 
                                    className="w-full bg-scout-900 border border-scout-700 rounded pl-9 pr-3 py-2 text-sm text-white focus:border-scout-accent outline-none"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            
                            <div className="relative group/filter">
                                <div className="flex items-center gap-2 bg-scout-900 border border-scout-700 px-3 py-2 rounded text-sm text-gray-300 cursor-pointer hover:border-scout-500">
                                    <Filter size={16} />
                                    <span>{tierFilter === 'All' ? 'All Tiers' : tierFilter}</span>
                                    <ChevronDown size={14} />
                                </div>
                                <select 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    value={tierFilter}
                                    onChange={(e) => { setTierFilter(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="All">All Tiers</option>
                                    <option value="Tier 1">Tier 1 (Elite)</option>
                                    <option value="Tier 2">Tier 2 (Competitive)</option>
                                    <option value="Tier 3">Tier 3 (Development)</option>
                                </select>
                            </div>

                            <button 
                                onClick={() => setShowTierGuide(true)}
                                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors border border-transparent hover:border-scout-700 rounded"
                                title="Understanding Tiers"
                            >
                                <Info size={16} /> <span className="hidden md:inline">Tier Guide</span>
                            </button>

                            {viewMode === 'list' && (
                                <div className="relative group/filter">
                                    <div className="flex items-center gap-2 bg-scout-900 border border-scout-700 px-3 py-2 rounded text-sm text-gray-300 cursor-pointer hover:border-scout-500">
                                        <span>{statusFilter === 'All' ? 'All Status' : statusFilter}</span>
                                        <ChevronDown size={14} />
                                    </div>
                                    <select 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value={PlayerStatus.LEAD}>Leads</option>
                                        <option value={PlayerStatus.INTERESTED}>Interested</option>
                                        <option value={PlayerStatus.FINAL_REVIEW}>Final Review</option>
                                        <option value={PlayerStatus.OFFERED}>Offered</option>
                                        <option value={PlayerStatus.PLACED}>Placed</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-scout-900 rounded p-1 border border-scout-700">
                            <button 
                                onClick={() => setViewMode('board')} 
                                className={`p-2 rounded flex items-center gap-2 transition-colors ${viewMode === 'board' ? 'bg-scout-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                title="Board View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`p-2 rounded flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-scout-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                title="Compact List View"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>

                    {viewMode === 'board' ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                            {/* We use filteredPlayers here so searches work on Board view too, but we ignore statusFilter so columns stay valid */}
                            <PipelineColumn title="Leads" status={PlayerStatus.LEAD} count={filteredPlayers.filter(p => p.status === PlayerStatus.LEAD).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.LEAD).map(p => (
                                    <PlayerCard 
                                        key={p.id} 
                                        player={p} 
                                        onStatusChange={handleStatusChange} 
                                        onOutreach={jumpToOutreach}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))}
                                {filteredPlayers.filter(p => p.status === PlayerStatus.LEAD).length === 0 && (
                                    <div className="text-center py-10 text-gray-500 border-2 border-dashed border-scout-700 rounded-lg text-sm flex flex-col items-center justify-center">
                                        <p className="mb-2">No active leads found.</p>
                                        {prospectCount > 0 && (
                                            <div className="bg-scout-900/50 p-3 rounded-lg border border-scout-700/50 inline-block max-w-xs mt-2">
                                                <p className="text-xs text-gray-300 mb-2">
                                                    <EyeOff size={12} className="inline mr-1 text-scout-highlight"/>
                                                    You have <strong>{prospectCount} hidden prospects</strong> in your Shadow Pipeline.
                                                </p>
                                                <button onClick={() => setActiveTab(DashboardTab.OUTREACH)} className="text-xs bg-scout-accent text-scout-900 px-3 py-1.5 rounded font-bold hover:bg-white transition-colors">
                                                    Go to Outreach to Activate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </PipelineColumn>

                            <PipelineColumn title="Interested" status={PlayerStatus.INTERESTED} count={filteredPlayers.filter(p => p.status === PlayerStatus.INTERESTED).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.INTERESTED).map(p => (
                                    <PlayerCard 
                                        key={p.id} 
                                        player={p} 
                                        onStatusChange={handleStatusChange} 
                                        onOutreach={jumpToOutreach} 
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))}
                            </PipelineColumn>

                            <PipelineColumn title="Final Review" status={PlayerStatus.FINAL_REVIEW} count={filteredPlayers.filter(p => p.status === PlayerStatus.FINAL_REVIEW).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.FINAL_REVIEW).map(p => (
                                    <PlayerCard 
                                        key={p.id} 
                                        player={p} 
                                        onStatusChange={handleStatusChange} 
                                        onOutreach={jumpToOutreach} 
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))}
                            </PipelineColumn>

                            <PipelineColumn title="Offered" status={PlayerStatus.OFFERED} count={filteredPlayers.filter(p => p.status === PlayerStatus.OFFERED).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.OFFERED).map(p => (
                                    <PlayerCard 
                                        key={p.id} 
                                        player={p} 
                                        onStatusChange={handleStatusChange} 
                                        onOutreach={jumpToOutreach} 
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))}
                            </PipelineColumn>

                            <PipelineColumn title="Placed" status={PlayerStatus.PLACED} count={filteredPlayers.filter(p => p.status === PlayerStatus.PLACED).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.PLACED).map(p => (
                                    <PlayerCard 
                                        key={p.id} 
                                        player={p} 
                                        onStatusChange={handleStatusChange} 
                                        onOutreach={jumpToOutreach} 
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))}
                            </PipelineColumn>
                        </div>
                    ) : (
                        <div className="flex-1 bg-scout-800 rounded-xl border border-scout-700 overflow-hidden flex flex-col">
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-scout-900 sticky top-0 z-10 text-xs uppercase font-bold text-gray-500 shadow-sm">
                                        <tr>
                                            <th className="p-4 border-b border-scout-700">Player Name</th>
                                            <th className="p-4 border-b border-scout-700">Position</th>
                                            <th className="p-4 border-b border-scout-700">Age</th>
                                            <th className="p-4 border-b border-scout-700">Status</th>
                                            <th className="p-4 border-b border-scout-700 text-center">Score</th>
                                            <th className="p-4 border-b border-scout-700">Projection</th>
                                            <th className="p-4 border-b border-scout-700">Target Program</th>
                                            <th className="p-4 border-b border-scout-700 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-scout-700/50 text-sm">
                                        {paginatedPlayers.length > 0 ? paginatedPlayers.map(p => (
                                            <tr key={p.id} className="hover:bg-scout-700/30 transition-colors group">
                                                <td className="p-4 text-white font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{p.name}</span>
                                                        {p.evaluation?.scholarshipTier && (
                                                            <span className={`text-[10px] w-fit px-1.5 rounded mt-1 border ${tierColor(p.evaluation.scholarshipTier)}`}>
                                                                {p.evaluation.scholarshipTier}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300">{p.position}</td>
                                                <td className="p-4 text-gray-300">{p.age}</td>
                                                <td className="p-4">
                                                     <div className="relative group/select w-fit">
                                                        <select 
                                                            value={p.status}
                                                            onChange={(e) => handleStatusChange(p.id, e.target.value as PlayerStatus)}
                                                            className="appearance-none bg-scout-900 text-[10px] font-bold uppercase tracking-wider pl-2 pr-6 py-1 rounded border border-scout-700 text-gray-300 focus:border-scout-accent focus:outline-none cursor-pointer hover:bg-scout-700 transition-colors"
                                                        >
                                                            <option value={PlayerStatus.LEAD}>Lead</option>
                                                            <option value={PlayerStatus.INTERESTED}>Interested</option>
                                                            <option value={PlayerStatus.FINAL_REVIEW}>Final Review</option>
                                                            <option value={PlayerStatus.OFFERED}>Offered</option>
                                                            <option value={PlayerStatus.PLACED}>Placed</option>
                                                            <option value={PlayerStatus.ARCHIVED}>Archived</option>
                                                        </select>
                                                        <ChevronDown size={10} className="absolute right-1.5 top-2 text-gray-500 pointer-events-none" />
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`font-black text-lg ${scoreColor(p.evaluation?.score || 0)}`}>{p.evaluation?.score || '-'}</span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-xs">
                                                    {p.evaluation?.collegeLevel || 'Pending'}
                                                </td>
                                                <td className="p-4 text-gray-400 text-xs font-medium text-scout-highlight">
                                                     {(p.status === PlayerStatus.INTERESTED && p.interestedProgram) ? p.interestedProgram : 
                                                      (p.status === PlayerStatus.PLACED && p.placedLocation) ? p.placedLocation : 
                                                      (p.status === PlayerStatus.OFFERED && p.placedLocation) ? p.placedLocation :
                                                      '-'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => jumpToOutreach(p)}
                                                        className="p-2 rounded hover:bg-scout-700 text-scout-accent transition-colors"
                                                        title="Message Player"
                                                    >
                                                        <MsgIcon size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-gray-500">
                                                    No players found matching your filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Footer */}
                            <div className="p-3 border-t border-scout-700 bg-scout-900 flex justify-between items-center text-sm">
                                <span className="text-gray-500">
                                    Showing {paginatedPlayers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredPlayers.length)} of {filteredPlayers.length}
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-scout-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-3 py-2 text-gray-400 font-medium">Page {currentPage} of {totalPages || 1}</span>
                                    <button 
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-2 rounded hover:bg-scout-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === DashboardTab.EVENTS && (
                <div className="animate-fade-in h-[calc(100vh-100px)]">
                    <EventHub 
                        events={events} 
                        user={user}
                        onAddEvent={(e) => setEvents([...events, e])} 
                        onUpdateEvent={handleUpdateEvent}
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
                    />
                </div>
            )}

            {activeTab === DashboardTab.NEWS && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">Network News & Updates</h2>
                    <NewsTab />
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
                    <ProfileTab user={user} players={players} events={events} />
                </div>
            )}
            
            {/* Player Submission Modal */}
            {isSubmissionOpen && (
                <PlayerSubmission 
                    onClose={() => setIsSubmissionOpen(false)} 
                    onAddPlayer={handleNewPlayer} 
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