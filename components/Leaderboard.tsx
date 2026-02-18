import React from 'react';
import { Trophy, Medal, Award, TrendingUp, Crown } from 'lucide-react';
import { useLeaderboard, LeaderboardEntry } from '../hooks/useLeaderboard';

interface LeaderboardProps {
  currentScoutId?: string;
  currentScoutXP?: number;
  compact?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  currentScoutId,
  currentScoutXP = 0,
  compact = false
}) => {
  const { leaderboard, currentUserRank, loading, error } = useLeaderboard(currentScoutId, compact ? 5 : 10);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <div key={i} className="h-10 bg-scout-700/50 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || leaderboard.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs">
        {error || 'No scouts yet'}
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={16} className="text-yellow-400" />;
      case 2:
        return <Medal size={16} className="text-gray-300" />;
      case 3:
        return <Award size={16} className="text-amber-600" />;
      default:
        return <span className="text-xs font-bold text-gray-500 w-4 text-center">{rank}</span>;
    }
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-scout-accent/20 border-scout-accent/50';
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-400/10 border-gray-400/30';
      case 3:
        return 'bg-amber-600/10 border-amber-600/30';
      default:
        return 'bg-scout-800/50 border-scout-700/50';
    }
  };

  // Calculate distance to next rank for current user
  const getDistanceToNextRank = () => {
    if (!currentUserRank || currentUserRank === 1) return null;

    const nextRankScout = leaderboard.find(s => s.rank === currentUserRank - 1);
    if (nextRankScout && currentScoutXP) {
      const diff = nextRankScout.xp_score - currentScoutXP;
      if (diff > 0) {
        return { xp: diff, name: nextRankScout.name };
      }
    }
    return null;
  };

  const distanceToNext = getDistanceToNextRank();

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-scout-accent" />
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Top Scouts</span>
          </div>
          {currentUserRank && (
            <span className="text-[10px] font-bold text-scout-accent">
              You: #{currentUserRank}
            </span>
          )}
        </div>

        {leaderboard.slice(0, 5).map((scout) => {
          const isCurrentUser = scout.id === currentScoutId;
          return (
            <div
              key={scout.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${getRankBg(scout.rank, isCurrentUser)}`}
            >
              <div className="w-5 flex justify-center">
                {getRankIcon(scout.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${isCurrentUser ? 'text-scout-accent' : 'text-white'}`}>
                  {isCurrentUser ? 'You' : scout.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-scout-highlight">{scout.xp_score.toLocaleString()}</p>
              </div>
            </div>
          );
        })}

        {distanceToNext && (
          <div className="mt-3 px-3 py-2 bg-scout-accent/10 border border-scout-accent/30 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-scout-accent" />
              <span className="text-[10px] text-gray-400">
                <span className="text-scout-accent font-bold">{distanceToNext.xp} XP</span> to pass {distanceToNext.name}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full leaderboard view
  return (
    <div className="bg-scout-800/50 rounded-2xl border border-scout-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-scout-accent/20 rounded-xl flex items-center justify-center">
            <Trophy size={20} className="text-scout-accent" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Scout Leaderboard</h3>
            <p className="text-xs text-gray-500">Top performers this month</p>
          </div>
        </div>
        {currentUserRank && currentUserRank > 10 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Your Rank</p>
            <p className="text-xl font-black text-scout-accent">#{currentUserRank}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {leaderboard.map((scout) => {
          const isCurrentUser = scout.id === currentScoutId;
          return (
            <div
              key={scout.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] ${getRankBg(scout.rank, isCurrentUser)}`}
            >
              <div className="w-8 flex justify-center">
                {getRankIcon(scout.rank)}
              </div>

              <div className="w-10 h-10 rounded-xl bg-scout-700 flex items-center justify-center font-black text-white">
                {scout.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-scout-accent' : 'text-white'}`}>
                  {isCurrentUser ? `${scout.name} (You)` : scout.name}
                </p>
                <p className="text-xs text-gray-500">{scout.region} • Level {scout.level}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-black text-scout-highlight">{scout.xp_score.toLocaleString()} XP</p>
                <p className="text-[10px] text-gray-500">{scout.placements_count} placements</p>
              </div>
            </div>
          );
        })}
      </div>

      {distanceToNext && (
        <div className="mt-4 px-4 py-3 bg-gradient-to-r from-scout-accent/10 to-emerald-500/10 border border-scout-accent/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-scout-accent" />
              <span className="text-sm text-white font-medium">
                <span className="text-scout-accent font-black">{distanceToNext.xp} XP</span> to overtake {distanceToNext.name}
              </span>
            </div>
            <span className="text-xs text-gray-500">Keep grinding!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
