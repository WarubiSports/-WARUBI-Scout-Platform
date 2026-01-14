
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppView, UserProfile, Player, ScoutingEvent, NewsItem, AppNotification, PlayerStatus } from './types';
import { INITIAL_NEWS_ITEMS, INITIAL_TICKER_ITEMS, SCOUT_POINTS } from './constants';
import LoginPage from './components/LoginPage';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { evaluatePlayer } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(isSupabaseConfigured ? AppView.LOGIN : AppView.ONBOARDING);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const [events, setEvents] = useState<ScoutingEvent[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(INITIAL_NEWS_ITEMS);
  const [tickerItems, setTickerItems] = useState<string[]>(INITIAL_TICKER_ITEMS);

  // Check auth state on mount
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setView(AppView.ONBOARDING);
      }
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setView(AppView.ONBOARDING);
      } else if (event === 'SIGNED_OUT') {
        setView(AppView.LOGIN);
        setUserProfile(null);
        setPlayers([]);
        setEvents([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    setTimeout(() => {
        setPlayers(prev => prev.map(p => {
            if (p.id === playerId && p.status === PlayerStatus.PROSPECT) {
                handleAddNotification({
                    type: 'INFO',
                    title: 'Signal Detected!',
                    message: `${p.name} just engaged with your assessment. Player pulsing in Undiscovered list.`
                });
                return { ...p, activityStatus: 'signal', lastActive: new Date().toISOString() };
            }
            return p;
        }));
    }, 5000);

    // 2. SPOTLIGHT (The Promotion) - Once Signal is detected, simulate they finished the assessment
    setTimeout(async () => {
        const playerToEvaluate = players.find(p => p.id === playerId);
        if (playerToEvaluate && playerToEvaluate.status === PlayerStatus.PROSPECT) {
            try {
                const result = await evaluatePlayer(`Name: ${playerToEvaluate.name}, Position: ${playerToEvaluate.position}`);
                setPlayers(prev => prev.map(p => {
                    if (p.id === playerId) {
                        return { 
                            ...p, 
                            evaluation: result,
                            activityStatus: 'spotlight',
                            lastActive: new Date().toISOString()
                        };
                    }
                    return p;
                }));
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
      let score = 0;
      score += players.length * SCOUT_POINTS.PLAYER_LOG;
      score += players.filter(p => p.status === PlayerStatus.PLACED).length * SCOUT_POINTS.PLACEMENT;
      score += events.filter(e => e.role === 'HOST' || e.isMine).length * SCOUT_POINTS.EVENT_HOST;
      score += events.filter(e => e.role === 'ATTENDEE' && !e.isMine).length * SCOUT_POINTS.EVENT_ATTEND;
      return score;
  }, [players, events]);

  const handleOnboardingComplete = (profile: UserProfile, initialPlayers: Player[], initialEvents: ScoutingEvent[]) => {
    setUserProfile(profile);
    if (profile.isAdmin) {
        setView(AppView.ADMIN);
        return;
    }
    setPlayers(initialPlayers);
    setEvents(initialEvents);
    setView(AppView.DASHBOARD);
  };

  const handleAddPlayer = (player: Player) => {
    setPlayers(prev => [player, ...prev]);
    handleAddNotification({
        type: 'SUCCESS',
        title: `+${SCOUT_POINTS.PLAYER_LOG} XP | Player Logged`,
        message: `${player.name} added as Undiscovered Talent.`
    });
  };

  const handleMessageSent = (playerId: string, log: any) => {
      setPlayers(prev => prev.map(p => {
          if (p.id === playerId) {
              const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
              return { 
                  ...p, 
                  outreachLogs: [...p.outreachLogs, newLog],
                  lastContactedAt: new Date().toISOString(),
                  activityStatus: 'spark' // Moved to Spark state
              };
          }
          return p;
      }));
      
      const target = players.find(p => p.id === playerId);
      if (target?.status === PlayerStatus.PROSPECT) {
          simulateProgression(playerId);
      }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
      const oldPlayer = players.find(p => p.id === updatedPlayer.id);
      if (!oldPlayer) return;

      // Check for status-specific notifications
      if (oldPlayer.status !== PlayerStatus.PLACED && updatedPlayer.status === PlayerStatus.PLACED) {
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
          setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? { ...updatedPlayer, isRecalibrating: true, previousScore: oldPlayer.evaluation?.score } : p));
          
          // Trigger AI Recalibration
          try {
              const inputString = `Name: ${updatedPlayer.name}, Pos: ${updatedPlayer.position}, Club: ${updatedPlayer.club}, Level: ${updatedPlayer.teamLevel}, GPA: ${updatedPlayer.gpa}, Video: ${updatedPlayer.videoLink}`;
              const newEval = await evaluatePlayer(inputString);
              
              setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? { ...updatedPlayer, evaluation: newEval, isRecalibrating: false } : p));
              
              handleAddNotification({
                  type: 'SUCCESS',
                  title: 'Intelligence Recalibrated',
                  message: `${updatedPlayer.name}'s Scout Score updated to ${newEval.score} based on new data.`
              });
          } catch (e) {
              setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? { ...updatedPlayer, isRecalibrating: false } : p));
          }
      } else {
          // Standard update
          setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
  };

  const handleAddEvent = (event: ScoutingEvent) => {
      setEvents(prev => [...prev, event]);
      const isHost = event.role === 'HOST' || event.isMine;
      const points = isHost ? SCOUT_POINTS.EVENT_HOST : SCOUT_POINTS.EVENT_ATTEND;
      handleAddNotification({
          type: 'SUCCESS',
          title: `+${points} XP | ${isHost ? 'Event Created' : 'Attendance Confirmed'}`,
          message: `${event.title} added to schedule.`
      });
  };

  const handleUpdateEvent = (updatedEvent: ScoutingEvent) => {
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-scout-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === AppView.LOGIN && (
        <LoginPage onLoginSuccess={() => setView(AppView.ONBOARDING)} />
      )}

      {view === AppView.ONBOARDING && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      
      {view === AppView.DASHBOARD && userProfile && (
        <Dashboard 
            user={userProfile} 
            players={players} 
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
            onStatusChange={(id, status) => {
                const p = players.find(player => player.id === id);
                if (p) handleUpdatePlayer({ ...p, status });
            }}
        />
      )}

      {view === AppView.ADMIN && (
          <AdminDashboard 
            players={players}
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
            onLogout={() => setView(AppView.ONBOARDING)}
            onImpersonate={(p) => { setUserProfile(p); setView(AppView.DASHBOARD); }}
          />
      )}
    </>
  );
};

export default App;
