import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AppView, UserProfile, Player, ScoutingEvent, AppNotification, PlayerStatus } from './types';
import { SCOUT_POINTS } from './constants';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import PasswordSetupModal from './components/PasswordSetupModal';
import ResetPassword from './components/ResetPassword';
import { evaluatePlayer } from './services/geminiService';
import { sendProspectToTrial } from './services/trialService';
import { isEmailApproved } from './services/accessControlService';
import { setAdminMode } from './services/aiUsageService';
import { useAuthContext } from './contexts/AuthContext';
import { useScoutContext } from './contexts/ScoutContext';
import { useProspects } from './hooks/useProspects';
import { useEvents } from './hooks/useEvents';
import { useOutreach } from './hooks/useOutreach';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [approvedScoutInfo, setApprovedScoutInfo] = useState<{ isAdmin: boolean; name?: string; region?: string } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Auth context
  const { isAuthenticated, loading: authLoading, signOut, needsPasswordSetup, dismissPasswordSetup, user } = useAuthContext();

  // Check for password reset token in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsResettingPassword(true);
      // Don't clear the hash yet - Supabase needs it to establish the session
      // It will be cleared after password is successfully reset
    }
  }, []);

  // Supabase integration
  const { scout, loading: scoutLoading, initializeScout, addXP, incrementPlacements } = useScoutContext();
  const { prospects, addProspect, updateProspect, deleteProspect } = useProspects(scout?.id);
  const { events, addEvent, updateEvent, deleteEvent } = useEvents(scout?.id);
  const { logOutreach } = useOutreach(scout?.id);

  const [notifications, setNotifications] = useState<AppNotification[]>([
      {
          id: 'welcome-msg',
          type: 'INFO',
          title: 'Welcome to Warubi Scout',
          message: 'Your account is active. Add players to start tracking your pipeline.',
          timestamp: new Date().toISOString(),
          read: false
      }
  ]);

  // Fetch approved scout info for authenticated users who need onboarding
  useEffect(() => {
    const fetchApprovedScoutInfo = async () => {
      if (isAuthenticated && user?.email && !scout) {
        const { approved, scout: scoutData } = await isEmailApproved(user.email);
        if (approved && scoutData) {
          setApprovedScoutInfo({
            isAdmin: scoutData.role === 'admin',
            name: scoutData.name || undefined,
            region: scoutData.region || undefined,
          });
        }
      }
    };
    fetchApprovedScoutInfo();
  }, [isAuthenticated, user?.email, scout]);

  // Track if initial view has been set
  const [initialViewSet, setInitialViewSet] = useState(false);

  // Handle auth state and view routing
  useEffect(() => {
    if (authLoading || scoutLoading) return;

    if (!isAuthenticated) {
      setView(AppView.LOGIN);
      setInitialViewSet(false); // Reset when logged out
      return;
    }

    if (scout) {
      // Set admin mode for AI usage limits
      setAdminMode(scout.is_admin || false);

      const profile: UserProfile = {
        name: scout.name,
        roles: scout.roles || ['Regional Scout'],
        region: scout.region,
        affiliation: scout.affiliation || undefined,
        scoutPersona: scout.scout_persona || undefined,
        weeklyTasks: [],
        scoutId: scout.id,
        isAdmin: scout.is_admin,
        bio: scout.bio || undefined,
        leadMagnetActive: scout.lead_magnet_active,
      };
      setUserProfile(profile);
      // Only set initial view once, don't override on subsequent scout updates
      if (!initialViewSet) {
        setView(scout.is_admin ? AppView.ADMIN : AppView.DASHBOARD);
        setInitialViewSet(true);
      }
    } else {
      setView(AppView.ONBOARDING);
      setInitialViewSet(false);
    }
  }, [authLoading, scoutLoading, isAuthenticated, scout, initialViewSet]);

  const handleAddNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: AppNotification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const scoutScore = useMemo(() => {
      if (scout?.xp_score) return scout.xp_score;
      let score = 0;
      score += prospects.length * SCOUT_POINTS.PLAYER_LOG;
      score += prospects.filter(p => p.status === PlayerStatus.PLACED).length * SCOUT_POINTS.PLACEMENT;
      score += events.filter(e => e.role === 'HOST' || e.isMine).length * SCOUT_POINTS.EVENT_HOST;
      score += events.filter(e => e.role === 'ATTENDEE' && !e.isMine).length * SCOUT_POINTS.EVENT_ATTEND;
      return score;
  }, [scout?.xp_score, prospects, events]);

  const handleOnboardingComplete = async (profile: UserProfile, initialPlayers: Player[], initialEvents: ScoutingEvent[]) => {
    const newScout = await initializeScout(profile);
    if (!newScout) {
      throw new Error('Failed to create scout profile. Please try again or contact support.');
    }
    setUserProfile(profile);
    if (profile.isAdmin) {
        setView(AppView.ADMIN);
        return;
    }
    for (const player of initialPlayers) {
      await addProspect(player);
    }
    for (const event of initialEvents) {
      await addEvent(event);
    }
    setView(AppView.DASHBOARD);
  };

  const handleAddPlayer = async (player: Player) => {
    try {
      const newPlayer = await addProspect(player);
      if (newPlayer) {
        // Calculate XP with quality bonuses
        let totalXP = SCOUT_POINTS.PLAYER_LOG;
        const bonuses: string[] = [];

        // Video bonus
        if (player.videoLink) {
          totalXP += SCOUT_POINTS.PLAYER_HAS_VIDEO;
          bonuses.push('video');
        }

        // Complete profile bonus (position, club, GPA, graduation year)
        const hasCompleteProfile = player.position && player.club && player.gpa && player.graduationYear;
        if (hasCompleteProfile) {
          totalXP += SCOUT_POINTS.PLAYER_COMPLETE_PROFILE;
          bonuses.push('complete profile');
        }

        // Parent contact bonus
        if (player.parentEmail || player.parentPhone) {
          totalXP += SCOUT_POINTS.PLAYER_HAS_PARENT_CONTACT;
          bonuses.push('parent contact');
        }

        await addXP(totalXP);

        const bonusText = bonuses.length > 0 ? ` (${bonuses.join(', ')})` : '';
        handleAddNotification({
            type: 'SUCCESS',
            title: `+${totalXP} XP | Player Added`,
            message: `${player.name} added to your pipeline${bonusText}.`
        });
        return newPlayer;
      } else {
        handleAddNotification({
            type: 'ALERT',
            title: 'Failed to Add Player',
            message: 'Could not save player. Please try again.'
        });
        throw new Error('Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      handleAddNotification({
          type: 'ALERT',
          title: 'Error Adding Player',
          message: String(error)
      });
      throw error;
    }
  };

  const handleMessageSent = async (playerId: string, log: any) => {
      const outreachLog = await logOutreach(
        playerId,
        log.method,
        log.templateName,
        undefined,
        log.note
      );

      const player = prospects.find(p => p.id === playerId);
      if (player) {
        // Check if this is the first outreach (for XP bonus)
        const isFirstOutreach = player.outreachLogs.length === 0;

        await updateProspect(playerId, {
          outreachLogs: [...player.outreachLogs, outreachLog || log],
          lastContactedAt: new Date().toISOString(),
          activityStatus: 'spark'
        });

        // Award XP for first outreach
        if (isFirstOutreach) {
          await addXP(SCOUT_POINTS.FIRST_OUTREACH);
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.FIRST_OUTREACH} XP | First Outreach`,
              message: `First message sent to ${player.name}.`
          });
        }

        // Auto-advance from Lead to Contacted on first message
        if (player.status === PlayerStatus.LEAD) {
          await addXP(SCOUT_POINTS.PLAYER_CONTACTED);
          await updateProspect(playerId, { status: PlayerStatus.CONTACTED });
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLAYER_CONTACTED} XP | Pipeline Progress`,
              message: `${player.name} moved to Contacted stage.`
          });
        }
      }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
      const oldPlayer = prospects.find(p => p.id === updatedPlayer.id);
      if (!oldPlayer) return;

      // Pipeline progression XP rewards
      const statusChanged = oldPlayer.status !== updatedPlayer.status;

      if (statusChanged) {
        // LEAD → CONTACTED (usually handled in handleMessageSent, but support manual change)
        if (oldPlayer.status === PlayerStatus.LEAD && updatedPlayer.status === PlayerStatus.CONTACTED) {
          await addXP(SCOUT_POINTS.PLAYER_CONTACTED);
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLAYER_CONTACTED} XP | Pipeline Progress`,
              message: `${updatedPlayer.name} moved to Contacted.`
          });
        }

        // CONTACTED → INTERESTED
        if (oldPlayer.status === PlayerStatus.CONTACTED && updatedPlayer.status === PlayerStatus.INTERESTED) {
          await addXP(SCOUT_POINTS.PLAYER_INTERESTED);
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLAYER_INTERESTED} XP | Pipeline Progress`,
              message: `${updatedPlayer.name} is now Interested!`
          });
        }

        // INTERESTED → OFFERED
        if (oldPlayer.status === PlayerStatus.INTERESTED && updatedPlayer.status === PlayerStatus.OFFERED) {
          await addXP(SCOUT_POINTS.PLAYER_OFFERED);
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLAYER_OFFERED} XP | Pipeline Progress`,
              message: `${updatedPlayer.name} has been Offered!`
          });
        }
      }

      // Check for placement (final stage)
      if (oldPlayer.status !== PlayerStatus.PLACED && updatedPlayer.status === PlayerStatus.PLACED) {
          await addXP(SCOUT_POINTS.PLACEMENT);
          await incrementPlacements();
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLACEMENT} XP | PLACEMENT CONFIRMED!`,
              message: `Incredible work placing ${updatedPlayer.name}.`
          });
      }

      // Check for trial offer - send to ITP trial system
      if (oldPlayer.status !== PlayerStatus.OFFERED && updatedPlayer.status === PlayerStatus.OFFERED) {
          const scoutName = scout?.name || userProfile?.name || 'Unknown Scout';
          const scoutId = scout?.id || '';

          const { success, trialProspectId, error } = await sendProspectToTrial(
              updatedPlayer,
              scoutId,
              scoutName
          );

          if (success && trialProspectId) {
              updatedPlayer.trialProspectId = trialProspectId;
              handleAddNotification({
                  type: 'SUCCESS',
                  title: 'Trial Invitation Sent',
                  message: `${updatedPlayer.name} has been added to ITP trial system.`
              });
          } else {
              handleAddNotification({
                  type: 'INFO',
                  title: 'Trial Record',
                  message: error || `${updatedPlayer.name} marked as offered.`
              });
          }
      }

      // AI Recalibration on high-impact field changes
      const highImpactFieldsChanged =
          oldPlayer.position !== updatedPlayer.position ||
          oldPlayer.gpa !== updatedPlayer.gpa ||
          oldPlayer.club !== updatedPlayer.club ||
          oldPlayer.teamLevel !== updatedPlayer.teamLevel ||
          oldPlayer.videoLink !== updatedPlayer.videoLink;

      if (highImpactFieldsChanged) {
          await updateProspect(updatedPlayer.id, {
            ...updatedPlayer,
            isRecalibrating: true,
            previousScore: oldPlayer.evaluation?.score
          });

          try {
              const inputString = `Name: ${updatedPlayer.name}, Pos: ${updatedPlayer.position}, Club: ${updatedPlayer.club}, Level: ${updatedPlayer.teamLevel}, GPA: ${updatedPlayer.gpa}, Video: ${updatedPlayer.videoLink}`;
              const newEval = await evaluatePlayer(inputString);

              await updateProspect(updatedPlayer.id, {
                ...updatedPlayer,
                evaluation: newEval,
                isRecalibrating: false
              });

              handleAddNotification({
                  type: 'SUCCESS',
                  title: 'Intelligence Recalibrated',
                  message: `${updatedPlayer.name}'s Scout Score updated to ${newEval.score}.`
              });
          } catch (e) {
              await updateProspect(updatedPlayer.id, {
                ...updatedPlayer,
                isRecalibrating: false
              });
          }
      } else {
          await updateProspect(updatedPlayer.id, updatedPlayer);
      }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
  };

  const handleDeletePlayer = async (playerId: string) => {
      const player = prospects.find(p => p.id === playerId);
      try {
          await deleteProspect(playerId);
          handleAddNotification({
              type: 'INFO',
              title: 'Player Deleted',
              message: player ? `${player.name} has been removed from your pipeline.` : 'Player removed.'
          });
      } catch (error) {
          console.error('Error deleting player:', error);
          handleAddNotification({
              type: 'ALERT',
              title: 'Delete Failed',
              message: 'Could not delete player. Please try again.'
          });
      }
  };

  const handleAddEvent = async (event: ScoutingEvent) => {
      try {
        const newEvent = await addEvent(event);
        if (newEvent) {
          const isHost = event.role === 'HOST' || event.isMine;
          const points = isHost ? SCOUT_POINTS.EVENT_HOST : SCOUT_POINTS.EVENT_ATTEND;
          await addXP(points);
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${points} XP | ${isHost ? 'Event Created' : 'Attendance Confirmed'}`,
              message: `${event.title} added to schedule.`
          });
        } else {
          handleAddNotification({
              type: 'ALERT',
              title: 'Failed to Add Event',
              message: 'Could not save event. Please try again.'
          });
        }
      } catch (error) {
        console.error('[handleAddEvent] Error:', error);
        handleAddNotification({
            type: 'ALERT',
            title: 'Error',
            message: String(error)
        });
      }
  };

  const handleUpdateEvent = async (updatedEvent: ScoutingEvent) => {
      await updateEvent(updatedEvent.id, updatedEvent);
  };

  const handleDeleteEvent = async (eventId: string) => {
      await deleteEvent(eventId);
      handleAddNotification({
          type: 'INFO',
          title: 'Event Deleted',
          message: 'The event has been removed.'
      });
  };

  const handleLogout = async () => {
    await signOut();
    setUserProfile(null);
    setView(AppView.LOGIN);
  };

  if (authLoading || scoutLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>Loading...</div>
          <div style={{ opacity: 0.7 }}>Connecting to Warubi Scout</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />

      {isResettingPassword && (
        <ResetPassword onComplete={() => {
          setIsResettingPassword(false);
          // Force a page reload to ensure proper session handling
          window.location.href = '/';
        }} />
      )}

      {!isResettingPassword && view === AppView.LOGIN && <Login />}

      {view === AppView.ONBOARDING && (
        <Onboarding
          onComplete={handleOnboardingComplete}
          approvedScoutInfo={approvedScoutInfo}
        />
      )}

      {view === AppView.DASHBOARD && userProfile && (
        <Dashboard
            user={userProfile}
            players={prospects}
            events={events}
            notifications={notifications}
            scoutScore={scoutScore}
            onAddPlayer={handleAddPlayer}
            onUpdateProfile={handleUpdateProfile}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onAddNotification={handleAddNotification}
            onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            onMessageSent={handleMessageSent}
            onStatusChange={async (id, newStatus) => {
                // Find old player to check status transition for XP
                const oldPlayer = prospects.find(p => p.id === id);
                if (!oldPlayer) return;

                const oldStatus = oldPlayer.status;

                // Award pipeline progression XP
                if (oldStatus === PlayerStatus.LEAD && newStatus === PlayerStatus.CONTACTED) {
                  await addXP(SCOUT_POINTS.PLAYER_CONTACTED);
                  handleAddNotification({
                    type: 'SUCCESS',
                    title: `+${SCOUT_POINTS.PLAYER_CONTACTED} XP | Pipeline Progress`,
                    message: `${oldPlayer.name} moved to Contacted.`
                  });
                }
                if (oldStatus === PlayerStatus.CONTACTED && newStatus === PlayerStatus.INTERESTED) {
                  await addXP(SCOUT_POINTS.PLAYER_INTERESTED);
                  handleAddNotification({
                    type: 'SUCCESS',
                    title: `+${SCOUT_POINTS.PLAYER_INTERESTED} XP | Pipeline Progress`,
                    message: `${oldPlayer.name} is now Interested!`
                  });
                }
                if (oldStatus === PlayerStatus.INTERESTED && newStatus === PlayerStatus.OFFERED) {
                  await addXP(SCOUT_POINTS.PLAYER_OFFERED);
                  handleAddNotification({
                    type: 'SUCCESS',
                    title: `+${SCOUT_POINTS.PLAYER_OFFERED} XP | Pipeline Progress`,
                    message: `${oldPlayer.name} has been Offered!`
                  });
                }
                if (oldStatus !== PlayerStatus.PLACED && newStatus === PlayerStatus.PLACED) {
                  await addXP(SCOUT_POINTS.PLACEMENT);
                  await incrementPlacements();
                  handleAddNotification({
                    type: 'SUCCESS',
                    title: `+${SCOUT_POINTS.PLACEMENT} XP | PLACEMENT CONFIRMED!`,
                    message: `Incredible work placing ${oldPlayer.name}.`
                  });
                }

                await updateProspect(id, { status: newStatus });
            }}
            onLogout={handleLogout}
            onReturnToAdmin={userProfile?.isAdmin ? () => setView(AppView.ADMIN) : undefined}
        />
      )}

      {view === AppView.ADMIN && (
          <AdminDashboard
            players={prospects}
            events={events}
            notifications={notifications}
            onUpdateEvent={handleUpdateEvent}
            onUpdatePlayer={handleUpdatePlayer}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
            onAddNotification={handleAddNotification}
            onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            onLogout={handleLogout}
            onImpersonate={(p) => { setUserProfile(p); setView(AppView.DASHBOARD); }}
            onSwitchToScoutView={() => setView(AppView.DASHBOARD)}
          />
      )}

      {needsPasswordSetup && isAuthenticated && (
        <PasswordSetupModal onClose={dismissPasswordSetup} />
      )}
    </>
  );
};

export default App;
