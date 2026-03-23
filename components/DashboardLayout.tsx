import React, { useState, useEffect, useCallback, memo } from 'react';
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { UserProfile, Player, ScoutingEvent, PlayerStatus, AppNotification } from '../types';
import PlayerSubmission from './PlayerSubmission';
import { ConnectionStatus } from './MobileEnhancements';
import GlobalSearch from './GlobalSearch';
import TrialRequestModal, { TrialDates } from './TrialRequestModal';
import PlacementModal, { PlacementData } from './PlacementModal';
import { haptic } from '../hooks/useMobileFeatures';
import { Home, Users, CalendarDays, Plus, LogOut, Lightbulb, BarChart3, Link2, Copy, CheckCircle, DollarSign, Share2, Zap } from 'lucide-react';
import ReportBugModal from './ReportBugModal';
import { BulkOutreachFlow } from './BulkOutreachFlow';
import ShareToolkit from './ShareToolkit';
import NetworkOutreachModal from './NetworkOutreachModal';
import { useScoutEarnings, EarningsBreakdown } from '../hooks/useScoutEarnings';

// Context type for child routes
export interface DashboardContext {
    user: UserProfile;
    players: Player[];
    events: ScoutingEvent[];
    notifications: AppNotification[];
    onAddPlayer: (player: Player) => void;
    onUpdateProfile?: (profile: UserProfile) => void;
    onAddEvent: (event: ScoutingEvent) => void;
    onUpdateEvent: (event: ScoutingEvent) => void;
    onUpdatePlayer: (player: Player) => void;
    onDeletePlayer?: (id: string) => void;
    onAddNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    onMarkAllRead: () => void;
    onMessageSent?: (id: string, log: any) => void;
    onStatusChange?: (id: string, newStatus: PlayerStatus, pathway?: string, trialDates?: TrialDates) => void;
    // Shared UI state handlers
    handleStatusChange: (id: string, newStatus: PlayerStatus, extraData?: string) => void;
    handleEditPlayer: (player: Player) => void;
    setIsSubmissionOpen: (open: boolean) => void;
    setSubmissionInitialMode: (mode: 'HUB' | 'BULK' | undefined) => void;
    openBulkOutreach: () => void;
    submissionLink: string;
    handleCopyLink: () => void;
    linkCopied: boolean;
    earnings: EarningsBreakdown;
}

// Hook for child routes to access dashboard context
export function useDashboardContext() {
    return useOutletContext<DashboardContext>();
}

