import React, { useState } from 'react';
import { Player, ScoutingEvent, PlayerStatus, UserProfile, NewsItem, AppNotification } from '../types';
import { 
    LayoutDashboard, Users, Calendar, CheckCircle, XCircle, 
    ShieldCheck, Activity, Search, Filter, Briefcase, Award, 
    LogOut, Globe, TrendingUp, AlertCircle, FileText, Check, 
    MoreHorizontal, Edit2, BadgeCheck, X, Save, Eye, Plus,
    List, LayoutGrid, Newspaper, Flame, Trash2, Link, Bell
} from 'lucide-react';

interface AdminDashboardProps {
    players: Player[];
    events: ScoutingEvent[];
    onUpdateEvent: (event: ScoutingEvent) => void;
    onUpdatePlayer: (player: Player) => void;
    onLogout: () => void;
    onImpersonate?: (scout: UserProfile) => void;
    // News Props
    newsItems?: NewsItem[];
    tickerItems?: string[];
    notifications?: AppNotification[];
    onAddNews?: (item: NewsItem) => void;
    onDeleteNews?: (id: string) => void;
    onUpdateTicker?: (items: string[]) => void;
    onAddNotification?: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    onMarkAllRead?: () => void;
}

// EXTENDED MOCK DATA FOR SCOUTS
const INITIAL_MOCK_SCOUTS: (UserProfile & { id: string, leads: number, conversion: string, status: string })[] = [
    { 
        id: 'scout-1', 
        name: 'Alex Scout', 
        role: 'Head Coach', 
        region: 'California', 
        leads: 42, 
        conversion: '12%', 
        status: 'Active',
        weeklyTasks: [], 
        certifications: ['USSF B License', 'Talent ID Level 1'] 
    },
    { 
        id: 'scout-2', 
        name: 'Sarah Jenkins', 
        role: 'Independent', 
        region: 'New York', 
        leads: 28, 
        conversion: '15%', 
        status: 'Active',
        weeklyTasks: [],
        certifications: ['Former D1 Player']
    },
    { 
        id: 'scout-3', 
        name: 'David Mueller', 
        role: 'Agent', 
        region: 'Berlin', 
        leads: 15, 
        conversion: '22%', 
        status: 'Active',
        weeklyTasks: [],
        certifications: ['DFB Elite Youth', 'Registered Intermediary']
    },
    { 
        id: 'scout-4', 
        name: 'James O.', 
        role: 'Academy Director', 
        region: 'Lagos', 
        leads: 60, 
        conversion: '8%', 
        status: 'Review',
        weeklyTasks: [],
        certifications: []
    },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    players, 
    events, 
    onUpdateEvent, 
    onUpdatePlayer,
    onLogout,
    onImpersonate,
    newsItems = [],
    tickerItems = [],
    notifications = [],
    onAddNews,
    onDeleteNews,
    onUpdateTicker,
    onAddNotification,
    onMarkAllRead
}) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPROVALS' | 'TALENT' | 'SCOUTS' | 'NEWS'>('OVERVIEW');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Scout Management State
    const [scouts, setScouts] = useState(INITIAL_MOCK_SCOUTS);
    const [selectedScout, setSelectedScout] = useState<(typeof scouts)[0] | null>(null);
    const [isEditingScout, setIsEditingScout] = useState(false);
    const [scoutFormData, setScoutFormData] = useState<(typeof scouts)[0] | null>(null);
    const [newBadge, setNewBadge] = useState('');
    const [scoutViewMode, setScoutViewMode] = useState<'grid' | 'list'>('grid');

    // News Management State
    const [isAddingNews, setIsAddingNews] = useState(false);
    const [newsForm, setNewsForm] = useState<Partial<NewsItem>>({
        title: '',
        type: 'General',
        summary: '',
        source: 'Warubi HQ',
        linkUrl: ''
    });
    const [tickerInput, setTickerInput] = useState(tickerItems.join('\n'));

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);

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

    const handleScoutClick = (scout: typeof scouts[0]) => {
        setSelectedScout(scout);
        setScoutFormData(scout);
        setIsEditingScout(false);
    };

    const handleScoutUpdate = () => {
        if (!scoutFormData) return;
        setScouts(prev => prev.map(s => s.id === scoutFormData.id ? scoutFormData : s));
        setSelectedScout(scoutFormData);
        setIsEditingScout(false);
    };

    const toggleVerification = () => {
        if (!scoutFormData) return;
        // Simple toggle logic for demo - assuming we might add a 'verified' boolean later, 
        // for now we stick to the 'Active' status or certifications logic.
        // Let's add a "Verified Scout" badge if not present, remove if present
        const hasBadge = scoutFormData.certifications?.includes('Verified Scout');
        let newCerts = scoutFormData.certifications || [];
        
        if (hasBadge) {
            newCerts = newCerts.filter(c => c !== 'Verified Scout');
        } else {
            newCerts = [...newCerts, 'Verified Scout'];
        }
        setScoutFormData({ ...scoutFormData, certifications: newCerts });
    };

    const addBadge = () => {
        if (!newBadge || !scoutFormData) return;
        setScoutFormData({
            ...scoutFormData,
            certifications: [...(scoutFormData.certifications || []), newBadge]
        });
        setNewBadge('');
    };

    const removeBadge = (badge: string) => {
        if (!scoutFormData) return;
        setScoutFormData({
            ...scoutFormData,
            certifications: scoutFormData.certifications?.filter(c => c !== badge)
        });
    };

    const triggerImpersonation = () => {
        if (onImpersonate && selectedScout) {
            // Map the extended mock scout back to UserProfile
            onImpersonate(selectedScout);
        }
    };

    const triggerRowImpersonation = (e: React.MouseEvent, scout: UserProfile) => {
        e.stopPropagation();
        if (onImpersonate) onImpersonate(scout);
    }

    // --- NEWS MANAGEMENT HANDLERS ---
    
    const handleSaveNews = () => {
        if (!newsForm.title || !newsForm.summary) return;
        if (onAddNews) {
            onAddNews({
                id: Date.now().toString(),
                title: newsForm.title || 'Untitled',
                summary: newsForm.summary || '',
                type: newsForm.type || 'Update',
                source: newsForm.source || 'Warubi HQ',
                date: 'Just now',
                linkUrl: newsForm.linkUrl,
                categoryColor: 'text-scout-accent', // Default color
                borderColor: 'border-scout-accent/30'
            });
        }
        setNewsForm({ title: '', type: 'General', summary: '', source: 'Warubi HQ', linkUrl: '' });
        setIsAddingNews(false);
    };

    const handleSaveTicker = () => {
        if (onUpdateTicker) {
            const items = tickerInput.split('\n').filter(line => line.trim() !== '');
            onUpdateTicker(items);
            alert("Ticker updated!");
        }
    };

    // --- SUB-VIEWS ---

    const OverviewTab = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{scouts.length + 120}</div>
                    <div className="text-sm text-gray-500">Active Scouts</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                            <Activity size={24} />
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+5%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{players.length + 850}</div>
                    <div className="text-sm text-gray-500">Players in Pipeline</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                            <AlertCircle size={24} />
                        </div>
                        {pendingEvents.length > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded animate-pulse">{pendingEvents.length} New</span>}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{pendingEvents.length}</div>
                    <div className="text-sm text-gray-500">Pending Approvals</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 rounded-lg text-green-600">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">${(totalValue / 1000).toFixed(0)}k</div>
                    <div className="text-sm text-gray-500">Placement Value (YTD)</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Live Network Feed</h3>
                    <div className="space-y-4">
                        {[
                            { text: "Sarah Jenkins submitted a Tier 1 Prospect", time: "2m ago", icon: Users, color: "text-blue-500 bg-blue-50" },
                            { text: "New Event Request: 'Berlin Summer ID'", time: "15m ago", icon: Calendar, color: "text-orange-500 bg-orange-50" },
                            { text: "James O. reached 60 leads milestone", time: "1h ago", icon: Award, color: "text-yellow-500 bg-yellow-50" },
                            { text: "System Audit complete", time: "3h ago", icon: ShieldCheck, color: "text-green-500 bg-green-50" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                <div className={`p-2 rounded-full ${item.color}`}>
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-800 font-medium">{item.text}</p>
                                    <p className="text-xs text-gray-400">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">HQ Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                            <Globe size={24} className="text-gray-400 group-hover:text-blue-500 mb-2"/>
                            <div className="text-sm font-bold text-gray-700 group-hover:text-blue-600">Create Global Event</div>
                        </button>
                        <button className="p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group">
                            <FileText size={24} className="text-gray-400 group-hover:text-green-500 mb-2"/>
                            <div className="text-sm font-bold text-gray-700 group-hover:text-green-600">Export Annual Report</div>
                        </button>
                        <button className="p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group">
                            <Users size={24} className="text-gray-400 group-hover:text-purple-500 mb-2"/>
                            <div className="text-sm font-bold text-gray-700 group-hover:text-purple-600">Invite New Scouts</div>
                        </button>
                        <button className="p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all text-left group">
                            <AlertCircle size={24} className="text-gray-400 group-hover:text-red-500 mb-2"/>
                            <div className="text-sm font-bold text-gray-700 group-hover:text-red-600">System Alerts</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const ApprovalsTab = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">Event Requests</h2>
            
            {pendingEvents.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                    <p className="text-gray-500">No pending event approvals in the queue.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingEvents.map(evt => (
                        <div key={evt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded uppercase">Pending Review</span>
                                    <span className="text-sm text-gray-500">Submitted by Alex Scout</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{evt.title}</h3>
                                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {evt.date}</span>
                                    <span>•</span>
                                    <span>{evt.location}</span>
                                    <span>•</span>
                                    <span>{evt.type}</span>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">AI Marketing Plan Preview</h4>
                                    <p className="text-sm text-gray-600 italic">"{evt.marketingCopy?.substring(0, 150)}..."</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 justify-center border-l border-gray-100 pl-6 w-48">
                                <button 
                                    onClick={() => approveEvent(evt)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Approve
                                </button>
                                <button 
                                    onClick={() => rejectEvent(evt)}
                                    className="w-full bg-white hover:bg-red-50 text-red-600 border border-gray-200 font-bold py-2 rounded-lg transition-colors"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const TalentTab = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Global Talent Pool</h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            placeholder="Search all players..." 
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                        <tr>
                            <th className="p-4">Player</th>
                            <th className="p-4">Position</th>
                            <th className="p-4">Scout</th>
                            <th className="p-4">Tier</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-gray-900">{p.name}</td>
                                <td className="p-4 text-gray-600">{p.position}</td>
                                <td className="p-4 text-gray-600 text-sm">Alex Scout</td>
                                <td className="p-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                        p.evaluation?.scholarshipTier === 'Tier 1' ? 'bg-purple-100 text-purple-700' :
                                        p.evaluation?.scholarshipTier === 'Tier 2' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {p.evaluation?.scholarshipTier || 'N/A'}
                                    </span>
                                </td>
                                <td className="p-4 text-sm font-medium text-gray-700">
                                    {p.status === PlayerStatus.PLACED ? (
                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Placed</span>
                                    ) : p.status}
                                </td>
                                <td className="p-4 text-right">
                                    {p.status !== PlayerStatus.PLACED && (
                                        <button 
                                            onClick={() => placePlayer(p)}
                                            className="text-xs bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                                        >
                                            Mark Placed
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const NewsRoomTab = () => (
        <div className="space-y-6 animate-fade-in flex gap-6 h-[calc(100vh-140px)]">
            {/* Left: News Feed Manager */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">News Feed Manager</h2>
                    <button 
                        onClick={() => setIsAddingNews(!isAddingNews)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                        <Plus size={18} /> {isAddingNews ? 'Cancel' : 'Add New Post'}
                    </button>
                </div>

                {isAddingNews && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                <input 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newsForm.title}
                                    onChange={e => setNewsForm({...newsForm, title: e.target.value})}
                                    placeholder="e.g. New Partnership Announced"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <select 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newsForm.type}
                                    onChange={e => setNewsForm({...newsForm, type: e.target.value})}
                                >
                                    <option>General</option>
                                    <option>Transfer News</option>
                                    <option>Platform Update</option>
                                    <option>Event Recap</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Summary</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                value={newsForm.summary}
                                onChange={e => setNewsForm({...newsForm, summary: e.target.value})}
                                placeholder="Brief description of the news item..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source</label>
                                <input 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newsForm.source}
                                    onChange={e => setNewsForm({...newsForm, source: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Blog URL (Optional)</label>
                                <div className="relative">
                                    <Link size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input 
                                        className="w-full border border-gray-300 rounded p-2 pl-9 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newsForm.linkUrl}
                                        onChange={e => setNewsForm({...newsForm, linkUrl: e.target.value})}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={handleSaveNews}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold text-sm"
                            >
                                Publish Post
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                    {newsItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No news items posted.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {newsItems.map(item => (
                                <div key={item.id} className="p-4 hover:bg-gray-50 flex justify-between items-start group">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{item.type}</span>
                                            <span className="text-xs text-gray-400">{item.date}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                                        <p className="text-sm text-gray-500 line-clamp-1">{item.summary}</p>
                                        {item.linkUrl && <a href={item.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"><Link size={10}/> {item.linkUrl}</a>}
                                    </div>
                                    <button 
                                        onClick={() => onDeleteNews && onDeleteNews(item.id)}
                                        className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Post"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Ticker Manager */}
            <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Flame size={20} className="text-red-500" /> Live Ticker Signals
                </h3>
                <p className="text-xs text-gray-500 mb-4">Edit the scrolling text shown on the News tab. Enter one item per line.</p>
                
                <textarea 
                    className="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4 font-mono text-gray-700 bg-gray-50"
                    value={tickerInput}
                    onChange={e => setTickerInput(e.target.value)}
                    placeholder="Enter ticker items..."
                />
                
                <button 
                    onClick={handleSaveTicker}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 rounded-lg transition-colors"
                >
                    Update Signals
                </button>
            </div>
        </div>
    );

    const ScoutManagementModal = () => {
        if (!selectedScout || !scoutFormData) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
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
                                    {scoutFormData.certifications?.includes('Verified Scout') && (
                                        <BadgeCheck size={18} className="text-blue-500 fill-blue-50" />
                                    )}
                                </h3>
                                <p className="text-sm text-gray-500">ID: {selectedScout.id}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedScout(null)} className="text-gray-400 hover:text-gray-700">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto">
                        
                        {/* 1. Account Actions & Status */}
                        <div className="flex gap-4 mb-8">
                            <div className="flex-1 bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-blue-700 uppercase">Verification</p>
                                    <p className="text-sm text-blue-900">{scoutFormData.certifications?.includes('Verified Scout') ? 'Verified Account' : 'Unverified'}</p>
                                </div>
                                <button 
                                    onClick={toggleVerification}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${scoutFormData.certifications?.includes('Verified Scout') ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}
                                >
                                    {scoutFormData.certifications?.includes('Verified Scout') ? 'Revoke' : 'Verify'}
                                </button>
                            </div>
                            <div className="flex-1 bg-purple-50 rounded-lg p-4 border border-purple-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-purple-700 uppercase">Access</p>
                                    <p className="text-sm text-purple-900">"God Mode"</p>
                                </div>
                                <button 
                                    onClick={triggerImpersonation}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center gap-1"
                                >
                                    <Eye size={12} /> Login as User
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* 2. Profile Editor */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Edit2 size={16} className="text-gray-400" /> Edit Profile
                                </h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                                    <input 
                                        className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={scoutFormData.name}
                                        onChange={e => setScoutFormData({...scoutFormData!, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Role / Title</label>
                                    <input 
                                        className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={scoutFormData.role}
                                        onChange={e => setScoutFormData({...scoutFormData!, role: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Region</label>
                                    <input 
                                        className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={scoutFormData.region}
                                        onChange={e => setScoutFormData({...scoutFormData!, region: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Account Status</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={scoutFormData.status}
                                        onChange={e => setScoutFormData({...scoutFormData!, status: e.target.value})}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Review">Under Review</option>
                                        <option value="Suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            {/* 3. Badges & Certs */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Award size={16} className="text-gray-400" /> Credentials & Badges
                                </h4>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. UEFA A License"
                                        value={newBadge}
                                        onChange={e => setNewBadge(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addBadge()}
                                    />
                                    <button 
                                        onClick={addBadge}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 rounded"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {scoutFormData.certifications?.map((badge, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                            {badge}
                                            <button onClick={() => removeBadge(badge)} className="hover:text-red-500"><X size={12}/></button>
                                        </span>
                                    ))}
                                    {(!scoutFormData.certifications || scoutFormData.certifications.length === 0) && (
                                        <span className="text-sm text-gray-400 italic">No badges added yet.</span>
                                    )}
                                </div>
                            </div>
                        </div>
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
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded shadow-lg flex items-center gap-2"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900 relative">
            {/* Modal Injection */}
            {selectedScout && <ScoutManagementModal />}

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
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
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
                        onClick={() => setActiveTab('NEWS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'NEWS' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Newspaper size={20} /> Newsroom
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 w-full px-4 py-2 transition-colors">
                        <LogOut size={18} /> Logout to App
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8">
                {activeTab === 'OVERVIEW' && <OverviewTab />}
                {activeTab === 'APPROVALS' && <ApprovalsTab />}
                {activeTab === 'TALENT' && <TalentTab />}
                
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

                        {scoutViewMode === 'grid' ? (
                            <div className="grid grid-cols-3 gap-6">
                                {scouts.map(scout => (
                                    <div 
                                        key={scout.id} 
                                        onClick={() => handleScoutClick(scout)}
                                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative"
                                    >
                                        {scout.certifications?.includes('Verified Scout') && (
                                            <div className="absolute top-3 right-3 text-blue-500" title="Verified">
                                                <BadgeCheck size={18} />
                                            </div>
                                        )}
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            {scout.name.charAt(0)}
                                        </div>
                                        <h3 className="font-bold text-gray-900">{scout.name}</h3>
                                        <p className="text-xs text-gray-500 mb-4">{scout.role} • {scout.region}</p>
                                        
                                        <div className="flex justify-center gap-4 w-full mb-4 border-t border-b border-gray-50 py-3">
                                            <div>
                                                <div className="text-lg font-bold text-gray-900">{scout.leads}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">Leads</div>
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-green-600">{scout.conversion}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">Conv.</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-center items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${scout.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
                                            <th className="p-4">Credentials</th>
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
                                                                {scout.certifications?.includes('Verified Scout') && (
                                                                    <BadgeCheck size={14} className="text-blue-500 fill-blue-50" />
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{scout.role}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600">{scout.region}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <span className="block font-bold text-gray-900">{scout.leads}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">Leads</span>
                                                        </div>
                                                        <div>
                                                            <span className="block font-bold text-green-600">{scout.conversion}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">Conv.</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {scout.certifications && scout.certifications.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {scout.certifications.slice(0, 2).map((cert, idx) => (
                                                                <span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-[120px]">
                                                                    {cert}
                                                                </span>
                                                            ))}
                                                            {scout.certifications.length > 2 && (
                                                                <span className="text-[10px] text-gray-400 px-1.5 py-0.5">+{scout.certifications.length - 2} more</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Unverified</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${scout.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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

                {activeTab === 'NEWS' && <NewsRoomTab />}
            </main>
        </div>
    );
};

export default AdminDashboard;