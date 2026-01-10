import React, { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { getUsageStats, AIUsageStats, FREE_TIER_LIMITS } from '../services/aiUsageService';

interface AIQuotaDisplayProps {
  compact?: boolean;
}

const AIQuotaDisplay: React.FC<AIQuotaDisplayProps> = ({ compact = false }) => {
  const [stats, setStats] = useState<AIUsageStats | null>(null);

  useEffect(() => {
    // Load initial stats
    setStats(getUsageStats());

    // Refresh stats periodically and on focus
    const interval = setInterval(() => setStats(getUsageStats()), 30000);
    const handleFocus = () => setStats(getUsageStats());
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (!stats) return null;

  const dailyPercentUsed = stats.today.percentage;
  const isLow = stats.today.remaining < 10;
  const isDepleted = stats.today.remaining <= 0;

  // Get color based on usage
  const getBarColor = () => {
    if (isDepleted) return 'bg-red-500';
    if (isLow) return 'bg-amber-500';
    if (dailyPercentUsed > 70) return 'bg-yellow-500';
    return 'bg-scout-accent';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-scout-900/50 rounded-xl border border-scout-700">
        <Sparkles size={14} className={isDepleted ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-scout-accent'} />
        <div className="flex-1">
          <div className="h-1.5 bg-scout-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor()} transition-all duration-500`}
              style={{ width: `${100 - dailyPercentUsed}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-400">{stats.today.remaining}</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-scout-900/50 rounded-xl border border-scout-700 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className={isDepleted ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-scout-accent'} />
          <span className="text-xs font-black text-gray-300 uppercase tracking-wide">AI Credits</span>
        </div>
        {(isLow || isDepleted) && (
          <AlertTriangle size={14} className={isDepleted ? 'text-red-400' : 'text-amber-400'} />
        )}
      </div>

      {/* Daily Usage */}
      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-gray-500">Today</span>
          <span className={isDepleted ? 'text-red-400 font-bold' : 'text-gray-400'}>
            {stats.today.remaining} / {FREE_TIER_LIMITS.dailyCredits}
          </span>
        </div>
        <div className="h-2 bg-scout-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all duration-500`}
            style={{ width: `${100 - dailyPercentUsed}%` }}
          />
        </div>
      </div>

      {/* Monthly Usage */}
      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-gray-500">This Month</span>
          <span className="text-gray-400">
            {stats.month.remaining} / {FREE_TIER_LIMITS.monthlyCredits}
          </span>
        </div>
        <div className="h-1.5 bg-scout-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-scout-600 transition-all duration-500"
            style={{ width: `${100 - stats.month.percentage}%` }}
          />
        </div>
      </div>

      {isDepleted && (
        <p className="text-[10px] text-red-400 mt-2">
          Daily limit reached. Resets at midnight.
        </p>
      )}
    </div>
  );
};

export default AIQuotaDisplay;
