import React, { useState, useMemo } from 'react';
import { AppView, UserProfile, Player, ScoutingEvent, NewsItem, AppNotification, PlayerStatus } from './types';
import { INITIAL_NEWS_ITEMS, INITIAL_TICKER_ITEMS, SCOUT_POINTS } from './constants';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Lifted Events State (Shared Backend Simulation)
  const [events, setEvents] = useState<ScoutingEvent[]>([]);

  // Lifted News & Ticker State
  const [newsItems, setNewsItems] = useState<NewsItem[]>(INITIAL_NEWS_ITEMS);
  const [tickerItems, setTickerItems] = useState<string[]>(INITIAL_TICKER_ITEMS);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([
      {
          id: 'welcome-msg',
          type: 'INFO',
          title: 'Welcome to Warubi Scout',
          message: 'Your account is active. Check the "Knowledge" tab to learn about our pathways.',
          timestamp: new Date().toISOString(),
          read: false
      }
  ]);

  // Derived State: Scout Score Calculation
  const scoutScore = useMemo(() => {
      let score = 0;
      // 1. Players Logged (10pts)
      score += players.length * SCOUT_POINTS.PLAYER_LOG;
      // 2. Placements (500pts)
      score += players.filter(p => p.status === PlayerStatus.PLACED).length * SCOUT_POINTS.PLACEMENT;
      // 3. Hosted Events (50pts)
      score += events.filter(e => e.role === 'HOST' || e.isMine).length * SCOUT_POINTS.EVENT_HOST;
      // 4. Attended Events (15pts)
      score += events.filter(e => e.role === 'ATTENDEE' && !e.isMine).length * SCOUT_POINTS.EVENT_ATTEND;
      
      return score;
  }, [players, events]);

  const handleOnboardingComplete = (profile: UserProfile, firstPlayer: Player | null) => {
    setUserProfile(profile);
    
    // Check if Admin Login
    if (profile.isAdmin) {
        setView(AppView.ADMIN);
        return;
    }

    if (firstPlayer) {
        setPlayers([firstPlayer]);
        // No notification here as it's part of onboarding setup
    }
    setView(AppView.DASHBOARD);
  };

  const handleAddNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: AppNotification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAddPlayer = (player: Player) => {
    setPlayers(prev => [player, ...prev]);
    handleAddNotification({
        type: 'SUCCESS',
        title: `+${SCOUT_POINTS.PLAYER_LOG} XP | Player Logged`,
        message: `${player.name} added to pipeline.`
    });
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
      // Check if status changed to PLACED for big points notification
      const oldPlayer = players.find(p => p.id === updatedPlayer.id);
      if (oldPlayer && oldPlayer.status !== PlayerStatus.PLACED && updatedPlayer.status === PlayerStatus.PLACED) {
          handleAddNotification({
              type: 'SUCCESS',
              title: `+${SCOUT_POINTS.PLACEMENT} XP | PLACEMENT CONFIRMED!`,
              message: `Incredible work placing ${updatedPlayer.name}.`
          });
      }
      setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
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

  const handleAddNews = (item: NewsItem) => {
      setNewsItems(prev => [item, ...prev]);
  };

  const handleDeleteNews = (id: string) => {
      setNewsItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateTicker = (items: string[]) => {
      setTickerItems(items);
  };

  const handleMarkAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Admin Capability: Log in as a specific scout
  const handleImpersonate = (scoutProfile: UserProfile) => {
      setUserProfile(scoutProfile);
      setView(AppView.DASHBOARD);
  };

  return (
    <>
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
            scoutScore={scoutScore} // Pass Score Down
            onAddPlayer={handleAddPlayer}
            onUpdateProfile={handleUpdateProfile}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onAddNotification={handleAddNotification}
            onMarkAllRead={handleMarkAllRead}
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
            onAddNews={handleAddNews}
            onDeleteNews={handleDeleteNews}
            onUpdateTicker={handleUpdateTicker}
            onAddNotification={handleAddNotification}
            onMarkAllRead={handleMarkAllRead}
            onLogout={() => setView(AppView.ONBOARDING)}
            onImpersonate={handleImpersonate}
          />
      )}
    </>
  );
};

export default App;