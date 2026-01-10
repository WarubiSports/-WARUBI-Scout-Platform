import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppView, UserProfile, Player, ScoutingEvent, NewsItem, AppNotification, PlayerStatus } from './types';
import { INITIAL_NEWS_ITEMS, INITIAL_TICKER_ITEMS, SCOUT_POINTS } from './constants';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { evaluatePlayer } from './services/geminiService';
import { useAuthContext } from './contexts/AuthContext';
import { useScoutContext } from './contexts/ScoutContext';
import { useDemoMode } from './contexts/DemoModeContext';
import { useProspects } from './hooks/useProspects';
import { useEvents } from './hooks/useEvents';
import { useOutreach } from './hooks/useOutreach';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Demo mode context (shared across all components)
  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoMode();

  // Auth context
  const { isAuthenticated, loading: authLoading, signOut } = useAuthContext();

  // Supabase integration
  const { scout, loading: scoutLoading, initializeScout, addXP, incrementPlacements, isDemo } = useScoutContext();
  const { prospects, addProspect, updateProspect, isDemo: prospectsDemo } = useProspects(scout?.id, isDemoMode);
  const { events, addEvent, updateEvent, isDemo: eventsDemo } = useEvents(scout?.id, isDemoMode);
  const { logOutreach } = useOutreach(scout?.id, isDemoMode);

  // Local state (transient data)
  const [newsItems, setNewsItems] = useState<NewsItem[]>(INITIAL_NEWS_ITEMS);
  const [tickerItems, setTickerItems] = useState<string[]>(INITIAL_TICKER_ITEMS);

  const [notifications, setNotifications] = useState<AppNotification[]>([
      {
          id: 'welcome-msg',
          type: 'INFO',
          title: 'Welcome to Warubi Scout',
          message: 'Your account is active. Use the Outreach tab to engage Undiscovered Talent.',
          timestamp: new Date().toISOString(),
          read: false
      }
  ]);

  // Handle auth state and view routing
  useEffect(() => {
    // Still loading - wait
    if (authLoading || scoutLoading) return;

    // Not authenticated and not in demo mode - show login
    if (!isAuthenticated && !isDemoMode) {
      setView(AppView.LOGIN);
      return;
    }

    // Authenticated (or demo) - check if scout profile exists
    if (scout) {
      // Reconstruct userProfile from scout data
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
      if (scout.is_admin) {
        setView(AppView.ADMIN);
      } else {
        setView(AppView.DASHBOARD);
      }
    } else if (isAuthenticated || isDemoMode) {
      // Authenticated but no scout profile - show onboarding
      setView(AppView.ONBOARDING);
    }
  }, [authLoading, scoutLoading, isAuthenticated, isDemoMode, scout]);

  const handleAddNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: AppNotification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const simulateProgression = (playerId: string) => {
    // 1. SIGNAL STATE (The Gatekeeper) - After a delay of sending a "Spark"
    setTimeout(async () => {
        const player = prospects.find(p => p.id === playerId);
        if (player && player.status === PlayerStatus.PROSPECT) {
            handleAddNotification({
                type: 'INFO',
                title: 'Signal Detected!',
                message: `${player.name} just engaged with your assessment. Player pulsing in Undiscovered list.`
            });
            await updateProspect(playerId, {
                activityStatus: 'signal',
                lastActive: new Date().toISOString()
            });
        }
    }, 5000);

    // 2. SPOTLIGHT (The Promotion) - Once Signal is detected, simulate they finished the assessment
    setTimeout(async () => {
        const playerToEvaluate = prospects.find(p => p.id === playerId);
        if (playerToEvaluate && playerToEvaluate.status === PlayerStatus.PROSPECT) {
            try {
                const result = await evaluatePlayer(`Name: ${playerToEvaluate.name}, Position: ${playerToEvaluate.position}`);
                await updateProspect(playerId, {
                    evaluation: result,
                    activityStatus: 'spotlight',
                    lastActive: new Date().toISOString()
                });
                handleAddNotification({
                    type: 'SUCCESS',
                    title: 'Spotlight Ready',
                    message: `${playerToEvaluate.name} has completed the assessment. Review and promote to Pipeline.`
                });
            } catch (e) {
                console.error("Simulation eval failed", e);
            }
        }
    }, 15000);
  };

  const scoutScore = useMemo(() => {
      // Use scout's XP from database if available
      if (scout?.xp_score) {
        return scout.xp_score;
      }
      // Fallback calculation
      let score = 0;
      score += prospects.length * SCOUT_POINTS.PLAYER_LOG;
      score += prospects.filter(p => p.status === PlayerStatus.PLACED).length * SCOUT_POINTS.PLACEMENT;
      score += events.filter(e => e.role === 'HOST' || e.isMine).length * SCOUT_POINTS.EVENT_HOST;
      score += events.filter(e => e.role === 'ATTENDEE' && !e.isMine).length * SCOUT_POINTS.EVENT_ATTEND;
      return score;
  }, [scout?.xp_score, prospects, events]);

  const handleOnboardingComplete = async (profile: UserProfile, initialPlayers: Player[], initialEvents: ScoutingEvent[]) => {
    // Create scout in Supabase
    const newScout = await initializeScout(profile);

    setUserProfile(profile);
    if (profile.isAdmin) {
        setView(AppView.ADMIN);
        return;
    }

    // Add any initial players/events to Supabase
    for (const player of initialPlayers) {
      await addProspect(player);
    }
    for (const event of initialEvents) {
      await addEvent(event);
    }

    setView(AppView.DASHBOARD);
  };

  const handleAddPlayer = async (player: Player) => {
    const newPlayer = await addProspect(player);
    if (newPlayer) {
      await addXP(SCOUT_POINTS.PLAYER_LOG);
      handleAddNotification({
          type: 'SUCCESS',
          title: `+${SCOUT_POINTS.PLAYER_LOG} XP | Player Logged`,
          message: `${player.name} added as Undiscovered Talent.`
      });
    }
  };

  const handleMessageSent = async (playerId: string, log: any) => {
      // Log outreach to Supabase
      const outreachLog = await logOutreach(
        playerId,
        log.method,
        log.templateName,
        undefined, // message content
        log.note
      );

      // Update player with new log and activity status
      const player = prospects.find(p => p.id === playerId);
      if (player) {
        await updateProspect(playerId, {
          outreachLogs: [...player.outreachLogs, outreachLog || log],
          lastContactedAt: new Date().toISOString(),
          activityStatus: 'spark'
        });

        if (player.status === PlayerStatus.PROSPECT) {
          simulateProgression(playerId);
        }
      }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
      const oldPlayer = prospects.find(p => p.id === updatedPlayer.id);
      if (!oldPlayer) return;

      // Check for placement
      if (oldPlayer.status !== PlayerStatus.PLACED && updatedPlayer.status === PlayerStatus.PLACED) {
          await addXP(SCOUT_POINTS.PLACEMENT);
          await incrementPlacements();
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLACEMENT} XP | PLACEMENT CONFIRMED!`,
              message: `Incredible work placing ${updatedPlayer.name}.`
          });
      }

      // INTELLIGENCE RECALIBRATION LOGIC
      const highImpactFieldsChanged =
          oldPlayer.position !== updatedPlayer.position ||
          oldPlayer.gpa !== updatedPlayer.gpa ||
          oldPlayer.club !== updatedPlayer.club ||
          oldPlayer.teamLevel !== updatedPlayer.teamLevel ||
          oldPlayer.videoLink !== updatedPlayer.videoLink;

      if (highImpactFieldsChanged) {
          // Immediately update UI to show scanning state
          await updateProspect(updatedPlayer.id, {
            ...updatedPlayer,
            isRecalibrating: true,
            previousScore: oldPlayer.evaluation?.score
          });

          // Trigger AI Recalibration
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
                  message: `${updatedPlayer.name}'s Scout Score updated to ${newEval.score} based on new data.`
              });
          } catch (e) {
              await updateProspect(updatedPlayer.id, {
                ...updatedPlayer,
                isRecalibrating: false
              });
          }
      } else {
          // Standard update
          await updateProspect(updatedPlayer.id, updatedPlayer);
      }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
  };

  const handleAddEvent = async (event: ScoutingEvent) => {
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
      }
  };

  const handleUpdateEvent = async (updatedEvent: ScoutingEvent) => {
      await updateEvent(updatedEvent.id, updatedEvent);
  };

  // Handle skip login (demo mode)
  const handleSkipLogin = () => {
    enableDemoMode();
    setView(AppView.ONBOARDING);
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    setUserProfile(null);
    disableDemoMode();
    setView(AppView.LOGIN);
  };

  // Show loading state while checking for existing session
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
      {view === AppView.LOGIN && (
        <Login onSkip={handleSkipLogin} />
      )}

      {view === AppView.ONBOARDING && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {view === AppView.DASHBOARD && userProfile && (
        <Dashboard
            user={userProfile}
            players={prospects}
            events={events}
            newsItems={newsItems}
            tickerItems={tickerItems}
            notifications={notifications}
            scoutScore={scoutScore}
            onAddPlayer={handleAddPlayer}
            onUpdateProfile={handleUpdateProfile}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onUpdatePlayer={handleUpdatePlayer}
            onAddNotification={handleAddNotification}
            onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            onMessageSent={handleMessageSent}
            onStatusChange={async (id, status) => {
                const p = prospects.find(player => player.id === id);
                if (p) await handleUpdatePlayer({ ...p, status });
            }}
        />
      )}

      {view === AppView.ADMIN && (
          <AdminDashboard
            players={prospects}
            events={events}
            newsItems={newsItems}
            tickerItems={tickerItems}
            notifications={notifications}
            onUpdateEvent={handleUpdateEvent}
            onUpdatePlayer={handleUpdatePlayer}
            onAddNews={(item) => setNewsItems(prev => [item, ...prev])}
            onDeleteNews={(id) => setNewsItems(prev => prev.filter(item => item.id !== id))}
            onUpdateTicker={(items) => setTickerItems(items)}
            onAddNotification={handleAddNotification}
            onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            onLogout={handleLogout}
            onImpersonate={(p) => { setUserProfile(p); setView(AppView.DASHBOARD); }}
          />
      )}
    </>
  );
};

export default App;
