import { useState, useEffect, useCallback } from 'react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  todayCheckedIn: boolean;
  weeklyProgress: boolean[]; // Last 7 days activity
}

interface UseStreakReturn {
  streak: StreakData;
  checkIn: () => { xpEarned: number; isNewStreak: boolean; milestoneReached: number | null };
  resetStreak: () => void;
}

const STORAGE_KEY = 'warubi_scout_streak';
const STREAK_XP = {
  DAILY: 5,
  WEEKLY_BONUS: 25,   // 7-day streak bonus
  MONTHLY_BONUS: 100, // 30-day streak bonus
};

const getToday = () => new Date().toISOString().split('T')[0];

const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const loadStreakData = (): StreakData => {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: null,
      todayCheckedIn: false,
      weeklyProgress: [false, false, false, false, false, false, false],
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as StreakData;
      const today = getToday();

      // Check if streak is still valid (last login was yesterday or today)
      if (data.lastLoginDate) {
        const daysDiff = getDaysDifference(data.lastLoginDate, today);

        if (daysDiff === 0) {
          // Same day - streak continues, already checked in
          return { ...data, todayCheckedIn: true };
        } else if (daysDiff === 1) {
          // Yesterday - streak continues but not checked in today
          return { ...data, todayCheckedIn: false };
        } else {
          // More than 1 day - streak broken
          return {
            ...data,
            currentStreak: 0,
            todayCheckedIn: false,
            weeklyProgress: [false, false, false, false, false, false, false],
          };
        }
      }
      return data;
    }
  } catch (e) {
    console.warn('Failed to load streak data:', e);
  }

  return {
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: null,
    todayCheckedIn: false,
    weeklyProgress: [false, false, false, false, false, false, false],
  };
};

const saveStreakData = (data: StreakData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save streak data:', e);
  }
};

export function useStreak(): UseStreakReturn {
  const [streak, setStreak] = useState<StreakData>(loadStreakData);

  // Re-check streak status on mount and when tab becomes visible
  useEffect(() => {
    const checkStreak = () => {
      setStreak(loadStreakData());
    };

    checkStreak();

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStreak();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const checkIn = useCallback((): { xpEarned: number; isNewStreak: boolean; milestoneReached: number | null } => {
    const today = getToday();

    if (streak.todayCheckedIn) {
      return { xpEarned: 0, isNewStreak: false, milestoneReached: null };
    }

    const newStreak = streak.currentStreak + 1;
    const newLongest = Math.max(newStreak, streak.longestStreak);

    // Update weekly progress (shift left and add today)
    const newWeeklyProgress = [...streak.weeklyProgress.slice(1), true];

    const newData: StreakData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastLoginDate: today,
      todayCheckedIn: true,
      weeklyProgress: newWeeklyProgress,
    };

    saveStreakData(newData);
    setStreak(newData);

    // Calculate XP
    let xpEarned = STREAK_XP.DAILY;
    let milestoneReached: number | null = null;

    // Milestone bonuses
    if (newStreak === 7) {
      xpEarned += STREAK_XP.WEEKLY_BONUS;
      milestoneReached = 7;
    } else if (newStreak === 30) {
      xpEarned += STREAK_XP.MONTHLY_BONUS;
      milestoneReached = 30;
    } else if (newStreak % 7 === 0) {
      // Weekly milestone
      xpEarned += STREAK_XP.WEEKLY_BONUS;
      milestoneReached = newStreak;
    }

    return {
      xpEarned,
      isNewStreak: newStreak === 1,
      milestoneReached,
    };
  }, [streak]);

  const resetStreak = useCallback(() => {
    const newData: StreakData = {
      currentStreak: 0,
      longestStreak: streak.longestStreak,
      lastLoginDate: null,
      todayCheckedIn: false,
      weeklyProgress: [false, false, false, false, false, false, false],
    };
    saveStreakData(newData);
    setStreak(newData);
  }, [streak.longestStreak]);

  return {
    streak,
    checkIn,
    resetStreak,
  };
}

export { STREAK_XP };
