import React, { useState, useEffect, memo } from 'react';
import { Player, ScoutingEvent, PlayerStatus, UserProfile, AppNotification } from '../types';
import {
    LayoutDashboard, Users, Calendar, CheckCircle, XCircle,
    ShieldCheck, Activity, Search, Filter, Briefcase, Award,
    LogOut, Globe, TrendingUp, AlertCircle, FileText, Check,
    MoreHorizontal, Edit2, BadgeCheck, X, Save, Eye, Plus,
    List, LayoutGrid, Flame, Trash2, Link, Bell, KeyRound, Bug, Copy, ExternalLink, Loader2, BarChart3
} from 'lucide-react';
import ApprovedScoutsManager from './ApprovedScoutsManager';
import AdminPlayerDetail from './AdminPlayerDetail';
import PlayerSubmission from './PlayerSubmission';
import { getAllBugReports, updateBugReportStatus, generateClaudePrompt } from '../services/bugReportService';
import { useAllScouts } from '../hooks/useAllScouts';
import { useAllProspects, PlayerWithScout } from '../hooks/useAllProspects';
import { supabase, supabaseRest } from '../lib/supabase';
import type { BugReport, BugReportStatus } from '../types';
import type { Scout } from '../lib/database.types';
import AdminAgreementPanel from './AdminAgreementPanel';
import { useAdminAgreements } from '../hooks/useAdminAgreements';
import { OverviewTab } from './admin/OverviewTab';
import { ApprovalsTab } from './admin/ApprovalsTab';
import { InsightsTab } from './admin/InsightsTab';
import { TalentTab } from './admin/TalentTab';

interface AdminDashboardProps {
    players: Player[];
    events: ScoutingEvent[];
    onUpdateEvent: (event: ScoutingEvent) => void;
    onUpdatePlayer: (player: Player) => void;
    onAddEvent?: (event: ScoutingEvent) => void;
    onDeleteEvent?: (eventId: string) => void;
    onLogout: () => void;
    onSwitchToScoutView?: () => void;
    onImpersonate?: (scout: UserProfile) => void;
    notifications?: AppNotification[];
    onAddNotification?: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    onMarkAllRead?: () => void;
}

