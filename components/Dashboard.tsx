
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { UserProfile, Player, DashboardTab, ScoutingEvent, PlayerStatus, AppNotification } from '../types';
import PlayerCard from './PlayerCard';
import EventHub from './EventHub';
import OutreachTab from './OutreachTab';
import PlayerSubmission from './PlayerSubmission';
import SidelineBeam from './SidelineBeam';
import TutorialOverlay from './TutorialOverlay';
import Confetti from './Confetti';
import { ConnectionStatus } from './MobileEnhancements';
import { ErrorBoundary } from './ErrorBoundary';
import GlobalSearch from './GlobalSearch';
import PathwaySelectionModal from './PathwaySelectionModal';
import { haptic, useSwipeGesture } from '../hooks/useMobileFeatures';
import { Users, CalendarDays, MessageSquare, Plus, Sparkles, X, Check, PlusCircle, Flame, List, LayoutGrid, Search, MessageCircle, MoreHorizontal, ChevronDown, Ghost, Edit2, Trophy, ArrowRight, ArrowLeft, Target, Bell, Send, Archive, TrendingUp, LogOut, BookOpen, Mail, UserPlus, Filter, Lightbulb, FileUp } from 'lucide-react';
import ReportBugModal from './ReportBugModal';
import PathwaysTab from './PathwaysTab';

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
    onStatusChange?: (id: string, newStatus: PlayerStatus, pathway?: 'europe' | 'college' | 'events' | 'coaching') => void;
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
    const [submissionInitialMode, setSubmissionInitialMode] = useState<'HUB' | 'BULK' | undefined>(undefined);
    const [isBeamOpen, setIsBeamOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);
    const [draggedOverStatus, setDraggedOverStatus] = useState<PlayerStatus | null>(null);
    const [listSearch, setListSearch] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);
    const [pendingOfferedPlayer, setPendingOfferedPlayer] = useState<Player | null>(null);
    const [pipelineFilter, setPipelineFilter] = useState<'all' | 'active'>('all');
    const [showMobileProfile, setShowMobileProfile] = useState(false);
    const [showXpGuide, setShowXpGuide] = useState(false);

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

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Cmd+K / Ctrl+K = global search (works even when typing)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
                return;
            }

            // Skip other shortcuts if typing
            if (isTyping) return;

            // / or ? = open search
            if (e.key === '/' || e.key === '?') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            // N = new player
            else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                setEditingPlayer(null);
                setIsSubmissionOpen(true);
            }
            // E = events tab
            else if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                setActiveTab(DashboardTab.EVENTS);
            }
            // P = players tab
            else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                setActiveTab(DashboardTab.PLAYERS);
            }
            // O = outreach tab
            else if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                setActiveTab(DashboardTab.OUTREACH);
            }
            // Escape = close modals
            else if (e.key === 'Escape') {
                if (isSearchOpen) setIsSearchOpen(false);
                if (isSubmissionOpen) {
                    setIsSubmissionOpen(false);
                    setEditingPlayer(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, isSubmissionOpen]);

    // Hot leads are recently active leads with high engagement signals
    const spotlights = players.filter(p => p.status === PlayerStatus.LEAD && (p.activityStatus === 'spotlight' || p.activityStatus === 'signal'));
    const leadCount = players.filter(p => p.status === PlayerStatus.LEAD).length;
    const [reviewIdx, setReviewIdx] = useState(0);
    const currentSpotlight = spotlights[reviewIdx];


    const handleStatusChange = (id: string, newStatus: PlayerStatus, extraData?: string) => {
        // Intercept OFFERED status to show pathway selection modal (only for new transitions, not edits)
        const player = players.find(p => p.id === id);
        if (newStatus === PlayerStatus.OFFERED && player && player.status !== PlayerStatus.OFFERED) {
            setPendingOfferedPlayer(player);
            return; // Don't proceed until pathway is selected
        }

        if (newStatus === PlayerStatus.PLACED) {
            setShowCelebration(true);
            haptic.success();
        } else if (newStatus === PlayerStatus.ARCHIVED) {
            haptic.medium();
        } else {
            haptic.light();
        }
        if (onStatusChange) onStatusChange(id, newStatus, extraData);
    };

    const handlePathwaySelected = (pathway: 'europe' | 'college' | 'events' | 'coaching') => {
        if (!pendingOfferedPlayer) return;

        haptic.success();
        if (onStatusChange) onStatusChange(pendingOfferedPlayer.id, PlayerStatus.OFFERED, pathway);
        setPendingOfferedPlayer(null);
    };

    const handlePathwayCancelled = () => {
        setPendingOfferedPlayer(null);
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
        const allowedStatuses = pipelineFilter === 'all'
            ? [PlayerStatus.LEAD, PlayerStatus.CONTACTED, PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED]
            : [PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED];

        const activePlayers = players.filter(p => allowedStatuses.includes(p.status));
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
                <p className="text-xl font-black uppercase italic text-white mb-2">No Players Yet</p>
                <p className="text-sm text-gray-400 mb-6 max-w-xs">Add your first player to start building your pipeline.</p>
                <button
                    onClick={() => setIsSubmissionOpen(true)}
                    className="bg-scout-accent hover:bg-emerald-600 text-scout-900 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95"
                >
                    <PlusCircle size={20} />
                    Add Player
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
        const allowedStatuses = pipelineFilter === 'all'
            ? [PlayerStatus.LEAD, PlayerStatus.CONTACTED, PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED]
            : [PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED];

        const filteredPlayers = players.filter(p =>
            allowedStatuses.includes(p.status) &&
            p.name.toLowerCase().includes(listSearch.toLowerCase())
        );

        return (
            <div className="bg-scout-800/50 rounded-[2.5rem] border border-scout-700/50 overflow-hidden animate-fade-in shadow-xl">
                <div className="p-6 border-b border-scout-700/50 bg-scout-900/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                        <input type="text" placeholder="Search players..." className="w-full bg-scout-950 border border-scout-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-scout-accent transition-all" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
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
                                            {[PlayerStatus.LEAD, PlayerStatus.CONTACTED, PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED, PlayerStatus.ARCHIVED].map(status => <option key={status} value={status}>{status}</option>)}
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
                    <button onClick={() => setActiveTab(DashboardTab.PLAYERS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.PLAYERS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:bg-scout-900/50'}`}><Users size={20} /> Players</button>
                    <button onClick={() => setActiveTab(DashboardTab.EVENTS)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.EVENTS ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><CalendarDays size={20} /> Events</button>
                    <button onClick={() => setActiveTab(DashboardTab.KNOWLEDGE)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === DashboardTab.KNOWLEDGE ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><BookOpen size={20} /> Pathways</button>
                </nav>
                <div className="p-4">
                    <button
                        onClick={() => setIsBugReportOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 hover:border-amber-400/50 transition-all group"
                    >
                        <Lightbulb size={18} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-sm font-bold">Feedback & Ideas</span>
                    </button>
                </div>
                <div className="flex-1" /> {/* Spacer */}
                <div className="p-4 border-t border-scout-700 bg-scout-900/30 space-y-3">
                    {/* XP Level Display - Clickable */}
                    {(() => {
                        const level = Math.floor(scoutScore / 100) + 1;
                        const xpInLevel = scoutScore % 100;
                        const levelNames = ['Rookie', 'Scout', 'Hunter', 'Pro Scout', 'Elite', 'Legend', 'Master', 'Grand Master'];
                        const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];
                        return (
                            <button
                                onClick={() => setShowXpGuide(!showXpGuide)}
                                className="w-full text-left bg-gradient-to-r from-scout-accent/10 to-scout-highlight/10 border border-scout-accent/30 rounded-xl p-3 hover:border-scout-accent/50 transition-all"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-scout-accent/20 flex items-center justify-center">
                                            <Trophy size={16} className="text-scout-accent" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-gray-400">Level {level}</p>
                                            <p className="text-sm font-black text-white">{levelName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-scout-accent">{scoutScore}</p>
                                        <p className="text-[9px] text-gray-500 uppercase">XP</p>
                                    </div>
                                </div>
                                <div className="h-2 bg-scout-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-scout-accent to-scout-highlight transition-all duration-500"
                                        style={{ width: `${xpInLevel}%` }}
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500 mt-1 text-center">{100 - xpInLevel} XP to next level • <span className="text-scout-accent">tap for details</span></p>
                            </button>
                        );
                    })()}

                    {/* XP Guide - Desktop */}
                    {showXpGuide && (
                        <div className="bg-scout-900/50 rounded-xl p-3 border border-scout-700/50 animate-fade-in">
                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">How to earn XP</p>
                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between"><span className="text-gray-400">Add player</span><span className="text-scout-accent font-bold">+5</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Complete profile</span><span className="text-scout-accent font-bold">+5</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">First outreach</span><span className="text-scout-accent font-bold">+5</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">→ Interested</span><span className="text-scout-accent font-bold">+10</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">→ Offered</span><span className="text-scout-accent font-bold">+25</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Attend event</span><span className="text-scout-accent font-bold">+15</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Host event</span><span className="text-scout-accent font-bold">+50</span></div>
                                <div className="flex justify-between pt-1 border-t border-scout-700/50"><span className="text-white font-bold">Placement</span><span className="text-scout-accent font-black">+500</span></div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-10 h-10 rounded-lg bg-scout-accent flex items-center justify-center font-black text-scout-900">{user.name.charAt(0)}</div>
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                    </div>
                    {onReturnToAdmin && (
                        <button onClick={onReturnToAdmin} className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg text-xs font-bold transition-all">
                            <Users size={14} /> Return to Admin
                        </button>
                    )}
                    {onLogout && (
                        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-white hover:bg-scout-700/50 rounded-lg text-xs font-bold transition-all">
                            <LogOut size={14} /> Sign Out
                        </button>
                    )}
                </div>
            </aside>

            <main className={`flex-1 min-h-0 ${activeTab === DashboardTab.OUTREACH ? 'overflow-hidden p-4' : 'overflow-auto p-4 md:p-10 pb-28 md:pb-10 custom-scrollbar'}`}>
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
                                <div className="bg-gradient-to-r from-scout-accent/10 via-emerald-500/5 to-scout-800 border border-scout-accent/30 rounded-2xl p-5 md:p-6 shadow-xl">
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
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Pipeline Filter */}
                                <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex shadow-inner">
                                    <button onClick={() => setPipelineFilter('all')} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${pipelineFilter === 'all' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}>All</button>
                                    <button onClick={() => setPipelineFilter('active')} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${pipelineFilter === 'active' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}>Active</button>
                                </div>
                                {/* View Mode */}
                                <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex shadow-inner">
                                    {!isMobile && <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'board' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><LayoutGrid size={16} /> Board</button>}
                                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'list' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><List size={16} /> List</button>
                                    {isMobile && <button onClick={() => setViewMode('stack')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'stack' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><LayoutGrid size={16} /> Stack</button>}
                                </div>
                                <button onClick={() => { setSubmissionInitialMode(undefined); setIsSubmissionOpen(true); }} className="bg-scout-accent hover:bg-emerald-600 text-scout-900 p-4 md:px-8 md:py-4 rounded-2xl font-black shadow-glow flex items-center gap-3 active:scale-95 transition-all"><PlusCircle size={24} /> <span className="hidden md:inline">Add Player</span></button>
                                <button onClick={() => { setSubmissionInitialMode('BULK'); setIsSubmissionOpen(true); }} className="bg-scout-800 hover:bg-scout-700 text-white p-4 md:px-6 md:py-4 rounded-2xl font-black border border-scout-700 flex items-center gap-2 active:scale-95 transition-all"><FileUp size={20} /> <span className="hidden md:inline">Bulk Add</span></button>
                            </div>
                        </div>

                        {viewMode === 'board' ? (
                            <div className="flex gap-4 overflow-x-auto pb-8 custom-scrollbar min-h-[500px]">
                                {(pipelineFilter === 'all'
                                    ? [PlayerStatus.LEAD, PlayerStatus.CONTACTED, PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED]
                                    : [PlayerStatus.INTERESTED, PlayerStatus.OFFERED, PlayerStatus.PLACED]
                                ).map(status => (
                                    <div key={status} onDragOver={(e) => onDragOver(e, status)} onDrop={(e) => onDrop(e, status)} className={`flex-1 min-w-[280px] flex flex-col bg-scout-800/20 rounded-[2rem] border ${draggedOverStatus === status ? 'border-scout-accent bg-scout-accent/5 shadow-glow' : 'border-scout-700/50'}`}>
                                        <div className="p-6 border-b border-scout-700/50 bg-scout-900/20 backdrop-blur-md flex justify-between items-center rounded-t-[2rem]">
                                            <h3 className={`font-black uppercase text-[10px] tracking-[0.2em] ${
                                                status === PlayerStatus.PLACED ? 'text-scout-accent' :
                                                status === PlayerStatus.OFFERED ? 'text-scout-highlight' :
                                                status === PlayerStatus.INTERESTED ? 'text-blue-400' :
                                                status === PlayerStatus.CONTACTED ? 'text-purple-400' :
                                                'text-gray-400'
                                            }`}>{status}</h3>
                                            <span className="text-[10px] bg-scout-900 border border-scout-700 px-2 py-1 rounded-full text-gray-500 font-black">{players.filter(p => p.status === status).length}</span>
                                        </div>
                                        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(100vh-450px)]">
                                            {players.filter(p => p.status === status).length === 0 ? (
                                                <div className="border-2 border-dashed border-scout-700/50 rounded-2xl p-5 text-center">
                                                    <div className="w-10 h-10 bg-scout-800 rounded-xl mx-auto mb-3 flex items-center justify-center">
                                                        {status === PlayerStatus.LEAD && <UserPlus size={18} className="text-gray-400/50" />}
                                                        {status === PlayerStatus.CONTACTED && <Mail size={18} className="text-purple-400/50" />}
                                                        {status === PlayerStatus.INTERESTED && <Users size={18} className="text-blue-400/50" />}
                                                        {status === PlayerStatus.OFFERED && <Target size={18} className="text-scout-highlight/50" />}
                                                        {status === PlayerStatus.PLACED && <Trophy size={18} className="text-scout-accent/50" />}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-gray-600 uppercase">
                                                        {status === PlayerStatus.LEAD && 'New players you discover'}
                                                        {status === PlayerStatus.CONTACTED && 'Players you\'ve reached out to'}
                                                        {status === PlayerStatus.INTERESTED && 'Players who responded'}
                                                        {status === PlayerStatus.OFFERED && 'Players with active offers'}
                                                        {status === PlayerStatus.PLACED && 'Successfully placed'}
                                                    </p>
                                                </div>
                                            ) : (
                                                players.filter(p => p.status === status).map(p => <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onEdit={handleEditPlayer} onDelete={onDeletePlayer} />)
                                            )}
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
                        <OutreachTab players={players} user={user} initialPlayerId={outreachTargetId} onMessageSent={onMessageSent || (() => { })} onAddPlayers={(pls) => pls.forEach(p => onAddPlayer(p))} onStatusChange={handleStatusChange} onDeletePlayer={onDeletePlayer} />
                    </ErrorBoundary>
                )}
                {activeTab === DashboardTab.EVENTS && (
                    <ErrorBoundary name="Events">
                        <EventHub events={events} user={user} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} />
                    </ErrorBoundary>
                )}
                {activeTab === DashboardTab.KNOWLEDGE && (
                    <ErrorBoundary name="Pathways">
                        <PathwaysTab />
                    </ErrorBoundary>
                )}

                {isSubmissionOpen && <PlayerSubmission onClose={handleCloseSubmission} onAddPlayer={onAddPlayer} onUpdatePlayer={onUpdatePlayer} existingPlayers={players} editingPlayer={editingPlayer} initialMode={submissionInitialMode} />}
                {isBeamOpen && <SidelineBeam user={user} onClose={() => setIsBeamOpen(false)} />}
                {isBugReportOpen && <ReportBugModal onClose={() => setIsBugReportOpen(false)} />}
                {pendingOfferedPlayer && <PathwaySelectionModal player={pendingOfferedPlayer} onSelect={handlePathwaySelected} onCancel={handlePathwayCancelled} />}
            </main>

            {/* Mobile Feedback Button */}
            <button
                onClick={() => setIsBugReportOpen(true)}
                className="md:hidden fixed bottom-[5.5rem] left-4 z-[115] w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 active:scale-95 transition-all shadow-lg"
            >
                <Lightbulb size={20} />
            </button>

            {/* Mobile Profile Sheet */}
            {showMobileProfile && (
                <div className="md:hidden fixed inset-0 z-[200]" onClick={() => setShowMobileProfile(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-scout-800 rounded-t-3xl border-t border-scout-700 p-6 animate-slide-up max-h-[75vh] overflow-y-auto custom-scrollbar"
                        style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle bar - tappable to dismiss */}
                        <button onClick={() => setShowMobileProfile(false)} className="w-full flex justify-center py-2 -mt-2 mb-4" aria-label="Close">
                            <div className="w-12 h-1 bg-scout-600 rounded-full" />
                        </button>

                        {/* User info */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-scout-accent flex items-center justify-center font-black text-xl text-scout-900">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                        </div>

                        {/* XP Progress */}
                        {(() => {
                            const level = Math.floor(scoutScore / 100) + 1;
                            const xpInLevel = scoutScore % 100;
                            const levelNames = ['Rookie', 'Scout', 'Hunter', 'Pro Scout', 'Elite', 'Legend', 'Master', 'Grand Master'];
                            const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];
                            return (
                                <div className="bg-gradient-to-r from-scout-accent/10 to-scout-highlight/10 border border-scout-accent/30 rounded-2xl p-4 mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-scout-accent/20 flex items-center justify-center">
                                                <Trophy size={24} className="text-scout-accent" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase text-gray-400">Level {level}</p>
                                                <p className="text-xl font-black text-white">{levelName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-scout-accent">{scoutScore}</p>
                                            <p className="text-xs text-gray-500 uppercase">Total XP</p>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-scout-900 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-scout-accent to-scout-highlight transition-all duration-500"
                                            style={{ width: `${xpInLevel}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 text-center">{100 - xpInLevel} XP to Level {level + 1}</p>
                                </div>
                            );
                        })()}

                        {/* How to earn XP */}
                        <div className="mb-6">
                            <p className="text-xs font-bold uppercase text-gray-500 mb-3">How to earn XP</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">Add player</span>
                                    <span className="text-scout-accent font-bold">+5</span>
                                </div>
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">Complete profile</span>
                                    <span className="text-scout-accent font-bold">+5</span>
                                </div>
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">First outreach</span>
                                    <span className="text-scout-accent font-bold">+5</span>
                                </div>
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">→ Interested</span>
                                    <span className="text-scout-accent font-bold">+10</span>
                                </div>
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">→ Offered</span>
                                    <span className="text-scout-accent font-bold">+25</span>
                                </div>
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">Attend event</span>
                                    <span className="text-scout-accent font-bold">+15</span>
                                </div>
                                <div className="bg-scout-900/50 rounded-lg p-2 flex justify-between">
                                    <span className="text-gray-400">Host event</span>
                                    <span className="text-scout-accent font-bold">+50</span>
                                </div>
                                <div className="bg-gradient-to-r from-scout-accent/20 to-scout-highlight/20 rounded-lg p-2 flex justify-between border border-scout-accent/30">
                                    <span className="text-white font-bold">Placement</span>
                                    <span className="text-scout-accent font-black">+500</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            {onReturnToAdmin && (
                                <button
                                    onClick={() => { setShowMobileProfile(false); onReturnToAdmin(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 font-bold"
                                >
                                    <Users size={20} /> Return to Admin
                                </button>
                            )}
                            {onLogout && (
                                <button
                                    onClick={() => { setShowMobileProfile(false); onLogout(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-scout-900/50 border border-scout-700 rounded-xl text-gray-400 font-bold"
                                >
                                    <LogOut size={20} /> Sign Out
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <nav className="md:hidden fixed bottom-0 w-full bg-[#05080f]/95 backdrop-blur-2xl border-t border-scout-700 z-[110] px-2 pt-2 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                <div className="flex justify-around items-end max-w-md mx-auto">
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.PLAYERS); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.PLAYERS ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <Users size={20} />
                        <span className="text-[8px] font-black uppercase">Players</span>
                    </button>
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.EVENTS); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.EVENTS ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <CalendarDays size={20} />
                        <span className="text-[8px] font-black uppercase">Events</span>
                    </button>
                    <div className="-mt-6 bg-[#05080f] p-2 rounded-full border border-scout-700/50 shadow-2xl">
                        <button onClick={() => { haptic.medium(); setIsSubmissionOpen(true); }} className="w-14 h-14 bg-scout-accent text-scout-900 rounded-full flex items-center justify-center shadow-glow border-2 border-scout-accent/50 active:scale-90 transition-transform">
                            <Plus size={28} />
                        </button>
                    </div>
                    <button onClick={() => { haptic.light(); setActiveTab(DashboardTab.KNOWLEDGE); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === DashboardTab.KNOWLEDGE ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <BookOpen size={20} />
                        <span className="text-[8px] font-black uppercase">Pathways</span>
                    </button>
                    {/* XP Level indicator - opens profile sheet */}
                    <button onClick={() => { haptic.light(); setShowMobileProfile(true); }} className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-scout-accent/30 to-scout-highlight/20 border-2 border-scout-accent flex items-center justify-center">
                            <span className="text-[10px] font-black text-scout-accent">{Math.floor(scoutScore / 100) + 1}</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-scout-accent">{scoutScore}xp</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

// Memoize to prevent unnecessary re-renders when parent state changes
export default memo(Dashboard);
