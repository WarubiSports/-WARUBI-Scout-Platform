import React, { useState, useMemo, useEffect } from 'react';
import { Globe, TrendingUp, ArrowRight, ExternalLink, Newspaper, Flame, Trophy, Search, Filter, Clock, ChevronDown, Calendar, Hash, Zap } from 'lucide-react';
import { NewsItem, UserProfile } from '../types';

interface NewsTabProps {
    newsItems: NewsItem[];
    tickerItems: string[];
    user?: UserProfile;
    scoutScore?: number;
}

const CATEGORIES = ['All', 'Transfer News', 'Platform Update', 'Event Recap', 'Network Milestone', 'Market Intel'];

const NewsTab: React.FC<NewsTabProps> = ({ newsItems: initialNews, tickerItems, user, scoutScore = 0 }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(10);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  // --- REAL-TIME LEADERBOARD SIMULATION ---
  const [liveLeaderboard, setLiveLeaderboard] = useState([
      { id: 'rival-1', name: 'Sarah Jenkins', region: 'California', score: 420 },
      { id: 'rival-2', name: 'David Mueller', region: 'Germany', score: 380 },
      { id: 'rival-3', name: 'James O.', region: 'Nigeria', score: 310 },
      { id: 'rival-4', name: 'Maria Garcia', region: 'Spain', score: 250 },
  ]);

  // Merge Current User into Leaderboard & Sort
  const sortedLeaderboard = useMemo(() => {
      const currentUserEntry = { 
          id: 'current-user', 
          name: user?.name || 'You', 
          region: user?.region || 'Unknown', 
          score: scoutScore,
          isMe: true 
      };
      
      const allScouts = [...liveLeaderboard, currentUserEntry];
      return allScouts.sort((a, b) => b.score - a.score);
  }, [liveLeaderboard, scoutScore, user]);

  // Simulate Rival Activity
  useEffect(() => {
      const interval = setInterval(() => {
          setLiveLeaderboard(prev => {
              // Randomly pick a rival to increment score
              const randomIndex = Math.floor(Math.random() * prev.length);
              const newScouts = [...prev];
              // Small chance to increment score by 10
              if (Math.random() > 0.5) {
                  newScouts[randomIndex] = {
                      ...newScouts[randomIndex],
                      score: newScouts[randomIndex].score + 10
                  };
              }
              return newScouts;
          });
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
  }, []);

  // Mock "Archived" Data for the "Load History" feature
  const archivedNews: NewsItem[] = useMemo(() => [
      {
          id: 'arc-1',
          type: 'Market Intel',
          title: 'NCAA Rule Change: Roster Limits for 2025',
          summary: 'The NCAA has officially voted to remove scholarship limits for D1 men\'s soccer, replacing them with roster limits. What this means for international recruiting.',
          source: 'NCAA Governance',
          date: '2 months ago',
          categoryColor: 'text-purple-400',
          borderColor: 'border-purple-500/30'
      },
      {
          id: 'arc-2',
          type: 'Transfer News',
          title: 'Regional Liga: 5 Players from Winter Showcase Signed',
          summary: 'A record conversion rate from the Berlin event. Clubs include Viktoria Köln and SV Lippstadt.',
          source: 'Warubi Germany',
          date: '3 months ago',
          categoryColor: 'text-green-400',
          borderColor: 'border-green-500/30'
      }
  ], []);

  // Combine current and history based on state
  const allAvailableNews = historyLoaded ? [...initialNews, ...archivedNews] : initialNews;

  // Filter Logic
  const filteredNews = allAvailableNews.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'All' || item.type === activeCategory;

      return matchesSearch && matchesCategory;
  });

  const heroItem = filteredNews.length > 0 ? filteredNews[0] : null;
  const feedItems = filteredNews.length > 0 ? filteredNews.slice(1) : [];

  const handleReadMore = (url?: string) => {
      if (url) {
          window.open(url, '_blank');
      }
  };

  const loadHistory = () => {
      // Simulate network request
      const btn = document.getElementById('load-history-btn');
      if(btn) btn.innerText = "Loading Archives...";
      
      setTimeout(() => {
          setHistoryLoaded(true);
      }, 800);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fade-in gap-4">
        
        {/* Ticker Bar */}
        <div className="bg-scout-800 rounded-lg border border-scout-700 overflow-hidden flex items-center shadow-sm shrink-0 h-10">
            <div className="bg-red-600 text-white px-3 h-full font-bold text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-2">
                <Flame size={12} className="animate-pulse" /> Network Live
            </div>
            <div className="flex-1 overflow-hidden relative h-full">
                 <div className="absolute whitespace-nowrap animate-marquee flex items-center h-full text-xs font-medium text-gray-300">
                    {tickerItems.map((item, i) => (
                        <span key={i} className="mx-8 flex items-center gap-2">
                             • {item}
                        </span>
                    ))}
                     {/* Duplicate for seamless loop */}
                     {tickerItems.map((item, i) => (
                        <span key={`dup-${i}`} className="mx-8 flex items-center gap-2">
                             • {item}
                        </span>
                    ))}
                 </div>
            </div>
        </div>

        <div className="flex gap-6 h-full overflow-hidden">
            {/* Main Feed */}
            <div className="flex-1 flex flex-col min-h-0">
                
                {/* Zone B: Control Bar (Sticky) */}
                <div className="bg-scout-800 border border-scout-700 p-3 rounded-xl mb-4 shrink-0 shadow-md z-20">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search Intel (e.g. 'Visa', 'NCAA')..." 
                                className="w-full bg-scout-900 border border-scout-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-scout-accent placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                        activeCategory === cat 
                                        ? 'bg-scout-accent text-scout-900 border-scout-accent shadow-sm' 
                                        : 'bg-scout-900 text-gray-400 border-scout-700 hover:text-white hover:border-scout-500'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Zone C: The Feed */}
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6 flex-1 pb-10">
                    
                    {filteredNews.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Newspaper size={48} className="mx-auto mb-4 text-gray-600"/>
                            <p className="text-gray-400">No updates found matching your filter.</p>
                            <button onClick={() => {setSearchQuery(''); setActiveCategory('All');}} className="text-scout-accent hover:underline mt-2 text-sm">Clear Filters</button>
                        </div>
                    ) : (
                        <>
                            {/* HERO CARD (Zone A) */}
                            {heroItem && (
                                <div className="bg-gradient-to-br from-scout-800 to-scout-900 rounded-2xl border border-scout-600 p-8 shadow-2xl relative overflow-hidden group shrink-0">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-scout-accent/5 rounded-full blur-3xl group-hover:bg-scout-accent/10 transition-colors pointer-events-none"></div>
                                    
                                    <div className="relative z-10 flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className={`inline-block px-3 py-1 rounded-full bg-scout-900 border text-xs font-bold uppercase tracking-wider ${heroItem.categoryColor} ${heroItem.borderColor}`}>
                                                    {heroItem.type}
                                                </span>
                                                <span className="text-gray-500 text-xs flex items-center gap-1"><Clock size={12}/> {heroItem.date}</span>
                                            </div>
                                            
                                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight group-hover:text-scout-highlight transition-colors cursor-pointer" onClick={() => handleReadMore(heroItem.linkUrl)}>
                                                {heroItem.title}
                                            </h2>
                                            
                                            <p className="text-gray-300 text-sm mb-6 leading-relaxed border-l-4 border-scout-700 pl-4">
                                                {heroItem.summary}
                                            </p>
                                            
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => handleReadMore(heroItem.linkUrl)}
                                                    className="bg-white hover:bg-gray-100 text-scout-900 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
                                                >
                                                    Read Full Story <ArrowRight size={16} />
                                                </button>
                                                <span className="text-xs text-gray-500 font-medium">Source: {heroItem.source}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feed Timeline */}
                            {feedItems.length > 0 && (
                                <div className="relative pl-4 space-y-6 pt-4">
                                    <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-scout-800 -z-10"></div>
                                    
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 mb-2">Recent Updates</div>

                                    {feedItems.map((item) => (
                                        <div key={item.id} className="relative flex gap-4 group">
                                            <div className="w-2.5 h-2.5 rounded-full bg-scout-700 border-2 border-scout-900 mt-5 shrink-0 group-hover:bg-scout-accent transition-colors shadow-[0_0_0_4px_rgba(30,41,59,1)]"></div>
                                            
                                            <div className="flex-1 bg-scout-800 p-5 rounded-xl border border-scout-700 hover:border-scout-500 transition-all hover:shadow-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-scout-900/50 ${item.categoryColor || 'text-gray-400'}`}>
                                                            {item.type}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">{item.date}</span>
                                                    </div>
                                                    {item.linkUrl && <ExternalLink size={14} className="text-gray-600 hover:text-white cursor-pointer" onClick={() => handleReadMore(item.linkUrl)}/>}
                                                </div>
                                                <h4 
                                                    className="text-base font-bold text-white mb-2 cursor-pointer hover:text-scout-accent transition-colors"
                                                    onClick={() => handleReadMore(item.linkUrl)}
                                                >
                                                    {item.title}
                                                </h4>
                                                <p className="text-sm text-gray-400 line-clamp-2">
                                                    {item.summary}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* History Loader */}
                            {!historyLoaded && (
                                <div className="py-8 text-center border-t border-scout-700/50 mt-8">
                                    <p className="text-gray-500 text-sm mb-4">Looking for older reports?</p>
                                    <button 
                                        id="load-history-btn"
                                        onClick={loadHistory}
                                        className="bg-scout-800 hover:bg-scout-700 text-gray-300 hover:text-white px-6 py-2 rounded-full border border-scout-600 text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto"
                                    >
                                        <Clock size={14} /> Load Previous Months
                                    </button>
                                </div>
                            )}

                            {historyLoaded && (
                                <div className="text-center py-8 text-xs text-gray-600 uppercase font-bold tracking-widest">
                                    End of Intelligence Feed
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Global Stats (Sticky) */}
            <div className="w-80 shrink-0 space-y-6 hidden lg:block overflow-y-auto custom-scrollbar h-full pb-10">
                
                {/* Global Reach Card */}
                <div className="bg-scout-800 rounded-xl border border-scout-700 p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Globe size={16} /> Global Impact
                    </h3>
                    
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-2xl font-black text-white">1,240</span>
                                <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                                    <TrendingUp size={12} /> +12%
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">Total Placements (YTD)</p>
                            <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2">
                                <div className="bg-scout-accent h-1.5 rounded-full w-[70%]"></div>
                            </div>
                        </div>

                         <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-2xl font-black text-white">$52M</span>
                                <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                                    <TrendingUp size={12} /> +5%
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">Scholarship Value Created</p>
                             <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2">
                                <div className="bg-blue-500 h-1.5 rounded-full w-[85%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Scouts Leaderboard - DYNAMIC */}
                <div className="bg-scout-800 rounded-xl border border-scout-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Trophy size={16} className="text-scout-highlight" /> Top Scouts
                        </h3>
                        <div className="text-[10px] text-green-400 font-mono animate-pulse flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> LIVE
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        {sortedLeaderboard.map((scout, index) => {
                            const rank = index + 1;
                            return (
                                <div key={scout.id} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${scout.isMe ? 'bg-scout-900 border border-scout-accent/30 shadow-sm' : 'hover:bg-scout-900/50'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                                        rank === 2 ? 'bg-gray-400 text-gray-900' :
                                        rank === 3 ? 'bg-orange-700 text-orange-200' :
                                        'bg-scout-700 text-gray-400'
                                    }`}>
                                        {rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${scout.isMe ? 'text-scout-accent' : 'text-white'}`}>
                                            {scout.name} {scout.isMe && '(You)'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate">{scout.region}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-white">{scout.score}</div>
                                        <div className="text-[9px] text-gray-500 uppercase">XP</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-scout-700">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-2">
                            <span>Points breakdown:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                            <div className="flex justify-between"><span>Log Player</span> <span className="text-white">10</span></div>
                            <div className="flex justify-between"><span>Placement</span> <span className="text-scout-highlight">500</span></div>
                            <div className="flex justify-between"><span>Host Event</span> <span className="text-white">50</span></div>
                            <div className="flex justify-between"><span>Attend</span> <span className="text-white">15</span></div>
                        </div>
                    </div>
                </div>

                {/* Quick Link */}
                <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 rounded-xl border border-blue-500/30 p-5">
                    <h4 className="font-bold text-white text-sm mb-2">Join the WhatsApp Community</h4>
                    <p className="text-xs text-blue-200 mb-3">Connect with 500+ scouts instantly.</p>
                    <button className="w-full bg-white text-blue-900 font-bold text-xs py-2 rounded hover:bg-blue-50 transition-colors">
                        Join Group
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};

export default NewsTab;