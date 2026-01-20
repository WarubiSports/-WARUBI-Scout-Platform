import React, { useState } from 'react';
import { BadgeDefinition } from '../constants';
import { BadgeProgress } from '../hooks/useBadges';
import {
  Target, Users, Crown, Trophy, Handshake, Star,
  Calendar, Megaphone, Network, TrendingUp, Award,
  Flame, Zap, Lock, CheckCircle, Sparkles
} from 'lucide-react';

interface BadgesDisplayProps {
  allBadgesProgress: BadgeProgress[];
  earnedBadges: BadgeDefinition[];
  compact?: boolean;
}

const TIER_COLORS = {
  bronze: 'from-amber-700 to-amber-900 border-amber-600',
  silver: 'from-gray-300 to-gray-500 border-gray-400',
  gold: 'from-yellow-400 to-yellow-600 border-yellow-500',
  platinum: 'from-purple-400 to-indigo-600 border-purple-500',
};

const TIER_BG = {
  bronze: 'bg-amber-500/10 border-amber-500/30',
  silver: 'bg-gray-400/10 border-gray-400/30',
  gold: 'bg-yellow-500/10 border-yellow-500/30',
  platinum: 'bg-purple-500/10 border-purple-500/30',
};

const TIER_GLOW = {
  bronze: 'shadow-amber-500/20',
  silver: 'shadow-gray-400/20',
  gold: 'shadow-yellow-500/30',
  platinum: 'shadow-purple-500/30',
};

const getIcon = (iconName: string, size: number = 20) => {
  const props = { size, className: 'text-white' };
  switch (iconName) {
    case 'target': return <Target {...props} />;
    case 'users': return <Users {...props} />;
    case 'crown': return <Crown {...props} />;
    case 'trophy': return <Trophy {...props} />;
    case 'handshake': return <Handshake {...props} />;
    case 'star': return <Star {...props} />;
    case 'calendar': return <Calendar {...props} />;
    case 'megaphone': return <Megaphone {...props} />;
    case 'network': return <Network {...props} />;
    case 'trending-up': return <TrendingUp {...props} />;
    case 'award': return <Award {...props} />;
    case 'flame': return <Flame {...props} />;
    case 'zap': return <Zap {...props} />;
    case 'bolt': return <Sparkles {...props} />;
    case 'magnet': return <Target {...props} />; // fallback
    default: return <Trophy {...props} />;
  }
};

const BadgeCard: React.FC<{ badgeProgress: BadgeProgress; compact?: boolean }> = ({ badgeProgress, compact }) => {
  const { badge, earned, progress, currentValue } = badgeProgress;
  const [showTooltip, setShowTooltip] = useState(false);

  if (compact) {
    return (
      <div
        className={`relative group cursor-pointer transition-all duration-300 ${
          earned ? 'opacity-100 scale-100' : 'opacity-40 grayscale scale-95'
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
            earned ? TIER_COLORS[badge.tier] : 'from-gray-700 to-gray-800 border-gray-600'
          } border-2 ${earned ? `shadow-lg ${TIER_GLOW[badge.tier]}` : ''}`}
        >
          {earned ? getIcon(badge.icon, 20) : <Lock size={16} className="text-gray-500" />}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-scout-800 rounded-xl border border-scout-700 shadow-xl z-50">
            <p className="text-xs font-bold text-white mb-1">{badge.name}</p>
            <p className="text-[10px] text-gray-400 mb-2">{badge.description}</p>
            {!earned && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-scout-accent">{currentValue}/{badge.criteria.threshold}</span>
                </div>
                <div className="h-1.5 bg-scout-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-scout-accent rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {earned && (
              <div className="flex items-center gap-1 text-[10px] text-scout-accent">
                <CheckCircle size={12} />
                <span>+{badge.xpBonus} XP earned</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative p-4 rounded-2xl border transition-all duration-300 ${
        earned
          ? `${TIER_BG[badge.tier]} hover:scale-[1.02]`
          : 'bg-scout-800/30 border-scout-700/50 opacity-60'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0 ${
            earned ? TIER_COLORS[badge.tier] : 'from-gray-700 to-gray-800 border-gray-600'
          } border-2 ${earned ? `shadow-lg ${TIER_GLOW[badge.tier]}` : ''}`}
        >
          {earned ? getIcon(badge.icon, 24) : <Lock size={20} className="text-gray-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-bold ${earned ? 'text-white' : 'text-gray-500'}`}>
              {badge.name}
            </h4>
            {earned && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                badge.tier === 'platinum' ? 'bg-purple-500/20 text-purple-400' :
                badge.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                badge.tier === 'silver' ? 'bg-gray-400/20 text-gray-300' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {badge.tier}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">{badge.description}</p>

          {earned ? (
            <div className="flex items-center gap-1 text-xs text-scout-accent">
              <CheckCircle size={14} />
              <span className="font-bold">+{badge.xpBonus} XP</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Progress</span>
                <span className="text-gray-400">{currentValue}/{badge.criteria.threshold}</span>
              </div>
              <div className="h-2 bg-scout-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-scout-accent/50 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BadgesDisplay: React.FC<BadgesDisplayProps> = ({
  allBadgesProgress,
  earnedBadges,
  compact = false
}) => {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pipeline' | 'events' | 'milestones'>('all');

  const filteredBadges = allBadgesProgress.filter(bp => {
    if (filter === 'earned' && !bp.earned) return false;
    if (filter === 'locked' && bp.earned) return false;
    if (categoryFilter !== 'all' && bp.badge.category !== categoryFilter) return false;
    return true;
  });

  // Sort: earned first, then by progress
  const sortedBadges = [...filteredBadges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return b.progress - a.progress;
  });

  if (compact) {
    // Compact view: just show earned badges in a row
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-scout-accent" />
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Badges
            </span>
          </div>
          <span className="text-[10px] font-bold text-gray-500">
            {earnedBadges.length}/{allBadgesProgress.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allBadgesProgress.slice(0, 8).map((bp) => (
            <BadgeCard key={bp.badge.id} badgeProgress={bp} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-scout-accent/20 rounded-xl flex items-center justify-center">
            <Trophy size={20} className="text-scout-accent" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Achievements</h3>
            <p className="text-xs text-gray-500">
              {earnedBadges.length} of {allBadgesProgress.length} badges earned
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'earned', 'locked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filter === f
                ? 'bg-scout-accent text-scout-900'
                : 'bg-scout-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'earned' ? 'Earned' : 'Locked'}
          </button>
        ))}
        <div className="w-px bg-scout-700 mx-2" />
        {(['all', 'pipeline', 'events', 'milestones'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              categoryFilter === c
                ? 'bg-scout-700 text-white'
                : 'bg-scout-800/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedBadges.map((bp) => (
          <BadgeCard key={bp.badge.id} badgeProgress={bp} />
        ))}
      </div>

      {sortedBadges.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Lock size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No badges match your filters</p>
        </div>
      )}
    </div>
  );
};

export default BadgesDisplay;
