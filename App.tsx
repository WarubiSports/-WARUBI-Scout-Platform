import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppView, UserProfile, Player, ScoutingEvent, AppNotification, PlayerStatus } from './types';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import DashboardLayout from './components/DashboardLayout';
import PasswordSetupModal from './components/PasswordSetupModal';
import ResetPassword from './components/ResetPassword';
const PlayersContent = React.lazy(() => import('./components/PlayersContent'));
import HomeContent from './components/HomeContent';
import EventsRoute from './components/routes/EventsRoute';
import OutreachRoute from './components/routes/OutreachRoute';
import MyBusinessRoute from './components/routes/MyBusinessRoute';
import { evaluatePlayer } from './services/geminiService';
import { isEmailApproved } from './services/accessControlService';
import { setAdminMode } from './services/aiUsageService';
import { useItpSync } from './hooks/useItpSync';
import { useAuthContext } from './contexts/AuthContext';
import { useScoutContext } from './contexts/ScoutContext';
import { useProspects } from './hooks/useProspects';
import { useEvents } from './hooks/useEvents';
import { useOutreach } from './hooks/useOutreach';
import { LazyAdminDashboard, LazyFallback } from './router';
// Redirect old /submit/:scoutId links to ExposureEngine
const SubmitRedirect: React.FC = () => {
  const scoutId = window.location.pathname.split('/submit/')[1];
  React.useEffect(() => {
    window.location.href = `https://app.warubi-sports.com${scoutId ? `?ref=${scoutId}` : ''}`;
  }, [scoutId]);
  return null;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [approvedScoutInfo, setApprovedScoutInfo] = useState<{ isAdmin: boolean; name?: string; region?: string } | null>(null);
  const [impersonatedScoutId, setImpersonatedScoutId] = useState<string | null>(null);

  // Auth context
  const { isAuthenticated, loading: authLoading, signOut, needsPasswordSetup, dismissPasswordSetup, user } = useAuthContext();

  // Supabase integration
  const { scout, loading: scoutLoading, initializeScout, incrementPlacements } = useScoutContext();
  const activeScoutId = impersonatedScoutId || scout?.id;
  const { prospects, addProspect, updateProspect, deleteProspect } = useProspects(activeScoutId);
  const { events, addEvent, updateEvent, deleteEvent } = useEvents(activeScoutId);
  const { logOutreach } = useOutreach(activeScoutId);

  const scoutName = scout?.name || userProfile?.name || 'Unknown Scout';
  const scoutId = activeScoutId || '';

  const [notifications, setNotifications] = useState<AppNotification[]>([
      {
          id: 'welcome-msg',
          type: 'INFO',
          title: 'Welcome to Scout Buddy',
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

  // Track if initial routing has been done
  const [initialRouteSet, setInitialRouteSet] = useState(false);

  // Handle auth state → route navigation
  useEffect(() => {
    if (authLoading || scoutLoading) return;

    // Check for password reset token in URL
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate('/reset-password', { replace: true });
      return;
    }

    if (!isAuthenticated) {
      // Only redirect to login if not already on a public route
      if (!['/login', '/reset-password'].includes(location.pathname) && !location.pathname.startsWith('/submit/')) {
        navigate('/login', { replace: true });
      }
      setInitialRouteSet(false);
      return;
    }

    if (scout) {
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

      if (!initialRouteSet) {
        // Don't redirect away from public routes
        if (location.pathname.startsWith('/submit/')) {
          setInitialRouteSet(true);
        } else if (['/', '/login', '/onboarding'].includes(location.pathname)) {
          navigate(scout.is_admin ? '/admin' : '/dashboard/players', { replace: true });
          setInitialRouteSet(true);
        } else {
          setInitialRouteSet(true);
        }
      }
    } else {
      if (location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
      setInitialRouteSet(false);
    }
  }, [authLoading, scoutLoading, isAuthenticated, scout, initialRouteSet]);

  const handleAddNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: AppNotification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const { handleStatusTransition } = useItpSync({
    scoutId,
    scoutName,
    updateProspect,
    incrementPlacements,
    addNotification: handleAddNotification,
  });

  const handleOnboardingComplete = async (profile: UserProfile, initialPlayers: Player[], initialEvents: ScoutingEvent[]) => {
    const newScout = await initializeScout(profile);
    if (!newScout) {
      throw new Error('Failed to create scout profile. Please try again or contact support.');
    }
    setUserProfile(profile);
    if (profile.isAdmin) {
        navigate('/admin');
        return;
    }
    for (const player of initialPlayers) {
      await addProspect(player);
    }
    for (const event of initialEvents) {
      await addEvent(event);
    }
    navigate('/dashboard/players');
  };

  const handleAddPlayer = async (player: Player) => {
    try {
      const newPlayer = await addProspect(player);
      if (newPlayer) {
        handleAddNotification({
            type: 'SUCCESS',
            title: 'Player Added',
            message: `${player.name} added to your pipeline.`
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
      await logOutreach(
        playerId,
        log.method,
        log.templateName,
        undefined,
        log.note
      );

      // Update contact timestamp and activity — don't depend on stale prospects array
      await updateProspect(playerId, {
        lastContactedAt: new Date().toISOString(),
        activityStatus: 'spark'
      });
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
      const oldPlayer = prospects.find(p => p.id === updatedPlayer.id);
      if (!oldPlayer) return;

      // ITP sync: handles contract stamp, placement, trial request, direct sign
      if (oldPlayer.status !== updatedPlayer.status) {
        const newTrialId = await handleStatusTransition(
          oldPlayer.status,
          updatedPlayer.status,
          updatedPlayer,
        );
        if (newTrialId) {
          updatedPlayer.trialProspectId = newTrialId;
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
          handleAddNotification({
              type: 'SUCCESS',
              title: isHost ? 'Event Created' : 'Attendance Confirmed',
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
    navigate('/login');
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
          <div style={{ opacity: 0.7 }}>Connecting to Scout Buddy</div>
        </div>
      </div>
    );
  }

  const dashboardProps = {
    user: userProfile!,
    players: prospects,
    events,
    notifications,
    onAddPlayer: handleAddPlayer,
    onUpdateProfile: handleUpdateProfile,
    onAddEvent: handleAddEvent,
    onUpdateEvent: handleUpdateEvent,
    onUpdatePlayer: handleUpdatePlayer,
    onDeletePlayer: handleDeletePlayer,
    onAddNotification: handleAddNotification,
    onMarkAllRead: () => setNotifications(prev => prev.map(n => ({ ...n, read: true }))),
    onMessageSent: handleMessageSent,
    onStatusChange: async (id: string, newStatus: PlayerStatus, pathway?: string, trialDates?: any) => {
        const oldPlayer = prospects.find(p => p.id === id);
        if (!oldPlayer) return;

        // Update status + pathway fields
        const updateData: Partial<Player> = { status: newStatus };
        if (pathway) {
          if (newStatus === PlayerStatus.OFFERED) {
            updateData.offeredPathway = pathway;
          } else if (newStatus === PlayerStatus.PLACED) {
            updateData.placedLocation = pathway;
          }
        }
        await updateProspect(id, updateData);

        // ITP sync
        const mergedPlayer = { ...oldPlayer, ...updateData };
        const newTrialId = await handleStatusTransition(
          oldPlayer.status,
          newStatus,
          mergedPlayer,
          trialDates,
        );
        if (newTrialId) {
          await updateProspect(id, { trialProspectId: newTrialId });
        }
    },
    onLogout: handleLogout,
    onReturnToAdmin: (impersonatedScoutId || userProfile?.isAdmin) ? () => { setImpersonatedScoutId(null); navigate('/admin'); } : undefined,
  };

  return (
    <>
      <Toaster position="top-right" richColors closeButton />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={
          <ResetPassword onComplete={() => {
            window.location.href = '/';
          }} />
        } />
        <Route path="/submit/:scoutId" element={<SubmitRedirect />} />
        <Route path="/onboarding" element={
          <Onboarding
            onComplete={handleOnboardingComplete}
            approvedScoutInfo={approvedScoutInfo}
          />
        } />

        {/* Dashboard with layout */}
        {userProfile && (
          <Route path="/dashboard" element={<DashboardLayout {...dashboardProps} />}>
            <Route index element={<Navigate to="players" replace />} />
            <Route path="players" element={<HomeContent />} />
            <Route path="players/all" element={<Suspense fallback={<div />}><PlayersContent /></Suspense>} />
            <Route path="events" element={<EventsRoute />} />
            <Route path="outreach" element={<OutreachRoute />} />
            <Route path="my-business" element={<MyBusinessRoute />} />
          </Route>
        )}

        {/* Admin */}
        {userProfile && (
          <Route path="/admin" element={
            <Suspense fallback={<LazyFallback />}>
              <LazyAdminDashboard
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
                onImpersonate={(p) => { setUserProfile(p); setImpersonatedScoutId(p.scoutId || null); navigate('/dashboard/players'); }}
                onSwitchToScoutView={() => navigate('/dashboard/players')}
              />
            </Suspense>
          } />
        )}

        {/* Catch-all: redirect to dashboard or login */}
        <Route path="*" element={
          isAuthenticated && scout
            ? <Navigate to="/dashboard/players" replace />
            : <Navigate to="/login" replace />
        } />
      </Routes>

      {needsPasswordSetup && isAuthenticated && (
        <PasswordSetupModal onClose={dismissPasswordSetup} />
      )}
    </>
  );
};

export default App;
