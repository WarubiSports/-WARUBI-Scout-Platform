import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, User, CalendarDays, MessageSquare, Zap, Newspaper, UserCircle, X, ArrowRight, Command, CornerDownLeft } from 'lucide-react';
import { Player, ScoutingEvent, DashboardTab } from '../types';

interface SearchResult {
  id: string;
  type: 'player' | 'event' | 'action' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  events: ScoutingEvent[];
  onNavigate: (tab: DashboardTab) => void;
  onSelectPlayer?: (player: Player) => void;
  onSelectEvent?: (event: ScoutingEvent) => void;
  onOpenAddPlayer?: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  players,
  events,
  onNavigate,
  onSelectPlayer,
  onSelectEvent,
  onOpenAddPlayer
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Build search results
  const results = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = [];
    const lowerQuery = query.toLowerCase().trim();

    // Quick actions (always shown at top when no query)
    if (!lowerQuery) {
      items.push({
        id: 'action-add-player',
        type: 'action',
        title: 'Add New Player',
        subtitle: 'Log a prospect to your pipeline',
        icon: <User size={18} className="text-scout-accent" />,
        action: () => {
          onOpenAddPlayer?.();
          onClose();
        }
      });
    }

    // Navigation options
    const navItems: { tab: DashboardTab; title: string; icon: React.ReactNode }[] = [
      { tab: DashboardTab.PLAYERS, title: 'Pipeline', icon: <User size={18} /> },
      { tab: DashboardTab.OUTREACH, title: 'Outreach', icon: <MessageSquare size={18} /> },
      { tab: DashboardTab.EVENTS, title: 'Events', icon: <CalendarDays size={18} /> },
      { tab: DashboardTab.NEWS, title: 'News', icon: <Newspaper size={18} /> },
      { tab: DashboardTab.KNOWLEDGE, title: 'Training', icon: <Zap size={18} /> },
      { tab: DashboardTab.PROFILE, title: 'Profile', icon: <UserCircle size={18} /> }
    ];

    navItems.forEach(nav => {
      if (!lowerQuery || nav.title.toLowerCase().includes(lowerQuery)) {
        items.push({
          id: `nav-${nav.tab}`,
          type: 'navigation',
          title: `Go to ${nav.title}`,
          icon: nav.icon,
          action: () => {
            onNavigate(nav.tab);
            onClose();
          }
        });
      }
    });

    // Search players
    if (lowerQuery) {
      const matchingPlayers = players.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.position?.toLowerCase().includes(lowerQuery) ||
        p.club?.toLowerCase().includes(lowerQuery)
      ).slice(0, 5);

      matchingPlayers.forEach(player => {
        items.push({
          id: `player-${player.id}`,
          type: 'player',
          title: player.name,
          subtitle: `${player.position} • ${player.status}`,
          icon: <User size={18} className="text-blue-400" />,
          action: () => {
            onSelectPlayer?.(player);
            onClose();
          }
        });
      });

      // Search events
      const matchingEvents = events.filter(e =>
        e.title.toLowerCase().includes(lowerQuery) ||
        e.location.toLowerCase().includes(lowerQuery) ||
        e.type.toLowerCase().includes(lowerQuery)
      ).slice(0, 3);

      matchingEvents.forEach(event => {
        items.push({
          id: `event-${event.id}`,
          type: 'event',
          title: event.title,
          subtitle: `${event.date} • ${event.location}`,
          icon: <CalendarDays size={18} className="text-purple-400" />,
          action: () => {
            onSelectEvent?.(event);
            onClose();
          }
        });
      });
    }

    return items;
  }, [query, players, events, onNavigate, onSelectPlayer, onSelectEvent, onOpenAddPlayer, onClose]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = resultsRef.current?.children[selectedIndex] as HTMLElement;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-scout-800 border border-scout-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-scout-700">
          <Search size={20} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search players, events, or navigate..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className="flex items-center gap-1 text-gray-600">
            <kbd className="px-1.5 py-0.5 bg-scout-900 border border-scout-700 rounded text-[10px] font-mono">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto custom-scrollbar">
          {results.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">No results found</p>
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                onClick={result.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-scout-accent/10 text-white'
                    : 'text-gray-300 hover:bg-scout-700/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  index === selectedIndex ? 'bg-scout-accent/20' : 'bg-scout-900'
                }`}>
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{result.subtitle}</p>
                  )}
                </div>
                {index === selectedIndex && (
                  <div className="flex items-center gap-1 text-scout-accent">
                    <CornerDownLeft size={14} />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between px-4 py-2 bg-scout-900/50 border-t border-scout-700 text-[10px] text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-scout-800 border border-scout-700 rounded font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-scout-800 border border-scout-700 rounded font-mono">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={10} />K to open
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
