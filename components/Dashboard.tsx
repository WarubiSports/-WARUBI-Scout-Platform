
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile, Player, DashboardTab, ScoutingEvent, PlayerStatus, AppNotification, StrategyTask } from '../types';
import PlayerCard from './PlayerCard';
import EventHub from './EventHub';
import KnowledgeTab from './KnowledgeTab';
import ProfileTab from './ProfileTab';
import OutreachTab from './OutreachTab';
import PlayerSubmission from './PlayerSubmission';
import SidelineBeam from './SidelineBeam';
import TutorialOverlay from './TutorialOverlay';
import Confetti from './Confetti';
import StrategyPanel from './StrategyPanel';
import AIQuotaDisplay from './AIQuotaDisplay';
import Leaderboard from './Leaderboard';
import { ConnectionStatus } from './MobileEnhancements';
import { ErrorBoundary } from './ErrorBoundary';
import GlobalSearch from './GlobalSearch';
import { haptic, useSwipeGesture } from '../hooks/useMobileFeatures';
import { generateDailyStrategy } from '../services/geminiService';
import { Users, CalendarDays, UserCircle, MessageSquare, Zap, Plus, Sparkles, X, Check, PlusCircle, Flame, List, LayoutGrid, Search, MessageCircle, MoreHorizontal, ChevronDown, Ghost, Edit2, Trophy, ArrowRight, ArrowLeft, Target, Bell, Send, Archive, TrendingUp, MessageSquarePlus, LogOut } from 'lucide-react';
import ReportBugModal from './ReportBugModal';

