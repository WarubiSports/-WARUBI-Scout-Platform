import { useMemo, useEffect, useRef } from 'react';
import { SCOUT_BADGES, BadgeDefinition } from '../constants';
import { Player, ScoutingEvent } from '../types';

export interface BadgeProgress {
  badge: BadgeDefinition;
  earned: boolean;
  progress: number; // 0-100 percentage
  currentValue: number;
}

interface ScoutStats {
  playersAdded: number;
  placements: number;
  eventsHosted: number;
  eventsAttended: number;
  xpTotal: number;
  level: number;
}

interface UseBadgesReturn {
  earnedBadges: BadgeDefinition[];
  allBadgesProgress: BadgeProgress[];
  newlyUnlockedBadges: BadgeDefinition[];
  totalBadgeXP: number;
}

export function useBadges(
  players: Player[],
  events: ScoutingEvent[],
  xpScore: number,
  level: number,
  onBadgeUnlocked?: (badge: BadgeDefinition) => void
): UseBadgesReturn {
  const previousBadgesRef = useRef<Set<string>>(new Set());

  const stats: ScoutStats = useMemo(() => ({
    playersAdded: players.length,
    placements: players.filter(p => p.status === 'Placed').length,
    eventsHosted: events.filter(e => e.role === 'HOST' || e.isMine).length,
    eventsAttended: events.filter(e => e.role === 'ATTENDEE' && !e.isMine).length,
    xpTotal: xpScore,
    level: level,
  }), [players, events, xpScore, level]);

  const getStatValue = (type: BadgeDefinition['criteria']['type']): number => {
    switch (type) {
      case 'players_added':
        return stats.playersAdded;
      case 'placements':
        return stats.placements;
      case 'events_hosted':
        return stats.eventsHosted;
      case 'events_attended':
        return stats.eventsAttended;
      case 'xp_total':
        return stats.xpTotal;
      case 'level':
        return stats.level;
      default:
        return 0;
    }
  };

  const allBadgesProgress: BadgeProgress[] = useMemo(() => {
    return SCOUT_BADGES.map(badge => {
      const currentValue = getStatValue(badge.criteria.type);
      const threshold = badge.criteria.threshold;
      const earned = currentValue >= threshold;
      const progress = Math.min(100, Math.round((currentValue / threshold) * 100));

      return {
        badge,
        earned,
        progress,
        currentValue,
      };
    });
  }, [stats]);

  const earnedBadges = useMemo(() => {
    return allBadgesProgress.filter(bp => bp.earned).map(bp => bp.badge);
  }, [allBadgesProgress]);

  const newlyUnlockedBadges = useMemo(() => {
    const currentEarnedIds = new Set(earnedBadges.map(b => b.id));
    const newBadges = earnedBadges.filter(b => !previousBadgesRef.current.has(b.id));
    return newBadges;
  }, [earnedBadges]);

  // Notify when new badges are unlocked
  useEffect(() => {
    if (newlyUnlockedBadges.length > 0 && onBadgeUnlocked) {
      newlyUnlockedBadges.forEach(badge => {
        onBadgeUnlocked(badge);
      });
    }
    // Update the ref after processing
    previousBadgesRef.current = new Set(earnedBadges.map(b => b.id));
  }, [newlyUnlockedBadges, earnedBadges, onBadgeUnlocked]);

  const totalBadgeXP = useMemo(() => {
    return earnedBadges.reduce((sum, badge) => sum + badge.xpBonus, 0);
  }, [earnedBadges]);

  return {
    earnedBadges,
    allBadgesProgress,
    newlyUnlockedBadges,
    totalBadgeXP,
  };
}