// Scout type with stats for display
interface ScoutWithStats extends Scout {
  prospects_count?: number
  conversion_rate?: string
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    players,
    events,
    onUpdateEvent,
    onUpdatePlayer,
    onAddEvent,
    onDeleteEvent,
    onLogout,
    onSwitchToScoutView,
    onImpersonate,
    notifications = [],
    onAddNotification,
    onMarkAllRead
}) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPROVALS' | 'TALENT' | 'SCOUTS' | 'ACCESS' | 'EVENTS' | 'BUGS' | 'INSIGHTS'>('OVERVIEW');
    const [searchQuery, setSearchQuery] = useState('');

    // Real scout data from Supabase
    const { scouts, loading: scoutsLoading, updateScout: updateScoutInDb, refresh: refreshScouts } = useAllScouts();

    // All prospects from all scouts (for Global Talent view)
    const { prospects: allProspects, loading: prospectsLoading, refresh: refreshProspects } = useAllProspects();

    // Scout Management State
    const [selectedScout, setSelectedScout] = useState<ScoutWithStats | null>(null);
    const [isEditingScout, setIsEditingScout] = useState(false);
    const [scoutFormData, setScoutFormData] = useState<ScoutWithStats | null>(null);
    const [newBadge, setNewBadge] = useState('');
    const [scoutViewMode, setScoutViewMode] = useState<'grid' | 'list'>('grid');

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);

    // Bug Reports State
    const [bugReports, setBugReports] = useState<BugReport[]>([]);
    const [bugReportsLoading, setBugReportsLoading] = useState(false);
    const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null);
    const [updatingBugId, setUpdatingBugId] = useState<string | null>(null);

    // Talent Detail Panel State
    const [selectedTalentPlayer, setSelectedTalentPlayer] = useState<PlayerWithScout | null>(null);
    const [editingTalentPlayer, setEditingTalentPlayer] = useState<PlayerWithScout | null>(null);
    const [isTalentSubmissionOpen, setIsTalentSubmissionOpen] = useState(false);

    const [savingScout, setSavingScout] = useState(false);

    // Admin agreements
    const { confirmEnrollment } = useAdminAgreements();

    // --- DERIVED STATS ---
    const pendingEvents = events.filter(e => e.status === 'Pending Approval');
    const totalPlaced = players.filter(p => p.status === PlayerStatus.PLACED).length;
    const totalValue = totalPlaced * 15000; // Mock ROI value
    const unreadNotifications = notifications.filter(n => !n.read).length;

    const approveEvent = (event: ScoutingEvent) => {
        onUpdateEvent({ ...event, status: 'Approved' });
        if (onAddNotification) {
            onAddNotification({
                type: 'SUCCESS',
                title: 'Event Approved',
                message: `HQ has approved your event: ${event.title}. It is now ready to publish.`
            });
        }
    };

    const rejectEvent = (event: ScoutingEvent) => {
        onUpdateEvent({ ...event, status: 'Rejected' });
        if (onAddNotification) {
            onAddNotification({
                type: 'ALERT',
                title: 'Event Rejected',
                message: `Your event request for ${event.title} was declined. Please contact HQ for details.`
            });
        }
    };

    const placePlayer = (player: Player) => {
        const location = prompt("Enter Placement Location (e.g. 'Signed with FC Dallas' or 'Scholarship at UCLA'):", "Signed Pro Contract");
        if (location) {
            onUpdatePlayer({ 
                ...player, 
                status: PlayerStatus.PLACED, 
                placedLocation: location 
            });
        }
    };

    // --- SCOUT MANAGEMENT HANDLERS ---

    const handleScoutClick = (scout: ScoutWithStats) => {
        setSelectedScout(scout);
        setScoutFormData({ ...scout });
        setIsEditingScout(false);
    };

    const handleScoutUpdate = async () => {
        if (!scoutFormData) return;
        setSavingScout(true);
        try {
            // Save to Supabase
            const success = await updateScoutInDb(scoutFormData.id, {
                name: scoutFormData.name,
                region: scoutFormData.region,
                roles: scoutFormData.roles,
                status: scoutFormData.status,
                bio: scoutFormData.bio,
            });
            if (success) {
                setSelectedScout(scoutFormData);
                setIsEditingScout(false);
                refreshScouts();
            } else {
                alert('Failed to save scout. Please try again.');
            }
        } catch (err) {
            console.error('Error saving scout:', err);
            alert('Error saving scout. Please try again.');
        } finally {
            setSavingScout(false);
        }
    };

    const scoutToUserProfile = (scout: ScoutWithStats): UserProfile => ({
        name: scout.name,
        roles: scout.roles || ['Regional Scout'],
        region: scout.region,
        affiliation: scout.affiliation || undefined,
        scoutPersona: scout.scout_persona || undefined,
        weeklyTasks: [],
        scoutId: scout.id,
        isAdmin: scout.is_admin,
        bio: scout.bio || undefined,
        leadMagnetActive: scout.lead_magnet_active,
    });

    const triggerImpersonation = () => {
        if (onImpersonate && selectedScout) {
            onImpersonate(scoutToUserProfile(selectedScout));
        }
    };

    const triggerRowImpersonation = (e: React.MouseEvent, scout: ScoutWithStats) => {
        e.stopPropagation();
        if (onImpersonate) onImpersonate(scoutToUserProfile(scout));
    }

    // --- BUG REPORTS HANDLERS ---

    const loadBugReports = async () => {
        setBugReportsLoading(true);
        const { reports, error } = await getAllBugReports();
        if (!error) {
            setBugReports(reports);
        }
        setBugReportsLoading(false);
    };

    const handleUpdateBugStatus = async (id: string, status: BugReportStatus, notes?: string) => {
        setUpdatingBugId(id);
        const result = await updateBugReportStatus(id, status, notes);
        if (result.success) {
            setBugReports(prev => prev.map(r =>
                r.id === id ? { ...r, status, adminNotes: notes || r.adminNotes, updatedAt: new Date().toISOString() } : r
            ));
            if (selectedBugReport?.id === id) {
                setSelectedBugReport({ ...selectedBugReport, status, adminNotes: notes || selectedBugReport.adminNotes });
            }
        }
        setUpdatingBugId(null);
    };

    const copyClaudePrompt = (report: BugReport) => {
        const prompt = generateClaudePrompt(report);
        navigator.clipboard.writeText(prompt);
        alert('Claude prompt copied to clipboard!');
    };

    // Load bug reports when tab is active
    React.useEffect(() => {
        if (activeTab === 'BUGS') {
            loadBugReports();
        }
    }, [activeTab]);

    // --- SUB-VIEWS (extracted to components/admin/) ---




    // Global Events State
    const [isAddingGlobalEvent, setIsAddingGlobalEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState<ScoutingEvent | null>(null);
    const [globalEventForm, setGlobalEventForm] = useState({
        title: '',
        location: '',
        date: '',
        endDate: '',
        time: '',
        type: 'Showcase' as 'ID Day' | 'Showcase' | 'Camp' | 'Tournament' | 'Trial',
        fee: ''
    });

    const handleSaveGlobalEvent = async () => {
        if (!globalEventForm.title || !globalEventForm.location || !globalEventForm.date) {
            alert('Please fill in title, location, and date');
            return;
        }

        const newEvent: ScoutingEvent = {
            id: `global-event-${Date.now()}`,
            title: globalEventForm.title,
            location: globalEventForm.location,
            date: globalEventForm.date,
            endDate: globalEventForm.endDate || undefined,
            time: globalEventForm.time || 'TBD',
            type: globalEventForm.type,
            fee: globalEventForm.fee ? parseFloat(globalEventForm.fee) : undefined,
            isMine: false,
            role: 'ATTENDEE',
            status: 'Published',
            marketingCopy: '',
            agenda: [],
            checklist: [
                { task: "Get the Roster", completed: false },
                { task: "Prepare Warubi QR Code", completed: false }
            ],
            isGlobal: true // Mark as global event
        };

        if (onAddEvent) {
            try {
                await onAddEvent(newEvent);
                setGlobalEventForm({
                    title: '',
                    location: '',
                    date: '',
                    endDate: '',
                    time: '',
                    type: 'Showcase',
                    fee: ''
                });
                setIsAddingGlobalEvent(false);
                if (onAddNotification) {
                    onAddNotification({
                        type: 'SUCCESS',
                        title: 'Global Event Created',
                        message: `${newEvent.title} is now visible to all scouts.`
                    });
                }
            } catch (error) {
                alert('Failed to create event: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    const handleEditEvent = (event: ScoutingEvent) => {
        setEditingEvent(event);
        setGlobalEventForm({
            title: event.title,
            location: event.location,
            date: event.date,
            endDate: event.endDate || '',
            time: event.time || '',
            type: event.type,
            fee: event.fee ? String(event.fee) : ''
        });
    };

    const handleUpdateGlobalEvent = async () => {
        if (!editingEvent) return;
        if (!globalEventForm.title || !globalEventForm.location || !globalEventForm.date) {
            alert('Please fill in title, location, and date');
            return;
        }

        const updatedEvent: ScoutingEvent = {
            ...editingEvent,
            title: globalEventForm.title,
            location: globalEventForm.location,
            date: globalEventForm.date,
            endDate: globalEventForm.endDate || undefined,
            time: globalEventForm.time || 'TBD',
            type: globalEventForm.type,
            fee: globalEventForm.fee ? parseFloat(globalEventForm.fee) : undefined,
        };

        try {
            onUpdateEvent(updatedEvent);
            setEditingEvent(null);
            setGlobalEventForm({
                title: '',
                location: '',
                date: '',
                endDate: '',
                time: '',
                type: 'Showcase',
                fee: ''
            });
            if (onAddNotification) {
                onAddNotification({
                    type: 'SUCCESS',
                    title: 'Event Updated',
                    message: `${updatedEvent.title} has been updated.`
                });
            }
        } catch (error) {
            alert('Failed to update event: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleDeleteGlobalEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        if (onDeleteEvent) {
            try {
                await onDeleteEvent(eventId);
                if (onAddNotification) {
                    onAddNotification({
                        type: 'INFO',
                        title: 'Event Deleted',
                        message: 'The event has been removed.'
                    });
                }
            } catch (error) {
                alert('Failed to delete event: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    // Filter global events (published events visible to all scouts)
    const globalEvents = events.filter(e => e.status === 'Published');


    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900 relative">
            {/* Scout Management Modal - inlined to prevent re-render issues */}
            {selectedScout && scoutFormData && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-700">
                                    {selectedScout.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {selectedScout.name}
                                        {selectedScout.is_admin && (
                                            <BadgeCheck size={18} className="text-blue-500 fill-blue-50" />
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500">{selectedScout.region} • {selectedScout.placements_count || 0} placements</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedScout(null)} className="text-gray-400 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">

                            {/* Stats Row */}
                            <div className="flex gap-4 mb-8">
                                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                                    <div className="text-2xl font-bold text-gray-900">{selectedScout.prospects_count || 0}</div>
                                    <div className="text-xs text-gray-500 uppercase">Prospects</div>
                                </div>
                                <div className="flex-1 bg-green-50 rounded-lg p-4 border border-green-200 text-center">
                                    <div className="text-2xl font-bold text-green-600">{selectedScout.placements_count || 0}</div>
                                    <div className="text-xs text-gray-500 uppercase">Placed</div>
                                </div>
                                <div className="flex-1 bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center justify-center">
                                    <button
                                        onClick={triggerImpersonation}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                    >
                                        <Eye size={16} /> View as Scout
                                    </button>
                                </div>
                            </div>

                            {/* Profile Editor */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Edit2 size={16} className="text-gray-400" /> Edit Profile
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                                        <input
                                            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={scoutFormData.name}
                                            onChange={e => setScoutFormData({...scoutFormData, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Region</label>
                                        <input
                                            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={scoutFormData.region}
                                            onChange={e => setScoutFormData({...scoutFormData, region: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Role</label>
                                        <input
                                            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={scoutFormData.roles?.[0] || ''}
                                            onChange={e => setScoutFormData({...scoutFormData, roles: [e.target.value]})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Account Status</label>
                                        <select
                                            className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={scoutFormData.status}
                                            onChange={e => setScoutFormData({...scoutFormData, status: e.target.value as 'active' | 'inactive' | 'pending'})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Bio</label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                        value={scoutFormData.bio || ''}
                                        onChange={e => setScoutFormData({...scoutFormData, bio: e.target.value})}
                                        placeholder="Scout bio..."
                                    />
                                </div>
                            </div>

                            {/* TDRF Agreement Panel */}
                            <AdminAgreementPanel scoutId={selectedScout.id} scoutName={selectedScout.name} />

                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedScout(null)}
                                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleScoutUpdate}
                                disabled={savingScout}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded shadow-lg flex items-center gap-2"
                            >
                                {savingScout ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Bell (Absolute for Admin) */}
            <div className="absolute top-6 right-8 z-30">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-gray-500 hover:text-blue-600 shadow-sm"
                >
                    <Bell size={20} />
                    {unreadNotifications > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-40 animate-fade-in">
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h4 className="text-xs font-bold text-gray-700 uppercase">Notifications</h4>
                            <button onClick={onMarkAllRead} className="text-[10px] text-blue-600 hover:underline">Mark all read</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">No new notifications</div>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                            <div>
                                                <p className="text-xs text-gray-800 mb-0.5 font-bold flex items-center gap-1">
                                                    {notif.type === 'SUCCESS' && <CheckCircle size={10} className="text-green-500"/>}
                                                    {notif.type === 'WARNING' && <Award size={10} className="text-yellow-500"/>}
                                                    {notif.type === 'ALERT' && <AlertCircle size={10} className="text-red-500"/>}
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-gray-500 leading-snug">{notif.message}</p>
                                                <p className="text-[9px] text-gray-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Admin Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-black tracking-tighter text-gray-900">WARUBI<span className="text-blue-600">HQ</span></h1>
                    <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">ADMIN CONTROL TOWER</p>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                    <button 
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'OVERVIEW' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <LayoutDashboard size={20} /> Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('APPROVALS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'APPROVALS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <ShieldCheck size={20} /> Approvals
                        {pendingEvents.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingEvents.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('TALENT')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'TALENT' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Globe size={20} /> Global Talent
                    </button>
                    <button
                        onClick={() => setActiveTab('SCOUTS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'SCOUTS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Briefcase size={20} /> Scout Network
                    </button>
                    <button
                        onClick={() => setActiveTab('ACCESS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ACCESS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <KeyRound size={20} /> Access Control
                    </button>
                    <button
                        onClick={() => setActiveTab('EVENTS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'EVENTS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Calendar size={20} /> Global Events
                    </button>
                    <button
                        onClick={() => setActiveTab('INSIGHTS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'INSIGHTS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <BarChart3 size={20} /> Insights
                    </button>
                    <button
                        onClick={() => setActiveTab('BUGS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'BUGS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Bug size={20} /> Bug Reports
                        {bugReports.filter(r => r.status === 'open').length > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {bugReports.filter(r => r.status === 'open').length}
                            </span>
                        )}
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-2">
                    {onSwitchToScoutView && (
                        <button onClick={onSwitchToScoutView} className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 w-full px-4 py-2 rounded-lg transition-colors">
                            <Eye size={18} /> Switch to Scout View
                        </button>
                    )}
                    <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 w-full px-4 py-2 transition-colors">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8">
                {activeTab === 'OVERVIEW' && (
                    <OverviewTab
                        scoutsLoading={scoutsLoading}
                        scoutsCount={scouts.length}
                        playersCount={players.length}
                        pendingEventsCount={pendingEvents.length}
                        totalValue={totalValue}
                    />
                )}
                {activeTab === 'APPROVALS' && (
                    <ApprovalsTab
                        pendingEvents={pendingEvents}
                        scouts={scouts}
                        approveEvent={approveEvent}
                        rejectEvent={rejectEvent}
                    />
                )}
                {activeTab === 'TALENT' && (
                    <TalentTab
                        prospectsLoading={prospectsLoading}
                        allProspects={allProspects}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedTalentPlayer={selectedTalentPlayer}
                        setSelectedTalentPlayer={setSelectedTalentPlayer}
                        placePlayer={placePlayer}
                        confirmEnrollment={confirmEnrollment}
                        refreshProspects={refreshProspects}
                    />
                )}
                {activeTab === 'INSIGHTS' && (
                    <InsightsTab
                        scouts={scouts}
                        allProspects={allProspects}
                    />
                )}
                
                {activeTab === 'SCOUTS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Scout Network Directory</h2>
                            
                            {/* View Toggle */}
                            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                                <button 
                                    onClick={() => setScoutViewMode('grid')}
                                    className={`p-2 rounded flex items-center gap-2 transition-colors ${scoutViewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button 
                                    onClick={() => setScoutViewMode('list')}
                                    className={`p-2 rounded flex items-center gap-2 transition-colors ${scoutViewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="List View"
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>

                        {scoutsLoading ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <Loader2 size={32} className="mx-auto text-gray-400 animate-spin mb-4" />
                                <p className="text-gray-500">Loading scouts...</p>
                            </div>
                        ) : scouts.length === 0 ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">No Scouts Yet</h3>
                                <p className="text-gray-500">Add scouts via Access Control to see them here.</p>
                            </div>
                        ) : scoutViewMode === 'grid' ? (
                            <div className="grid grid-cols-3 gap-6">
                                {scouts.map(scout => (
                                    <div
                                        key={scout.id}
                                        onClick={() => handleScoutClick(scout)}
                                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative"
                                    >
                                        {scout.is_admin && (
                                            <div className="absolute top-3 right-3 text-blue-500" title="Admin">
                                                <BadgeCheck size={18} />
                                            </div>
                                        )}
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            {scout.name.charAt(0)}
                                        </div>
                                        <h3 className="font-bold text-gray-900">{scout.name}</h3>
                                        <p className="text-xs text-gray-500 mb-4">{scout.roles?.join(', ') || 'Scout'} • {scout.region}</p>

                                        <div className="flex justify-center gap-4 w-full mb-4 border-t border-b border-gray-50 py-3">
                                            <div>
                                                <div className="text-lg font-bold text-gray-900">{scout.prospects_count || 0}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">Prospects</div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-green-600">{scout.placements_count || 0}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">Placed</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${scout.status === 'active' ? 'bg-green-100 text-green-700' : scout.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {scout.status}
                                            </span>
                                            <span className="text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                Manage <MoreHorizontal size={12} />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="p-4">Scout Identity</th>
                                            <th className="p-4">Region</th>
                                            <th className="p-4">Performance</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {scouts.map(scout => (
                                            <tr
                                                key={scout.id}
                                                onClick={() => handleScoutClick(scout)}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 border border-gray-200">
                                                            {scout.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 flex items-center gap-1">
                                                                {scout.name}
                                                                {scout.is_admin && (
                                                                    <BadgeCheck size={14} className="text-blue-500 fill-blue-50" />
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{scout.roles?.join(', ') || 'Scout'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600">{scout.region}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <span className="block font-bold text-gray-900">{scout.prospects_count || 0}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">Prospects</span>
                                                        </div>
                                                        <div>
                                                            <span className="block font-bold text-green-600">{scout.placements_count || 0}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">Placed</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${scout.status === 'active' ? 'bg-green-100 text-green-700' : scout.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {scout.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleScoutClick(scout); }}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit Profile"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => triggerRowImpersonation(e, scout)}
                                                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                            title="Login as User"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ACCESS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Access Control</h2>
                                <p className="text-gray-500 text-sm">Manage which scouts can access the platform</p>
                            </div>
                        </div>
                        <ApprovedScoutsManager />
                    </div>
                )}

                {activeTab === 'EVENTS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Global Events</h2>
                                <p className="text-gray-500 text-sm">Create events visible to all scouts in the network</p>
                            </div>
                            <button
                                onClick={() => setIsAddingGlobalEvent(!isAddingGlobalEvent)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                            >
                                <Plus size={18} /> {isAddingGlobalEvent ? 'Cancel' : 'Create Event'}
                            </button>
                        </div>

                        {/* Add Event Form */}
                        {isAddingGlobalEvent && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Globe size={20} className="text-blue-500" /> New Global Event
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title *</label>
                                        <input
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={globalEventForm.title}
                                            onChange={e => setGlobalEventForm({ ...globalEventForm, title: e.target.value })}
                                            placeholder="e.g. WARUBI Summer Showcase 2025"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location *</label>
                                        <input
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={globalEventForm.location}
                                            onChange={e => setGlobalEventForm({ ...globalEventForm, location: e.target.value })}
                                            placeholder="e.g. Dallas, TX"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date *</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={globalEventForm.date}
                                            onChange={e => setGlobalEventForm({ ...globalEventForm, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={globalEventForm.endDate}
                                            onChange={e => setGlobalEventForm({ ...globalEventForm, endDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                                        <input
                                            type="time"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={globalEventForm.time}
                                            onChange={e => setGlobalEventForm({ ...globalEventForm, time: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Type</label>
                                        <select
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={globalEventForm.type}
                                            onChange={e => setGlobalEventForm({ ...globalEventForm, type: e.target.value as any })}
                                        >
                                            <option value="ID Day">ID Day</option>
                                            <option value="Showcase">Showcase</option>
                                            <option value="Camp">Camp</option>
                                            <option value="Tournament">Tournament</option>
                                            <option value="Trial">Trial</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fee (Optional)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.fee}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, fee: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => setIsAddingGlobalEvent(false)}
                                        className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveGlobalEvent}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg flex items-center gap-2"
                                    >
                                        <Check size={16} /> Create Global Event
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Edit Event Modal */}
                        {editingEvent && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120]">
                                <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full mx-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Edit2 size={20} className="text-blue-500" /> Edit Event
                                        </h3>
                                        <button
                                            onClick={() => setEditingEvent(null)}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title *</label>
                                            <input
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.title}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location *</label>
                                            <input
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.location}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, location: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date *</label>
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.date}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.endDate}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, endDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                                            <input
                                                type="time"
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.time}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, time: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Type</label>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={globalEventForm.type}
                                                onChange={e => setGlobalEventForm({ ...globalEventForm, type: e.target.value as 'ID Day' | 'Showcase' | 'Camp' | 'Tournament' | 'Trial' })}
                                            >
                                                <option value="ID Day">ID Day</option>
                                                <option value="Showcase">Showcase</option>
                                                <option value="Camp">Camp</option>
                                                <option value="Tournament">Tournament</option>
                                                <option value="Trial">Trial</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fee (Optional)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                                <input
                                                    type="number"
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={globalEventForm.fee}
                                                    onChange={e => setGlobalEventForm({ ...globalEventForm, fee: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setEditingEvent(null)}
                                            className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateGlobalEvent}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg flex items-center gap-2"
                                        >
                                            <Save size={16} /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Events List */}
                        {globalEvents.length === 0 && !isAddingGlobalEvent ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">No Global Events</h3>
                                <p className="text-gray-500 mb-4">Create events that all scouts in your network can see and attend.</p>
                                <button
                                    onClick={() => setIsAddingGlobalEvent(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2"
                                >
                                    <Plus size={18} /> Create First Event
                                </button>
                            </div>
                        ) : globalEvents.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="p-4">Event</th>
                                            <th className="p-4">Location</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">Fee</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {globalEvents.map(event => (
                                            <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-900">{event.title}</td>
                                                <td className="p-4 text-gray-600">{event.location}</td>
                                                <td className="p-4 text-gray-600">
                                                    {event.date}{event.endDate ? ` - ${event.endDate}` : ''}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                                                        {event.type}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-600">
                                                    {event.fee ? `$${event.fee}` : 'Free'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                                                        event.status === 'Published' ? 'bg-green-100 text-green-700' :
                                                        event.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {event.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditEvent(event)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit event"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteGlobalEvent(event.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete event"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'BUGS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Bug Reports</h2>
                                <p className="text-gray-500 text-sm">Review and manage reported issues</p>
                            </div>
                            <button
                                onClick={loadBugReports}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                {bugReportsLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                                Refresh
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-2xl font-bold text-gray-900">{bugReports.length}</div>
                                <div className="text-sm text-gray-500">Total Reports</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                                <div className="text-2xl font-bold text-red-600">{bugReports.filter(r => r.status === 'open').length}</div>
                                <div className="text-sm text-gray-500">Open</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100">
                                <div className="text-2xl font-bold text-yellow-600">{bugReports.filter(r => r.status === 'in_progress').length}</div>
                                <div className="text-sm text-gray-500">In Progress</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                                <div className="text-2xl font-bold text-green-600">{bugReports.filter(r => r.status === 'resolved' || r.status === 'closed').length}</div>
                                <div className="text-sm text-gray-500">Resolved</div>
                            </div>
                        </div>

                        {bugReportsLoading ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <Loader2 size={32} className="mx-auto text-gray-400 animate-spin mb-4" />
                                <p className="text-gray-500">Loading bug reports...</p>
                            </div>
                        ) : bugReports.length === 0 ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <Bug size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">No Bug Reports</h3>
                                <p className="text-gray-500">When users report bugs, they'll appear here.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="p-4">Bug</th>
                                            <th className="p-4">Reporter</th>
                                            <th className="p-4">Priority</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Reported</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {bugReports.map(report => (
                                            <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900 mb-1">{report.title}</div>
                                                    {report.description && (
                                                        <p className="text-xs text-gray-500 line-clamp-1">{report.description}</p>
                                                    )}
                                                    {report.screenshotUrl && (
                                                        <a href={report.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                            <ExternalLink size={10} /> View Screenshot
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">{report.reporterName || 'Anonymous'}</td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                                        report.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                                        report.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                                        report.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {report.priority}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={report.status}
                                                        onChange={(e) => handleUpdateBugStatus(report.id, e.target.value as BugReportStatus)}
                                                        disabled={updatingBugId === report.id}
                                                        className={`text-xs font-bold px-2 py-1 rounded border outline-none cursor-pointer ${
                                                            report.status === 'open' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            report.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                            report.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            'bg-gray-50 text-gray-600 border-gray-200'
                                                        }`}
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 text-xs text-gray-500">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => copyClaudePrompt(report)}
                                                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                            title="Copy Claude Code Prompt"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedBugReport(report)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Bug Report Detail Modal */}
                        {selectedBugReport && (
                            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                                <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                selectedBugReport.priority === 'critical' ? 'bg-red-100' :
                                                selectedBugReport.priority === 'high' ? 'bg-orange-100' :
                                                'bg-gray-100'
                                            }`}>
                                                <Bug size={20} className={
                                                    selectedBugReport.priority === 'critical' ? 'text-red-600' :
                                                    selectedBugReport.priority === 'high' ? 'text-orange-600' :
                                                    'text-gray-600'
                                                } />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{selectedBugReport.title}</h3>
                                                <p className="text-xs text-gray-500">Reported by {selectedBugReport.reporterName || 'Anonymous'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedBugReport(null)} className="text-gray-400 hover:text-gray-700">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="p-6 overflow-y-auto space-y-6">
                                        {/* Description */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Description</h4>
                                            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                {selectedBugReport.description || 'No description provided'}
                                            </p>
                                        </div>

                                        {/* Page URL */}
                                        {selectedBugReport.pageUrl && (
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Page URL</h4>
                                                <a href={selectedBugReport.pageUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                                    {selectedBugReport.pageUrl}
                                                </a>
                                            </div>
                                        )}

                                        {/* Screenshot */}
                                        {selectedBugReport.screenshotUrl && (
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Screenshot</h4>
                                                <a href={selectedBugReport.screenshotUrl} target="_blank" rel="noreferrer">
                                                    <img
                                                        src={selectedBugReport.screenshotUrl}
                                                        alt="Bug screenshot"
                                                        className="max-w-full h-auto rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                                                    />
                                                </a>
                                            </div>
                                        )}

                                        {/* Claude Prompt */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Claude Code Prompt</h4>
                                            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
                                                {generateClaudePrompt(selectedBugReport)}
                                            </div>
                                            <button
                                                onClick={() => copyClaudePrompt(selectedBugReport)}
                                                className="mt-2 flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                                            >
                                                <Copy size={14} /> Copy to Clipboard
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                        <select
                                            value={selectedBugReport.status}
                                            onChange={(e) => handleUpdateBugStatus(selectedBugReport.id, e.target.value as BugReportStatus)}
                                            className="text-sm font-bold px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                        <button
                                            onClick={() => setSelectedBugReport(null)}
                                            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-lg"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Player Detail Slide-over */}
            {selectedTalentPlayer && !isTalentSubmissionOpen && (
                <AdminPlayerDetail
                    player={selectedTalentPlayer}
                    onClose={() => setSelectedTalentPlayer(null)}
                    onEdit={(p) => {
                        setEditingTalentPlayer(p);
                        setIsTalentSubmissionOpen(true);
                    }}
                    onPlace={(p) => {
                        placePlayer(p);
                        setSelectedTalentPlayer(null);
                    }}
                />
            )}

            {/* Player Edit Modal (reuses existing PlayerSubmission) */}
            {isTalentSubmissionOpen && (
                <PlayerSubmission
                    onClose={() => {
                        setIsTalentSubmissionOpen(false);
                        setEditingTalentPlayer(null);
                    }}
                    onAddPlayer={onUpdatePlayer}
                    onUpdatePlayer={onUpdatePlayer}
                    existingPlayers={players}
                    editingPlayer={editingTalentPlayer}
                />
            )}
        </div>
    );
};

// Memoize to prevent unnecessary re-renders when parent state changes
export default memo(AdminDashboard);