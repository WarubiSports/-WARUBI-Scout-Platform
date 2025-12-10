
import React, { useState } from 'react';
import { UserProfile, Player, DashboardTab, ScoutingEvent, PlayerStatus, OutreachLog } from '../types';
import { ITP_REFERENCE_PLAYERS } from '../constants';
import PlayerCard from './PlayerCard';
import EventBuilder from './EventBuilder';
import KnowledgeTab from './KnowledgeTab';
import ProfileTab from './ProfileTab';
import OutreachTab from './OutreachTab';
import PlayerSubmission from './PlayerSubmission';
import TutorialOverlay from './TutorialOverlay';
import { LayoutDashboard, Users, CalendarDays, GraduationCap, CheckCircle, UserCircle, MessageSquare, LayoutGrid, List, ChevronDown, MessageCircle as MsgIcon, Search, Filter, ChevronLeft, ChevronRight, HelpCircle, PlusCircle } from 'lucide-react';

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
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [outreachTargetId, setOutreachTargetId] = useState<string | null>(null);
  
  // View & Filter State
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All'); // Primarily for List View
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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

  const jumpToOutreach = (player: Player) => {
      setOutreachTargetId(player.id);
      setActiveTab(DashboardTab.OUTREACH);
  };

  // --- Filtering Logic ---
  const filteredPlayers = players.filter(p => {
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

  const PipelineColumn = ({ title, status, count, children }: { title: string, status: string, count: number, children?: React.ReactNode }) => (
    <div className="flex-1 min-w-[300px] flex flex-col h-full bg-scout-800/30 rounded-xl border border-scout-700/50">
        <div className="p-4 border-b border-scout-700/50 flex justify-between items-center sticky top-0 bg-scout-900/90 backdrop-blur rounded-t-xl z-10">
            <h3 className="font-bold text-white">{title}</h3>
            <span className="text-xs bg-scout-800 text-gray-300 px-2 py-0.5 rounded-full border border-scout-700">{count}</span>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            {children}
        </div>
    </div>
  );

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

  return (
    <div className="flex h-screen bg-scout-900 text-white overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-scout-800 border-r border-scout-700 flex flex-col hidden md:flex">
            <div className="p-6 border-b border-scout-700">
                <h1 className="text-xl font-black tracking-tighter text-white">WARUBI<span className="text-scout-accent">SCOUT</span></h1>
                <p className="text-xs text-gray-400 mt-1">AI-Powered Platform</p>
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
                <button 
                    onClick={() => setShowTutorial(true)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors text-gray-400 hover:text-scout-accent hover:bg-scout-700/50`}
                >
                    <HelpCircle size={20} /> App Tutorial
                </button>
            </nav>

            <div className="p-4 bg-scout-900/50 m-4 rounded border border-scout-700">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Weekly Focus</h3>
                <ul className="space-y-2">
                    {user.weeklyTasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <CheckCircle size={14} className="mt-0.5 text-scout-accent shrink-0" />
                            <span className="leading-tight">{task}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="p-4 border-t border-scout-700">
                <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-scout-700/50 p-2 rounded transition-colors"
                    onClick={() => setActiveTab(DashboardTab.PROFILE)}
                >
                    <div className="w-8 h-8 rounded-full bg-scout-accent flex items-center justify-center font-bold text-scout-900">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
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
                            <PipelineColumn title="Leads" status={PlayerStatus.LEAD} count={filteredPlayers.filter(p => p.status === PlayerStatus.LEAD || p.status === 'New Lead').length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.LEAD || p.status === 'New Lead').map(p => (
                                    <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} />
                                ))}
                                {filteredPlayers.filter(p => p.status === PlayerStatus.LEAD || p.status === 'New Lead').length === 0 && (
                                    <div className="text-center py-10 text-gray-500 border-2 border-dashed border-scout-700 rounded-lg text-sm">
                                        No players found
                                    </div>
                                )}
                            </PipelineColumn>

                            <PipelineColumn title="Interested" status={PlayerStatus.INTERESTED} count={filteredPlayers.filter(p => p.status === PlayerStatus.INTERESTED).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.INTERESTED).map(p => (
                                    <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} />
                                ))}
                            </PipelineColumn>

                            <PipelineColumn title="Final Review" status={PlayerStatus.FINAL_REVIEW} count={filteredPlayers.filter(p => p.status === PlayerStatus.FINAL_REVIEW).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.FINAL_REVIEW).map(p => (
                                    <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} />
                                ))}
                            </PipelineColumn>

                            <PipelineColumn title="Offered" status={PlayerStatus.OFFERED} count={filteredPlayers.filter(p => p.status === PlayerStatus.OFFERED).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.OFFERED).map(p => (
                                    <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} />
                                ))}
                            </PipelineColumn>

                            <PipelineColumn title="Placed" status={PlayerStatus.PLACED} count={filteredPlayers.filter(p => p.status === PlayerStatus.PLACED).length}>
                                {filteredPlayers.filter(p => p.status === PlayerStatus.PLACED).map(p => (
                                    <PlayerCard key={p.id} player={p} onStatusChange={handleStatusChange} onOutreach={jumpToOutreach} />
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
                <div className="animate-fade-in">
                    <EventBuilder events={events} onAddEvent={(e) => setEvents([...events, e])} />
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
                    />
                </div>
            )}

            {activeTab === DashboardTab.KNOWLEDGE && (
                <div className="animate-fade-in">
                    <KnowledgeTab />
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
        </main>
    </div>
  );
};

export default Dashboard;
