import React, { useState, useEffect } from 'react';
import { Flame, Zap, Calendar, CheckCircle, Trophy } from 'lucide-react';
import { useStreak, STREAK_XP } from '../hooks/useStreak';

interface StreakDisplayProps {
  onXPEarned?: (amount: number, reason: string) => void;
  compact?: boolean;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ onXPEarned, compact = false }) => {
  const { streak, checkIn } = useStreak();
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpAnimation, setXpAnimation] = useState<number | null>(null);

  // Auto check-in on mount if not already checked in today
  useEffect(() => {
    if (!streak.todayCheckedIn) {
      const result = checkIn();
      if (result.xpEarned > 0) {
        setXpAnimation(result.xpEarned);
        setTimeout(() => setXpAnimation(null), 2000);

        if (onXPEarned) {
          const reason = result.milestoneReached
            ? `${result.milestoneReached}-day streak milestone!`
            : 'Daily check-in';
          onXPEarned(result.xpEarned, reason);
        }

        if (result.milestoneReached) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    }
  }, []);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
          streak.currentStreak > 0 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-scout-800 border border-scout-700'
        }`}>
          <Flame size={14} className={streak.currentStreak > 0 ? 'text-orange-400' : 'text-gray-500'} />
          <span className={`text-sm font-bold ${streak.currentStreak > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
            {streak.currentStreak}
          </span>
        </div>
        {xpAnimation && (
          <span className="text-xs font-bold text-scout-accent animate-bounce">
            +{xpAnimation} XP
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-scout-800/90 rounded-2xl z-10 animate-fade-in">
          <div className="text-center">
            <Trophy size={48} className="text-yellow-400 mx-auto mb-2 animate-bounce" />
            <p className="text-lg font-black text-white">Streak Milestone!</p>
            <p className="text-sm text-scout-accent">+{STREAK_XP.WEEKLY_BONUS} bonus XP</p>
          </div>
        </div>
      )}

      <div className="bg-scout-800/50 rounded-2xl border border-scout-700 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              streak.currentStreak > 0
                ? 'bg-gradient-to-br from-orange-500 to-red-500'
                : 'bg-scout-700'
            }`}>
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Daily Streak</p>
              <p className={`text-2xl font-black ${
                streak.currentStreak > 0 ? 'text-orange-400' : 'text-gray-500'
              }`}>
                {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          {xpAnimation && (
            <div className="px-3 py-1.5 bg-scout-accent/20 rounded-lg border border-scout-accent/30 animate-pulse">
              <span className="text-sm font-bold text-scout-accent">+{xpAnimation} XP</span>
            </div>
          )}
        </div>

        {/* Weekly Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase">
            <span>This Week</span>
            <span>{streak.weeklyProgress.filter(Boolean).length}/7 days</span>
          </div>
          <div className="flex gap-1">
            {streak.weeklyProgress.map((active, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-8 rounded-lg flex items-center justify-center transition-all ${
                  active
                    ? 'bg-gradient-to-b from-orange-500 to-red-500'
                    : 'bg-scout-700'
                }`}>
                  {active ? (
                    <CheckCircle size={14} className="text-white" />
                  ) : (
                    <span className="text-[10px] text-gray-500">{dayLabels[i]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-scout-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Best Streak</p>
            <p className="text-lg font-bold text-white">{streak.longestStreak} days</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Next Milestone</p>
            <p className="text-lg font-bold text-scout-accent">
              {streak.currentStreak < 7
                ? `${7 - streak.currentStreak} days`
                : streak.currentStreak < 30
                  ? `${30 - streak.currentStreak} days`
                  : `${7 - (streak.currentStreak % 7)} days`}
            </p>
          </div>
        </div>

        {/* Today's status */}
        {streak.todayCheckedIn && (
          <div className="flex items-center justify-center gap-2 text-xs text-scout-accent bg-scout-accent/10 rounded-lg py-2 border border-scout-accent/20">
            <Zap size={14} />
            <span className="font-bold">Checked in today! Come back tomorrow.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakDisplay;
