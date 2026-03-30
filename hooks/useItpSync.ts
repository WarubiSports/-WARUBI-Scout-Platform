import { useCallback } from 'react';
import { toast } from 'sonner';
import { Player, PlayerStatus, AppNotification } from '../types';
import { sendProspectToTrial } from '../services/trialService';
import type { TrialDates } from '../components/TrialRequestModal';

interface UseItpSyncOptions {
  scoutId: string;
  scoutName: string;
  updateProspect: (id: string, data: Partial<Player>) => Promise<void>;
  incrementPlacements: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

export function useItpSync({
  scoutId,
  scoutName,
  updateProspect,
  incrementPlacements,
  addNotification,
}: UseItpSyncOptions) {

  /**
   * Handles all ITP sync logic when a player's status changes.
   * Covers: placement celebration, trial request.
   *
   * Returns the trialProspectId if one was created, or undefined.
   */
  const handleStatusTransition = useCallback(async (
    oldStatus: PlayerStatus,
    newStatus: PlayerStatus,
    player: Player,
    trialDates?: TrialDates,
  ): Promise<string | undefined> => {
    let trialProspectId: string | undefined;

    // 1. Placement celebration
    if (oldStatus !== PlayerStatus.PLACED && newStatus === PlayerStatus.PLACED) {
      await incrementPlacements();
      addNotification({
        type: 'SUCCESS',
        title: 'PLACEMENT CONFIRMED!',
        message: `Incredible work placing ${player.name}.`,
      });
    }

    // 3. Trial request: → REQUEST_TRIAL
    if (oldStatus !== PlayerStatus.REQUEST_TRIAL && newStatus === PlayerStatus.REQUEST_TRIAL) {
      const result = await sendProspectToTrial(
        player,
        scoutId,
        scoutName,
        false,
        trialDates,
      );

      if (result.success && result.trialProspectId) {
        trialProspectId = result.trialProspectId;
        addNotification({
          type: 'SUCCESS',
          title: 'Trial Request Submitted',
          message: `${player.name} — pending staff approval.`,
        });
        toast.success('Trial request submitted — pending staff approval', { duration: 5000 });
      } else {
        addNotification({
          type: 'INFO',
          title: 'Trial Record',
          message: result.error || `${player.name} moved to Request Trial.`,
        });
      }
    }


    return trialProspectId;
  }, [scoutId, scoutName, updateProspect, incrementPlacements, addNotification]);

  return { handleStatusTransition };
}