interface DashboardLayoutProps {
    user: UserProfile;
    players: Player[];
    events: ScoutingEvent[];
    notifications: AppNotification[];
    onAddPlayer: (player: Player) => void;
    onUpdateProfile?: (profile: UserProfile) => void;
    onAddEvent: (event: ScoutingEvent) => void;
    onUpdateEvent: (event: ScoutingEvent) => void;
    onUpdatePlayer: (player: Player) => void;
    onDeletePlayer?: (id: string) => void;
    onAddNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    onMarkAllRead: () => void;
    onMessageSent?: (id: string, log: any) => void;
    onStatusChange?: (id: string, newStatus: PlayerStatus, pathway?: string, trialDates?: TrialDates) => void;
    onLogout?: () => void;
    onReturnToAdmin?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    user,
    players,
    events,
    notifications,
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
    onReturnToAdmin,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
    const [submissionInitialMode, setSubmissionInitialMode] = useState<'HUB' | 'BULK' | undefined>(undefined);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isBulkOutreachOpen, setIsBulkOutreachOpen] = useState(false);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);
    const [pendingOfferedPlayer, setPendingOfferedPlayer] = useState<Player | null>(null);
    const [pendingPlacedPlayer, setPendingPlacedPlayer] = useState<Player | null>(null);
    const [showMobileProfile, setShowMobileProfile] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isShareToolkitOpen, setIsShareToolkitOpen] = useState(false);
    const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);


    // Auto-followup: trigger once per session to send pending follow-up emails
    useEffect(() => {
        const SESSION_KEY = 'scoutbuddy_followup_checked';
        if (sessionStorage.getItem(SESSION_KEY)) return;
        sessionStorage.setItem(SESSION_KEY, '1');
        const proxyUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!proxyUrl || !anonKey) return;
        fetch(`${proxyUrl}/functions/v1/auto-followup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
            body: '{}',
        }).catch(() => {}); // best-effort, never block UI
    }, []);

    const submissionLink = user.scoutId ? `https://app.warubi-sports.com?ref=${user.scoutId}` : '';
    const handleCopyLink = () => {
        if (!submissionLink) return;
        navigator.clipboard.writeText(submissionLink);
        setLinkCopied(true);
        haptic.success();
        setTimeout(() => setLinkCopied(false), 2000);
    };
    const activePlayers = players.filter(p => p.status !== 'Archived');
    const earnings = useScoutEarnings(user.scoutId, players);

    // Determine active tab from URL
    const activeTab = location.pathname.split('/').pop() || 'players';

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
                return;
            }

            if (isTyping) return;

            if (e.key === '/' || e.key === '?') {
                e.preventDefault();
                setIsSearchOpen(true);
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                setEditingPlayer(null);
                setIsSubmissionOpen(true);
            } else if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                navigate('/dashboard/events');
            } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                navigate('/dashboard/players');
            } else if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                navigate('/dashboard/outreach');
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                navigate('/dashboard/my-business');
            } else if (e.key === 'Escape') {
                if (isSearchOpen) setIsSearchOpen(false);
                if (isSubmissionOpen) {
                    setIsSubmissionOpen(false);
                    setEditingPlayer(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, isSubmissionOpen, navigate]);

    const handleStatusChange = (id: string, newStatus: PlayerStatus, extraData?: string) => {
        const player = players.find(p => p.id === id);

        // Intercept REQUEST_TRIAL to show trial date picker
        if (newStatus === PlayerStatus.REQUEST_TRIAL && player && player.status !== PlayerStatus.REQUEST_TRIAL) {
            setPendingOfferedPlayer(player);
            return;
        }

        // Intercept PLACED to show PlacementModal
        if (newStatus === PlayerStatus.PLACED && player && player.status !== PlayerStatus.PLACED) {
            setPendingPlacedPlayer(player);
            return;
        }

        if (newStatus === PlayerStatus.PLACED) {
            haptic.success();
        } else if (newStatus === PlayerStatus.ARCHIVED) {
            haptic.medium();
        } else {
            haptic.light();
        }
        if (onStatusChange) onStatusChange(id, newStatus, extraData);
    };

    const handleTrialSubmitted = (trialDates: TrialDates) => {
        if (!pendingOfferedPlayer) return;
        haptic.success();
        if (onStatusChange) onStatusChange(pendingOfferedPlayer.id, PlayerStatus.REQUEST_TRIAL, undefined, trialDates);
        setPendingOfferedPlayer(null);
    };

    const handleTrialCancelled = () => {
        setPendingOfferedPlayer(null);
    };

    const handlePlacementSubmitted = (data: PlacementData) => {
        if (!pendingPlacedPlayer) return;
        haptic.success();
        if (onStatusChange) onStatusChange(pendingPlacedPlayer.id, PlayerStatus.PLACED, data.placedLocation);
        // Also update program duration
        if (onUpdatePlayer) {
            onUpdatePlayer({ ...pendingPlacedPlayer, status: PlayerStatus.PLACED, programDuration: data.programDuration, placedLocation: data.placedLocation });
        }
        setPendingPlacedPlayer(null);
    };

    const handlePlacementCancelled = () => {
        setPendingPlacedPlayer(null);
    };

    const handleEditPlayer = (player: Player) => {
        setEditingPlayer(player);
        setIsSubmissionOpen(true);
    };

    const handleCloseSubmission = () => {
        setIsSubmissionOpen(false);
        setEditingPlayer(null);
    };

    // Build context for child routes
    const outletContext: DashboardContext = {
        user,
        players,
        events,
        notifications,
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
        handleStatusChange,
        handleEditPlayer,
        setIsSubmissionOpen,
        setSubmissionInitialMode,
        openBulkOutreach: () => setIsBulkOutreachOpen(true),
        submissionLink,
        handleCopyLink,
        linkCopied,
        earnings,
    };

    const isOutreachTab = activeTab === 'outreach';

    return (
        <div className="flex h-screen bg-[#05080f] text-white overflow-hidden relative">
            <ConnectionStatus />
            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                players={players}
                events={events}
                onNavigate={(tab) => navigate(`/dashboard/${tab.toLowerCase()}`)}
                onSelectPlayer={(player) => {
                    setEditingPlayer(player);
                    setIsSubmissionOpen(true);
                }}
                onSelectEvent={() => {
                    navigate('/dashboard/events');
                }}
                onOpenAddPlayer={() => setIsSubmissionOpen(true)}
            />
            <aside className="w-72 bg-scout-800 border-r border-scout-700 hidden md:flex flex-col shrink-0 overflow-y-auto">
                <div className="p-8 border-b border-scout-700">
                    <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Scout<span className="text-scout-accent">Buddy</span></h1>
                </div>
                {/* Primary Actions */}
                <div className="p-4 space-y-2">
                    <button onClick={() => { haptic.medium(); setEditingPlayer(null); setIsSubmissionOpen(true); }} className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-scout-accent text-scout-900 font-black text-sm shadow-glow hover:bg-emerald-400 transition-all active:scale-[0.98]">
                        <Plus size={20} /> Add Player
                    </button>
                    <button onClick={() => setIsShareToolkitOpen(true)} className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl bg-scout-accent/10 border border-scout-accent/30 text-scout-accent font-bold text-xs hover:bg-scout-accent/20 transition-all active:scale-[0.98]">
                        <Share2 size={16} />
                        Share ExposureEngine Link
                    </button>
                </div>
                {/* Earnings ticker */}
                {earnings.hasAgreement && (
                    <div className="mx-4 p-4 bg-scout-900/50 border border-scout-700 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Pipeline Value</p>
                        <p className="text-2xl font-black text-white tracking-tight">
                            {earnings.currency === 'USD' ? '$' : '€'}{earnings.total.toLocaleString()}
                        </p>
                        <div className="flex gap-3 mt-2 text-[10px]">
                            <span className="text-scout-accent font-bold">{earnings.currency === 'USD' ? '$' : '€'}{earnings.placed.toLocaleString()} earned</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-400">{earnings.currency === 'USD' ? '$' : '€'}{earnings.pipeline.toLocaleString()} projected</span>
                        </div>
                    </div>
                )}
                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => navigate('/dashboard/players')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'players' ? 'bg-scout-700 text-white' : 'text-gray-500 hover:bg-scout-900/50'}`}>
                        <Home size={20} /> Home
                        {activePlayers.length > 0 && <span className="ml-auto text-[10px] bg-scout-900 border border-scout-700 px-2 py-0.5 rounded-full text-gray-400">{activePlayers.length}</span>}
                    </button>
                    <button onClick={() => navigate('/dashboard/outreach')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'outreach' ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Zap size={20} /> Messages</button>
                    <button onClick={() => navigate('/dashboard/events')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'events' ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><CalendarDays size={20} /> Events</button>
                    <button onClick={() => navigate('/dashboard/my-business')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'my-business' ? 'bg-scout-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><BarChart3 size={20} /> My Business</button>
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
                <div className="flex-1" />
                <div className="p-4 border-t border-scout-700 bg-scout-900/30 space-y-3">
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

            <main className={`flex-1 min-h-0 ${isOutreachTab ? 'overflow-hidden p-4' : 'overflow-auto p-4 md:p-10 pb-28 md:pb-10 custom-scrollbar'}`}>
                <Outlet context={outletContext} />

                {isSubmissionOpen && <PlayerSubmission onClose={handleCloseSubmission} onAddPlayer={onAddPlayer} onUpdatePlayer={onUpdatePlayer} existingPlayers={players} editingPlayer={editingPlayer} initialMode={submissionInitialMode} />}
                {isBulkOutreachOpen && <BulkOutreachFlow scoutId={user.scoutId} scoutName={user.name} scoutBio={user.bio} onClose={() => setIsBulkOutreachOpen(false)} />}
                {isBugReportOpen && <ReportBugModal onClose={() => setIsBugReportOpen(false)} />}
                {isShareToolkitOpen && user.scoutId && <ShareToolkit scoutId={user.scoutId} scoutName={user.name} variant="modal" onClose={() => setIsShareToolkitOpen(false)} onEmailBlast={() => { setIsShareToolkitOpen(false); setIsNetworkModalOpen(true); }} />}
                <NetworkOutreachModal open={isNetworkModalOpen} onClose={() => setIsNetworkModalOpen(false)} players={players} scoutName={user.name} scoutId={user.scoutId || ''} submissionLink={submissionLink} />
                {pendingOfferedPlayer && <TrialRequestModal player={pendingOfferedPlayer} onSubmit={handleTrialSubmitted} onCancel={handleTrialCancelled} />}
                {pendingPlacedPlayer && <PlacementModal player={pendingPlacedPlayer} onSubmit={handlePlacementSubmitted} onCancel={handlePlacementCancelled} />}
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
                        <button onClick={() => setShowMobileProfile(false)} className="w-full flex justify-center py-2 -mt-2 mb-4" aria-label="Close">
                            <div className="w-12 h-1 bg-scout-600 rounded-full" />
                        </button>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-scout-accent flex items-center justify-center font-black text-xl text-scout-900">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">{user.name}</p>
                            </div>
                        </div>
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
                    <button onClick={() => { haptic.light(); navigate('/dashboard/players'); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === 'players' ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <Home size={20} />
                        <span className="text-[8px] font-black uppercase">Home</span>
                    </button>
                    <button onClick={() => { haptic.light(); navigate('/dashboard/events'); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === 'events' ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <CalendarDays size={20} />
                        <span className="text-[8px] font-black uppercase">Events</span>
                    </button>
                    <div className="-mt-6 bg-[#05080f] p-2 rounded-full border border-scout-700/50 shadow-2xl">
                        <button onClick={() => { haptic.medium(); setIsSubmissionOpen(true); }} className="w-14 h-14 bg-scout-accent text-scout-900 rounded-full flex items-center justify-center shadow-glow border-2 border-scout-accent/50 active:scale-90 transition-transform">
                            <Plus size={28} />
                        </button>
                    </div>
                    <button onClick={() => { haptic.light(); navigate('/dashboard/outreach'); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === 'outreach' ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <Zap size={20} />
                        <span className="text-[8px] font-black uppercase">Messages</span>
                    </button>
                    <button onClick={() => { haptic.light(); navigate('/dashboard/my-business'); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${activeTab === 'my-business' ? 'text-scout-accent' : 'text-gray-600'}`}>
                        <BarChart3 size={20} />
                        <span className="text-[8px] font-black uppercase">Business</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default memo(DashboardLayout);