interface DashboardProps {
    user: UserProfile;
    players: Player[];
    events: ScoutingEvent[];
    notifications: AppNotification[];
    scoutScore?: number;
    onAddPlayer: (player: Player) => void;
    onUpdateProfile?: (profile: UserProfile) => void;
    onAddEvent: (event: ScoutingEvent) => void;
    onUpdateEvent: (event: ScoutingEvent) => void;
    onUpdatePlayer: (player: Player) => void;
    onDeletePlayer?: (id: string) => void;
    onAddNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    onMarkAllRead: () => void;
    onMessageSent?: (id: string, log: any) => void;
    onStatusChange?: (id: string, newStatus: PlayerStatus) => void;
    onLogout?: () => void;
    onReturnToAdmin?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    user,
    players,
    events,
    notifications,
    scoutScore = 0,
    onAddPlayer,
    onUpdateProfile,
    onAddEvent,
    onUpdateEvent,
    onUpdatePlayer,
    onDeletePlayer,
    onAddNotification,
    onMarkAllRead,
    onMessageSent,
    onStatusChange,
    onLogout,
    onReturnToAdmin
}) => {
    const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.PLAYERS);
    const [viewMode, setViewMode] = useState<'board' | 'list' | 'stack'>('board');
    const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
    const [isBeamOpen, setIsBeamOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);
    const [strategyTasks, setStrategyTasks] = useState<StrategyTask[]>([]);
    const [draggedOverStatus, setDraggedOverStatus] = useState<PlayerStatus | null>(null);
    const [listSearch, setListSearch] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile && viewMode === 'board') setViewMode('stack');
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Global search shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Hot leads are recently active leads with high engagement signals
    const spotlights = players.filter(p => p.status === PlayerStatus.LEAD && (p.activityStatus === 'spotlight' || p.activityStatus === 'signal'));
    const leadCount = players.filter(p => p.status === PlayerStatus.LEAD).length;
    const [reviewIdx, setReviewIdx] = useState(0);
    const currentSpotlight = spotlights[reviewIdx];

    useEffect(() => {
        setStrategyTasks(generateDailyStrategy(players, events));
    }, [players, events]);

    const handleStatusChange = (id: string, newStatus: PlayerStatus) => {
        if (newStatus === PlayerStatus.PLACED) {
            setShowCelebration(true);
            haptic.success();
        } else if (newStatus === PlayerStatus.ARCHIVED) {
            haptic.medium();
        } else {
            haptic.light();
        }
        if (onStatusChange) onStatusChange(id, newStatus);
    };

    const promoteLead = (id: string) => {
        handleStatusChange(id, PlayerStatus.CONTACTED);
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

    const onDragOver = (e: React.DragEvent, status: PlayerStatus) => {
        e.preventDefault();
        setDraggedOverStatus(status);
    };

    const onDrop = (e: React.DragEvent, status: PlayerStatus) => {
        e.preventDefault();
        setDraggedOverStatus(null);
        const playerId = e.dataTransfer.getData('playerId');
        if (playerId) handleStatusChange(playerId, status);
    };

    // Swipeable card wrapper for mobile stack view
    const SwipeableStackCard = ({ player, onArchive, onPromote }: { player: Player; onArchive: () => void; onPromote: () => void }) => {
        const [offset, setOffset] = useState(0);
        const [isDragging, setIsDragging] = useState(false);
        const startX = useRef(0);
        const startY = useRef(0);
        const isHorizontalSwipe = useRef(false);
        const threshold = 100;

        const handleTouchStart = (e: React.TouchEvent) => {
            startX.current = e.touches[0].clientX;
            startY.current = e.touches[0].clientY;
            isHorizontalSwipe.current = false;
            setIsDragging(true);
        };

        const handleTouchMove = (e: React.TouchEvent) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX.current;
            const diffY = currentY - startY.current;

            if (!isHorizontalSwipe.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
                isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
            }

            if (isHorizontalSwipe.current) {
                const newOffset = diffX * 0.6;
                const maxOffset = threshold * 1.2;
                setOffset(Math.max(-maxOffset, Math.min(maxOffset, newOffset)));

                if (Math.abs(newOffset) >= threshold && Math.abs(offset) < threshold) {
                    haptic.light();
                }
            }
        };

        const handleTouchEnd = () => {
            if (!isDragging) return;
            setIsDragging(false);

            if (offset >= threshold) {
                haptic.success();
                onPromote();
            } else if (offset <= -threshold) {
                haptic.medium();
                onArchive();
            }
            setOffset(0);
        };

        const swipeProgress = Math.min(Math.abs(offset) / threshold, 1);

        return (
            <div className="relative overflow-hidden rounded-3xl">
                {/* Background actions */}
                <div className="absolute inset-0 flex">
                    <div
                        className="flex-1 bg-scout-accent flex items-center justify-start pl-8 transition-opacity"
                        style={{ opacity: offset > 0 ? swipeProgress : 0 }}
                    >
                        <div className="flex items-center gap-2 text-scout-900">
                            <TrendingUp size={24} />
                            <span className="font-black text-sm uppercase">Promote</span>
                        </div>
                    </div>
                    <div
                        className="flex-1 bg-gray-600 flex items-center justify-end pr-8 transition-opacity"
                        style={{ opacity: offset < 0 ? swipeProgress : 0 }}
                    >
                        <div className="flex items-center gap-2 text-white">
                            <span className="font-black text-sm uppercase">Archive</span>
                            <Archive size={24} />
                        </div>
                    </div>
                </div>

                {/* Card */}
                <div
                    className={`relative bg-scout-800 rounded-3xl transition-transform ${isDragging ? '' : 'duration-300'}`}
                    style={{ transform: `translateX(${offset}px)` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <PlayerCard player={player} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onEdit={handleEditPlayer} onDelete={onDeletePlayer} />
                </div>
            </div>
        );
    };

    const PipelineStack = () => {
        // My Players only shows Interested, Offered, Placed (engaged players)
        const activePlayers = players.filter(p =>
            p.status === PlayerStatus.INTERESTED ||
            p.status === PlayerStatus.OFFERED ||
            p.status === PlayerStatus.PLACED
        );
        const [stackIdx, setStackIdx] = useState(0);
        const currentPlayer = activePlayers[stackIdx];

        const goToNext = useCallback(() => {
            setStackIdx(prev => Math.min(activePlayers.length - 1, prev + 1));
        }, [activePlayers.length]);

        if (activePlayers.length === 0) return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-scout-800 rounded-3xl flex items-center justify-center mb-6 border border-scout-700">
                    <Users size={40} className="text-scout-accent" />
                </div>
                <p className="text-xl font-black uppercase italic text-white mb-2">No Engaged Players Yet</p>
                <p className="text-sm text-gray-400 mb-6 max-w-xs">Players who signal interest from your Scouting Pool will appear here.</p>
                <button
                    onClick={() => setActiveTab(DashboardTab.OUTREACH)}
                    className="bg-scout-accent hover:bg-emerald-600 text-scout-900 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95"
                >
                    <MessageSquare size={20} />
                    Go to Scouting Pool
                </button>
            </div>
        );

        const handleArchive = () => {
            if (currentPlayer) {
                handleStatusChange(currentPlayer.id, PlayerStatus.ARCHIVED);
                // Stay on same index or go back if at end
                if (stackIdx >= activePlayers.length - 1) {
                    setStackIdx(Math.max(0, stackIdx - 1));
                }
            }
        };

        const handlePromote = () => {
            if (currentPlayer) {
                // Move to next stage: Lead → Contacted → Interested → Offered → Placed
                const stages = [PlayerStatus.LEAD, PlayerStatus.CONTACTED, PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED];
                const currentIndex = stages.indexOf(currentPlayer.status);
                if (currentIndex < stages.length - 1) {
                    handleStatusChange(currentPlayer.id, stages[currentIndex + 1]);
                }
            }
        };

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black uppercase text-scout-accent tracking-[0.2em]">Active Deck ({stackIdx + 1}/{activePlayers.length})</h3>
                    <div className="flex gap-2">
                        <button onClick={() => { haptic.light(); setStackIdx(prev => Math.max(0, prev - 1)); }} className="p-2 bg-scout-800 rounded-lg text-gray-500 active:scale-95 transition-transform"><ArrowLeft size={16} /></button>
                        <button onClick={() => { haptic.light(); setStackIdx(prev => Math.min(activePlayers.length - 1, prev + 1)); }} className="p-2 bg-scout-800 rounded-lg text-gray-500 active:scale-95 transition-transform"><ArrowRight size={16} /></button>
                    </div>
                </div>

                {/* Swipe hint */}
                <div className="flex justify-center gap-6 text-[10px] text-gray-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><ArrowLeft size={12} /> Swipe to archive</span>
                    <span className="flex items-center gap-1">Swipe to promote <ArrowRight size={12} /></span>
                </div>

                <div className="relative">
                    {currentPlayer && (
                        <div className="animate-fade-in">
                            <SwipeableStackCard
                                player={currentPlayer}
                                onArchive={handleArchive}
                                onPromote={handlePromote}
                            />
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <button onClick={handleArchive} className="py-4 bg-scout-800 text-gray-400 font-black rounded-2xl border border-white/5 uppercase text-[10px] tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Archive size={16} /> Archive
                                </button>
                                <button onClick={() => handleStatusChange(currentPlayer.id, PlayerStatus.PLACED)} className="py-4 bg-scout-accent text-scout-900 font-black rounded-2xl shadow-glow uppercase text-[10px] tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Trophy size={16} /> Mark Placed
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const ListView = () => {
        // My Players only shows Interested, Offered, Placed (engaged players)
        const filteredPlayers = players.filter(p =>
            (p.status === PlayerStatus.INTERESTED ||
             p.status === PlayerStatus.OFFERED ||
             p.status === PlayerStatus.PLACED) &&
            p.name.toLowerCase().includes(listSearch.toLowerCase())
        );

        return (
            <div className="bg-scout-800/50 rounded-[2.5rem] border border-scout-700/50 overflow-hidden animate-fade-in shadow-xl">
                <div className="p-6 border-b border-scout-700/50 bg-scout-900/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                        <input type="text" placeholder="Filter my players..." className="w-full bg-scout-950 border border-scout-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-scout-accent transition-all" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-scout-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-scout-700"><th className="px-6 py-4">Player</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Score</th><th className="px-6 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-scout-700/30">
                            {filteredPlayers.map((p, i) => (
                                <tr key={p.id} className={`${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} hover:bg-scout-accent/5 transition-colors group`}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white text-sm">{p.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-black">{p.position} • {p.age}yo</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value as PlayerStatus)} className="bg-scout-900/50 border border-scout-700/50 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-gray-300 outline-none">
                                            {[PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED, PlayerStatus.ARCHIVED].map(status => <option key={status} value={status}>{status}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 font-black text-scout-accent">{p.evaluation?.score || '?'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditPlayer(p)} className="p-2 text-gray-400 hover:text-white transition-colors"><Edit2 size={14} /></button>
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
            <ConnectionStatus />
            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                players={players}
                events={events}
                onNavigate={setActiveTab}
                onSelectPlayer={(player) => {
                    setEditingPlayer(player);
                    setIsSubmissionOpen(true);
                }}
                onSelectEvent={(event) => {
                    setActiveTab(DashboardTab.EVENTS);
                }}
                onOpenAddPlayer={() => setIsSubmissionOpen(true)}
            />
            {showCelebration && <Confetti onComplete={() => setShowCelebration(false)} />}

            <aside className="w-72 bg-scout-800 border-r border-scout-700 hidden md:flex flex-col shrink-0 overflow-y-auto">
                <div className="p-8 border-b border-scout-700">
                    <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Warubi<span className="text-scout-accent">Scout</span></h1>
                </div>
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <button onClick={() => setActiveTab(DashboardTab.PLAYERS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.PLAYERS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:bg-scout-900/50'}`}><Users size={20} /> My Players</button>
                    <button onClick={() => setActiveTab(DashboardTab.OUTREACH)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.OUTREACH ? 'bg-scout-accent text-scout-900' : 'text-gray-300 hover:text-white'}`}><MessageSquare size={20} /> Scouting Pool</button>
                    <button onClick={() => setActiveTab(DashboardTab.EVENTS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.EVENTS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><CalendarDays size={20} /> Events</button>
                    <button onClick={() => setActiveTab(DashboardTab.KNOWLEDGE)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.KNOWLEDGE ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Zap size={20} /> Training</button>
                </nav>
                <StrategyPanel persona={user.scoutPersona || 'The Scout'} tasks={strategyTasks} onAction={(link) => setActiveTab(DashboardTab.OUTREACH)} />
                <div className="px-4 py-3 border-t border-scout-700">
                    <Leaderboard currentScoutId={user.scoutId} currentScoutXP={scoutScore} compact />
                </div>
                <div className="px-4 pb-2 space-y-2">
                    <AIQuotaDisplay />
                    <button
                        onClick={() => setIsBugReportOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-scout-accent hover:text-white bg-scout-accent/10 hover:bg-scout-accent/20 border border-scout-accent/30 hover:border-scout-accent/50 rounded-xl transition-all"
                    >
                        <MessageSquarePlus size={16} />
                        <span>Feedback & Ideas</span>
                    </button>
                </div>
                <div className="p-6 border-t border-scout-700 bg-scout-900/30 space-y-3">
                    <div onClick={() => setActiveTab(DashboardTab.PROFILE)} className="flex items-center gap-4 p-3 bg-scout-800 rounded-2xl border border-scout-700 cursor-pointer hover:border-scout-accent transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-scout-accent flex items-center justify-center font-black text-scout-900 text-xl">{user.name.charAt(0)}</div>
                        <div className="min-w-0"><p className="text-sm font-black text-white truncate mb-1">{user.name}</p><p className="text-[10px] text-scout-highlight font-black uppercase">{scoutScore} XP</p></div>
                    </div>
                    {onReturnToAdmin && (
                        <button onClick={onReturnToAdmin} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl text-xs font-bold transition-all border border-blue-500/30">
                            <Users size={14} /> Return to Admin
                        </button>
                    )}
                    {onLogout && (
                        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-500 hover:text-white hover:bg-scout-700/50 rounded-xl text-xs font-bold transition-all">
                            <LogOut size={14} /> Sign Out
                        </button>
                    )}
                </div>
            </aside>

            <main className={`flex-1 ${activeTab === DashboardTab.OUTREACH ? 'overflow-hidden p-4' : 'overflow-auto p-4 md:p-10 pb-32 custom-scrollbar'}`}>
                {activeTab === DashboardTab.PLAYERS && (
                    <ErrorBoundary name="Pipeline">
                    <div className="space-y-8 animate-fade-in">
                        {/* P2: HOT LEAD BANNER - Shows when someone just engaged */}
                        {spotlights.filter(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight').length > 0 && (
                            <div className="bg-gradient-to-r from-scout-accent/20 via-emerald-500/10 to-scout-accent/20 border-2 border-scout-accent rounded-2xl p-4 md:p-6 animate-pulse-slow relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzEwYjk4MTIwIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCIvPjwvc3ZnPg==')] opacity-30"></div>
                                <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-scout-accent rounded-xl flex items-center justify-center animate-bounce shadow-glow">
                                            <Bell size={24} className="text-scout-900" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-scout-accent mb-1">🔥 Hot Lead Alert</p>
                                            <h3 className="text-lg md:text-xl font-black text-white">
                                                {currentSpotlight?.name} just {currentSpotlight?.activityStatus === 'signal' ? 'clicked your link!' : 'completed assessment!'}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => currentSpotlight && jumpToOutreach(currentSpotlight)}
                                            className="flex-1 md:flex-none px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all"
                                        >
                                            <Send size={18} /> Message Now
                                        </button>
                                        <button
                                            onClick={() => currentSpotlight && promoteLead(currentSpotlight.id)}
                                            className="px-6 py-3 bg-white/10 text-white rounded-xl font-black text-sm uppercase hover:bg-white/20 transition-all"
                                        >
                                            Add to Pipeline
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* P0: TODAY'S PRIORITY CARD */}
                        {(() => {
                            // Determine the top priority action
                            const hotSignal = spotlights.find(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight');
                            const topLead = players
                                .filter(p => p.status === PlayerStatus.LEAD || p.status === PlayerStatus.CONTACTED || p.status === PlayerStatus.INTERESTED)
                                .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))[0];
                            const offeredPlayer = players.find(p => p.status === PlayerStatus.OFFERED);

                            // Priority order: hot signal > offered (close to placement) > top lead > add players
                            let priority: { type: string; title: string; subtitle: string; action: () => void; actionLabel: string; icon: React.ReactNode } | null = null;

                            if (hotSignal && !spotlights.some(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight')) {
                                // Hot signal already shown in banner above, skip
                            } else if (offeredPlayer) {
                                priority = {
                                    type: 'CLOSE TO PLACEMENT',
                                    title: `Follow up on ${offeredPlayer.name}'s offer`,
                                    subtitle: `Score: ${offeredPlayer.evaluation?.score || '?'} • ${offeredPlayer.evaluation?.scholarshipTier || 'Untiered'}`,
                                    action: () => handleEditPlayer(offeredPlayer),
                                    actionLabel: 'Review & Close',
                                    icon: <Trophy className="text-scout-highlight" size={24} />
                                };
                            } else if (topLead) {
                                priority = {
                                    type: 'TOP TARGET',
                                    title: `Follow up with ${topLead.name}`,
                                    subtitle: `Score: ${topLead.evaluation?.score || '?'} • Last contact: ${topLead.lastContactedAt ? 'Recently' : 'Never'}`,
                                    action: () => jumpToOutreach(topLead),
                                    actionLabel: 'Send Message',
                                    icon: <Target className="text-scout-accent" size={24} />
                                };
                            } else if (players.filter(p => p.status !== PlayerStatus.ARCHIVED).length === 0) {
                                priority = {
                                    type: 'GET STARTED',
                                    title: 'Add your first prospect',
                                    subtitle: 'Build your pipeline by logging players you discover',
                                    action: () => setIsSubmissionOpen(true),
                                    actionLabel: 'Add Player',
                                    icon: <PlusCircle className="text-blue-400" size={24} />
                                };
                            }

                            if (!priority) return null;

                            return (
                                <div className="bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-700 rounded-2xl p-5 md:p-6 shadow-xl">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-scout-900 rounded-xl flex items-center justify-center border border-scout-700">
                                                {priority.icon}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-2">
                                                    <Target size={12} className="text-scout-accent" /> Your #1 Priority Today
                                                </p>
                                                <h3 className="text-lg font-black text-white">{priority.title}</h3>
                                                <p className="text-xs text-gray-400 mt-0.5">{priority.subtitle}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={priority.action}
                                            className="w-full md:w-auto px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all active:scale-95"
                                        >
                                            {priority.actionLabel} <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* SPOTLIGHT BANNER (existing - shows bulk review) */}
                        {spotlights.length > 0 && !spotlights.some(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight') && (
                            <div className="bg-emerald-500/5 border-2 border-scout-accent/30 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex-1">
                                        <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic mb-2">Spotlight Review</h2>
                                        <p className="text-gray-400 text-xs md:text-sm">{spotlights.length} talent signals ready for promotion.</p>
                                    </div>
                                    <div className="w-full max-w-sm">
                                        {currentSpotlight && (
                                            <div className="bg-scout-800 border border-scout-700 rounded-3xl p-5 shadow-2xl">
                                                <h3 className="text-xl font-black text-white">{currentSpotlight.name}</h3>
                                                <p className="text-[10px] text-scout-accent font-black uppercase mb-4">{currentSpotlight.position} • {currentSpotlight.activityStatus}</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleStatusChange(currentSpotlight.id, PlayerStatus.ARCHIVED)} className="flex-1 py-3 bg-scout-900 rounded-xl text-[10px] font-black uppercase">Dismiss</button>
                                                    <button onClick={() => promoteLead(currentSpotlight.id)} className="flex-[1.5] py-3 bg-scout-accent text-scout-900 rounded-xl text-[10px] font-black uppercase shadow-glow">Promote</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">My Players</h2>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-2">Your Player Portfolio</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex shadow-inner">
                                    {!isMobile && <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'board' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><LayoutGrid size={16} /> Board</button>}
                                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'list' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><List size={16} /> List</button>
                                    {isMobile && <button onClick={() => setViewMode('stack')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'stack' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><LayoutGrid size={16} /> Stack</button>}
                                </div>
                                <button onClick={() => setIsSubmissionOpen(true)} className="bg-scout-accent hover:bg-emerald-600 text-scout-900 p-4 md:px-8 md:py-4 rounded-2xl font-black shadow-glow flex items-center gap-3 active:scale-95 transition-all"><PlusCircle size={24} /> <span className="hidden md:inline">New Manual Lead</span></button>
                            </div>
                        </div>

                        {viewMode === 'board' ? (
                            <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar min-h-[500px]">
                                {[PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED].map(status => (
                                    <div key={status} onDragOver={(e) => onDragOver(e, status)} onDrop={(e) => onDrop(e, status)} className={`flex-1 min-w-[340px] flex flex-col bg-scout-800/20 rounded-[3rem] border ${draggedOverStatus === status ? 'border-scout-accent bg-scout-accent/5 shadow-glow' : 'border-scout-700/50'}`}>
                                        <div className="p-8 border-b border-scout-700/50 bg-scout-900/20 backdrop-blur-md flex justify-between items-center rounded-t-[3rem]"><h3 className="font-black uppercase text-[10px] tracking-[0.3em] opacity-50">{status}</h3><span className="text-[10px] bg-scout-900 border border-scout-700 px-3 py-1 rounded-full text-gray-500 font-black">{players.filter(p => p.status === status).length}</span></div>
                                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(100vh-450px)]">
                                            {players.filter(p => p.status === status).map(p => <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onEdit={handleEditPlayer} onDelete={onDeletePlayer} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : viewMode === 'list' ? (
                            <ListView />
                        ) : (
                            <PipelineStack />
                        )}
                    </div>
                    </ErrorBoundary>
                )}

                {activeTab === DashboardTab.OUTREACH && (
                    <ErrorBoundary name="Outreach">
                        <OutreachTab players={players} user={user} initialPlayerId={outreachTargetId} onMessageSent={onMessageSent || (() => { })} onAddPlayers={(pls) => pls.forEach(p => onAddPlayer(p))} onStatusChange={handleStatusChange} />
                    </ErrorBoundary>
                )}
                {activeTab === DashboardTab.EVENTS && (
                    <ErrorBoundary name="Events">
                        <EventHub events={events} user={user} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} />
                    </ErrorBoundary>
                )}
                {activeTab === DashboardTab.PROFILE && (
                    <ErrorBoundary name="Profile">
                        <ProfileTab user={user} players={players} events={events} onUpdateUser={onUpdateProfile} onNavigate={setActiveTab} scoutScore={scoutScore} onOpenBeam={() => setIsBeamOpen(true)} onLogout={onLogout} />
                    </ErrorBoundary>
                )}
                {activeTab === DashboardTab.KNOWLEDGE && (
                    <ErrorBoundary name="Knowledge">
                        <KnowledgeTab user={user} />
                    </ErrorBoundary>
                )}

                {isSubmissionOpen && <PlayerSubmission onClose={handleCloseSubmission} onAddPlayer={onAddPlayer} onUpdatePlayer={onUpdatePlayer} existingPlayers={players} editingPlayer={editingPlayer} />}
                {isBeamOpen && <SidelineBeam user={user} onClose={() => setIsBeamOpen(false)} />}
                {isBugReportOpen && <ReportBugModal onClose={() => setIsBugReportOpen(false)} />}
            </main>

            <nav className="md:hidden fixed bottom-0 w-full bg-[#05080f]/95 backdrop-blur-2xl border-t border-scout-700 z-[110] px-2 pt-2 pb-6">
                <div className="flex justify-around items-end max-w-md mx-auto">
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.PLAYERS); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.PLAYERS ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <Users size={24} />
                        <span className="text-[9px] font-black uppercase">Players</span>
                    </button>
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.OUTREACH); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.OUTREACH ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <MessageSquare size={24} />
                        <span className="text-[9px] font-black uppercase">Pool</span>
                    </button>
                    <div className="-mt-8 bg-[#05080f] p-2 rounded-full border border-scout-700/50 shadow-2xl">
                        <button onClick={() => { haptic.medium(); setIsSubmissionOpen(true); }} className="w-14 h-14 bg-scout-accent text-scout-900 rounded-full flex items-center justify-center shadow-glow border-2 border-scout-accent/50 active:scale-90 transition-transform">
                            <Plus size={28} />
                        </button>
                    </div>
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.EVENTS); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.EVENTS ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <CalendarDays size={24} />
                        <span className="text-[9px] font-black uppercase">Events</span>
                    </button>
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.PROFILE); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.PROFILE ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <UserCircle size={24} />
                        <span className="text-[9px] font-black uppercase">Profile</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default Dashboard;
