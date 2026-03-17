import { useCallback } from 'react';
import { toast } from 'sonner';
import { Player, PlayerStatus, AppNotification } from '../types';
import { sendProspectToTrial, markContractRequested } from '../services/trialService';
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
   * Covers: contract stamp, placement celebration, trial request, direct sign.
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

    // 1. Contract stamp: REQUEST_TRIAL → SEND_CONTRACT
    if (oldStatus === PlayerStatus.REQUEST_TRIAL && newStatus === PlayerStatus.SEND_CONTRACT) {
      if (player.trialProspectId) {
        await markContractRequested(player.trialProspectId, scoutName);
      }
    }

    // 2. Placement celebration
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

    // 4. Direct sign: Lead → SEND_CONTRACT with no existing trial
    if (
      oldStatus === PlayerStatus.LEAD &&
      newStatus === PlayerStatus.SEND_CONTRACT &&
      !player.trialProspectId
    ) {
      const result = await sendProspectToTrial(
        player,
        scoutId,
        scoutName,
        true,
      );

      if (result.success && result.trialProspectId) {
        trialProspectId = result.trialProspectId;
        addNotification({
          type: 'SUCCESS',
          title: 'Direct Sign Sent',
          message: `${player.name} has been added to ITP system.`,
        });
        const onboardingUrl = `https://itp-trial-onboarding.vercel.app/${result.trialProspectId}/onboarding`;
        toast.success('Player added to ITP system (Direct Sign)', {
          duration: 10000,
          action: {
            label: 'Copy Onboarding Link',
            onClick: () => {
              navigator.clipboard.writeText(onboardingUrl);
              toast.success('Onboarding link copied!', { duration: 2000 });
            },
          },
        });
      }
    }

    return trialProspectId;
  }, [scoutId, scoutName, updateProspect, incrementPlacements, addNotification]);

  return { handleStatusTransition };
}
