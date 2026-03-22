import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, PlayerStatus, AppNotification } from '../types';
import PlayerCard from './PlayerCard';
import { ErrorBoundary } from './ErrorBoundary';
import { haptic } from '../hooks/useMobileFeatures';
import { Users, CalendarDays, Plus, PlusCircle, Flame, List, LayoutGrid, Search, Edit2, Trophy, ArrowRight, ArrowLeft, Target, Bell, Send, Archive, TrendingUp, LogOut, Mail, UserPlus, Filter, FileUp, BarChart3, Link2, Copy, CheckCircle, Share2, Zap } from 'lucide-react';
import { useDashboardContext } from './DashboardLayout';
import OutreachComposer from './OutreachComposer';

const PlayersContent: React.FC = () => {
    const {
        user,
        players,
        onAddPlayer,
        onDeletePlayer,
        onUpdatePlayer,
        handleStatusChange,
        handleEditPlayer,
        setIsSubmissionOpen,
        setSubmissionInitialMode,
        openBulkOutreach,
        onMessageSent,
        submissionLink,
        handleCopyLink,
        linkCopied,
        earnings,
    } = useDashboardContext();

    const handleUpdateNotes = useCallback((id: string, notes: string) => {
        const player = players.find(p => p.id === id);
        if (player) onUpdatePlayer({ ...player, notes });
    }, [players, onUpdatePlayer]);

    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<'board' | 'list' | 'stack'>('board');
    const [draggedOverStatus, setDraggedOverStatus] = useState<PlayerStatus | null>(null);
    const [listSearch, setListSearch] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [pipelineFilter, setPipelineFilter] = useState<'all' | 'active'>('all');
    const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);

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

    const spotlights = players.filter(p => p.status === PlayerStatus.LEAD && (p.activityStatus === 'spotlight' || p.activityStatus === 'signal'));
    const [reviewIdx, setReviewIdx] = useState(0);
    const currentSpotlight = spotlights[reviewIdx];

    const promoteLead = (id: string) => {
        handleStatusChange(id, PlayerStatus.REQUEST_TRIAL);
        if (reviewIdx >= spotlights.length - 1) setReviewIdx(0);
    };

    const [outreachPlayer, setOutreachPlayer] = useState<Player | null>(null);
    const jumpToOutreach = (player: Player) => { setOutreachPlayer(player); };

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
                <div className="absolute inset-0 flex">
                    <div className="flex-1 bg-scout-accent flex items-center justify-start pl-8 transition-opacity" style={{ opacity: offset > 0 ? swipeProgress : 0 }}>
                        <div className="flex items-center gap-2 text-scout-900">
                            <TrendingUp size={24} />
                            <span className="font-black text-sm uppercase">Promote</span>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-600 flex items-center justify-end pr-8 transition-opacity" style={{ opacity: offset < 0 ? swipeProgress : 0 }}>
                        <div className="flex items-center gap-2 text-white">
                            <span className="font-black text-sm uppercase">Archive</span>
                            <Archive size={24} />
                        </div>
                    </div>
                </div>
                <div className={`relative bg-scout-800 rounded-3xl transition-transform ${isDragging ? '' : 'duration-300'}`} style={{ transform: `translateX(${offset}px)` }}
                    onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <PlayerCard player={player} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onUpdateNotes={handleUpdateNotes} onEdit={handleEditPlayer} onDelete={onDeletePlayer} />
                </div>
            </div>
        );
    };

    const PipelineStack = () => {
        const allowedStatuses = pipelineFilter === 'all'
            ? [PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED]
            : [PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED];

        const activePlayers = players.filter(p => allowedStatuses.includes(p.status));
        const [stackIdx, setStackIdx] = useState(0);
        const currentPlayer = activePlayers[stackIdx];

        if (activePlayers.length === 0) return (
            <div className="flex flex-col items-center py-10 text-center">
                <div className="w-20 h-20 bg-scout-accent/10 rounded-3xl flex items-center justify-center mb-6 border-2 border-scout-accent/30">
                    <Zap size={36} className="text-scout-accent" />
                </div>
                <p className="text-2xl font-black uppercase italic text-white mb-2">
                    {earnings.hasAgreement ? `${earnings.currency === 'USD' ? '$' : '€'}0 Pipeline` : 'Build Your Pipeline'}
                </p>
                <p className="text-sm text-gray-400 mb-8 max-w-sm">
                    {earnings.hasAgreement
                        ? `Each placement earns you ${earnings.currency === 'USD' ? '$' : '€'}${earnings.perPlayerRate.toLocaleString()}. Add players to start earning.`
                        : 'The more players you add, the more placements you close. Start now.'}
                </p>
                <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                    <button onClick={() => setIsSubmissionOpen(true)} className="w-full bg-scout-accent hover:bg-emerald-400 text-scout-900 px-6 py-4 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 shadow-glow">
                        <PlusCircle size={22} /> Add Player Manually
                    </button>
                    <button onClick={() => { setSubmissionInitialMode('BULK'); setIsSubmissionOpen(true); }} className="w-full bg-scout-800 hover:bg-scout-700 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 border border-scout-700">
                        <FileUp size={22} /> Bulk Import Roster
                    </button>
                    <button onClick={handleCopyLink} className="w-full bg-scout-accent/10 hover:bg-scout-accent/20 text-scout-accent px-6 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95 border border-scout-accent/30">
                        {linkCopied ? <CheckCircle size={22} /> : <Link2 size={22} />}
                        {linkCopied ? 'Link Copied!' : 'Share Your Submission Link'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-6 max-w-xs">Put the link in your Instagram bio, send it to coaches, or share it on WhatsApp. Players submit themselves.</p>
            </div>
        );

        const handleArchive = () => {
            if (currentPlayer) {
                handleStatusChange(currentPlayer.id, PlayerStatus.ARCHIVED);
                if (stackIdx >= activePlayers.length - 1) setStackIdx(Math.max(0, stackIdx - 1));
            }
        };

        const handlePromote = () => {
            if (currentPlayer) {
                const stages = [PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED];
                const currentIndex = stages.indexOf(currentPlayer.status);
                if (currentIndex < stages.length - 1) handleStatusChange(currentPlayer.id, stages[currentIndex + 1]);
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
                <div className="flex justify-center gap-6 text-[10px] text-gray-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><ArrowLeft size={12} /> Swipe to archive</span>
                    <span className="flex items-center gap-1">Swipe to promote <ArrowRight size={12} /></span>
                </div>
                <div className="relative">
                    {currentPlayer && (
                        <div className="animate-fade-in">
                            <SwipeableStackCard player={currentPlayer} onArchive={handleArchive} onPromote={handlePromote} />
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
            ? [PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED]
            : [PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED];

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
                                            {[PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED, PlayerStatus.ARCHIVED].map(status => <option key={status} value={status}>{status}</option>)}
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
        <>
        <ErrorBoundary name="Pipeline">
        <div className="space-y-8 animate-fade-in">
            {/* P2: HOT LEAD BANNER */}
            {spotlights.filter(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight').length > 0 && (
                <div className="bg-gradient-to-r from-scout-accent/20 via-emerald-500/10 to-scout-accent/20 border-2 border-scout-accent rounded-2xl p-4 md:p-6 animate-pulse-slow relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzEwYjk4MTIwIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
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
                            <button onClick={() => currentSpotlight && jumpToOutreach(currentSpotlight)} className="flex-1 md:flex-none px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all">
                                <Send size={18} /> Message Now
                            </button>
                            <button onClick={() => currentSpotlight && promoteLead(currentSpotlight.id)} className="px-6 py-3 bg-white/10 text-white rounded-xl font-black text-sm uppercase hover:bg-white/20 transition-all">
                                Add to Pipeline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* P0: TODAY'S PRIORITY CARD */}
            {(() => {
                const hotSignal = spotlights.find(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight');
                const topLead = players
                    .filter(p => p.status === PlayerStatus.LEAD || p.status === PlayerStatus.REQUEST_TRIAL || p.status === PlayerStatus.SEND_CONTRACT)
                    .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))[0];
                const offeredPlayer = players.find(p => p.status === PlayerStatus.OFFERED);

                let priority: { type: string; title: string; subtitle: string; action: () => void; actionLabel: string; icon: React.ReactNode } | null = null;

                if (hotSignal && !spotlights.some(p => p.activityStatus === 'signal' || p.activityStatus === 'spotlight')) {
                    // skip
                } else if (offeredPlayer) {
                    priority = {
                        type: 'CLOSE TO PLACEMENT',
                        title: `${offeredPlayer.name} is one step away from a life-changing opportunity`,
                        subtitle: `Score: ${offeredPlayer.evaluation?.score || '?'} • ${offeredPlayer.evaluation?.scholarshipTier || 'Untiered'} — close this.`,
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
                        title: earnings.hasAgreement
                            ? 'Somewhere out there, a player needs you to find them'
                            : 'Your pipeline is empty',
                        subtitle: earnings.hasAgreement
                            ? `Every player you add is a potential career changed. Each placement earns you ${earnings.currency === 'USD' ? '$' : '€'}${earnings.perPlayerRate.toLocaleString()}.`
                            : 'Add players manually, bulk import a roster, or share your link so players submit themselves',
                        action: () => setIsSubmissionOpen(true),
                        actionLabel: 'Add Player',
                        icon: <Zap className="text-scout-accent" size={24} />
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
                            <button onClick={priority.action} className="w-full md:w-auto px-6 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all active:scale-95">
                                {priority.actionLabel} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* GROWTH NUDGE — show when pipeline is small */}
            {(() => {
                const nonArchived = players.filter(p => p.status !== PlayerStatus.ARCHIVED);
                if (nonArchived.length > 0 && nonArchived.length < 5) {
                    return (
                        <div className="bg-scout-800/50 border border-scout-700 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-11 h-11 bg-scout-accent/10 rounded-xl flex items-center justify-center border border-scout-accent/20 shrink-0">
                                    <Share2 size={20} className="text-scout-accent" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-white">Grow faster — share your link</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">Players submit themselves. Put it in your bio, send to coaches, share on WhatsApp.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto shrink-0">
                                <button onClick={handleCopyLink} className="flex-1 md:flex-none px-5 py-2.5 bg-scout-accent/10 border border-scout-accent/30 text-scout-accent rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-scout-accent/20 transition-all active:scale-95">
                                    {linkCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                    {linkCopied ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button onClick={() => { setSubmissionInitialMode('BULK'); setIsSubmissionOpen(true); }} className="flex-1 md:flex-none px-5 py-2.5 bg-scout-800 border border-scout-700 text-gray-300 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-scout-700 transition-all active:scale-95">
                                    <FileUp size={14} /> Bulk Add
                                </button>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* SPOTLIGHT BANNER */}
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
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Your Player Portfolio</p>
                        {earnings.hasAgreement && (
                            <span className="md:hidden bg-scout-accent/10 border border-scout-accent/30 text-scout-accent text-[10px] font-black px-2.5 py-1 rounded-lg">
                                {earnings.currency === 'USD' ? '$' : '€'}{earnings.total.toLocaleString()} pipeline
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex shadow-inner">
                        <button onClick={() => setPipelineFilter('all')} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${pipelineFilter === 'all' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}>All</button>
                        <button onClick={() => setPipelineFilter('active')} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${pipelineFilter === 'active' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}>Active</button>
                    </div>
                    <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 flex shadow-inner">
                        {!isMobile && <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'board' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><LayoutGrid size={16} /> Board</button>}
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'list' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><List size={16} /> List</button>
                        {isMobile && <button onClick={() => setViewMode('stack')} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${viewMode === 'stack' ? 'bg-scout-accent text-scout-900' : 'text-gray-500'}`}><LayoutGrid size={16} /> Stack</button>}
                    </div>
                    <button onClick={() => { setSubmissionInitialMode(undefined); setIsSubmissionOpen(true); }} className="bg-scout-accent hover:bg-emerald-600 text-scout-900 p-4 md:px-8 md:py-4 rounded-2xl font-black shadow-glow flex items-center gap-3 active:scale-95 transition-all"><PlusCircle size={24} /> <span className="hidden md:inline">Add Player</span></button>
                    <button onClick={() => openBulkOutreach()} className="bg-emerald-900 hover:bg-emerald-800 text-scout-accent p-4 md:px-6 md:py-4 rounded-2xl font-black border border-scout-accent/30 flex items-center gap-2 active:scale-95 transition-all"><FileUp size={20} /> <span className="hidden md:inline">Bulk + Outreach</span></button>
                </div>
            </div>

            {viewMode === 'board' ? (
                <div className="flex gap-4 overflow-x-auto pb-8 custom-scrollbar min-h-[500px]">
                    {(pipelineFilter === 'all'
                        ? [PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED]
                        : [PlayerStatus.SEND_CONTRACT, PlayerStatus.OFFERED, PlayerStatus.PLACED]
                    ).map(status => (
                        <div key={status} onDragOver={(e) => onDragOver(e, status)} onDrop={(e) => onDrop(e, status)} className={`flex-1 min-w-[280px] flex flex-col bg-scout-800/20 rounded-[2rem] border ${draggedOverStatus === status ? 'border-scout-accent bg-scout-accent/5 shadow-glow' : 'border-scout-700/50'}`}>
                            <div className="p-6 border-b border-scout-700/50 bg-scout-900/20 backdrop-blur-md flex justify-between items-center rounded-t-[2rem]">
                                <h3 className={`font-black uppercase text-[10px] tracking-[0.2em] ${
                                    status === PlayerStatus.PLACED ? 'text-scout-accent' :
                                    status === PlayerStatus.OFFERED ? 'text-scout-highlight' :
                                    status === PlayerStatus.SEND_CONTRACT ? 'text-orange-400' :
                                    status === PlayerStatus.REQUEST_TRIAL ? 'text-blue-400' :
                                    'text-gray-400'
                                }`}>{status}</h3>
                                <span className="text-[10px] bg-scout-900 border border-scout-700 px-2 py-1 rounded-full text-gray-500 font-black">{players.filter(p => p.status === status).length}</span>
                            </div>
                            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(100vh-450px)]">
                                {players.filter(p => p.status === status).length === 0 ? (
                                    <div className="border-2 border-dashed border-scout-700/50 rounded-2xl p-5 text-center">
                                        <div className="w-10 h-10 bg-scout-800 rounded-xl mx-auto mb-3 flex items-center justify-center">
                                            {status === PlayerStatus.LEAD && <UserPlus size={18} className="text-gray-400/50" />}
                                            {status === PlayerStatus.REQUEST_TRIAL && <CalendarDays size={18} className="text-blue-400/50" />}
                                            {status === PlayerStatus.SEND_CONTRACT && <Send size={18} className="text-orange-400/50" />}
                                            {status === PlayerStatus.OFFERED && <Target size={18} className="text-scout-highlight/50" />}
                                            {status === PlayerStatus.PLACED && <Trophy size={18} className="text-scout-accent/50" />}
                                        </div>
                                        <p className="text-[9px] font-bold text-gray-600 uppercase mb-3">
                                            {status === PlayerStatus.LEAD && 'New players you discover'}
                                            {status === PlayerStatus.REQUEST_TRIAL && 'Players requesting a trial'}
                                            {status === PlayerStatus.SEND_CONTRACT && 'Players ready for contracts'}
                                            {status === PlayerStatus.OFFERED && 'Players with active offers'}
                                            {status === PlayerStatus.PLACED && 'Successfully placed'}
                                        </p>
                                        {status === PlayerStatus.LEAD && (
                                            <div className="space-y-2">
                                                <button onClick={() => setIsSubmissionOpen(true)} className="w-full py-2 bg-scout-accent/10 text-scout-accent rounded-lg text-[10px] font-black uppercase hover:bg-scout-accent/20 transition-all">
                                                    <Plus size={12} className="inline mr-1" /> Add Player
                                                </button>
                                                <button onClick={handleCopyLink} className="w-full py-2 bg-scout-800 text-gray-400 rounded-lg text-[10px] font-bold hover:text-gray-300 transition-all">
                                                    {linkCopied ? 'Copied!' : 'Share Link'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    players.filter(p => p.status === status).map(p => <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} onUpdateNotes={handleUpdateNotes} onEdit={handleEditPlayer} onDelete={onDeletePlayer} />)
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

        {/* Outreach Composer slide-over */}
        {outreachPlayer && onMessageSent && (
            <OutreachComposer
                player={outreachPlayer}
                user={user}
                onMessageSent={onMessageSent}
                onClose={() => setOutreachPlayer(null)}
            />
        )}
        </>
    );
};

export default memo(PlayersContent);
