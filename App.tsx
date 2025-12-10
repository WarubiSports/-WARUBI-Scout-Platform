import React, { useState } from 'react';
import { AppView, UserProfile, Player } from './types';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const handleOnboardingComplete = (profile: UserProfile, firstPlayer: Player | null) => {
    setUserProfile(profile);
    if (firstPlayer) {
        setPlayers([firstPlayer]);
    }
    setView(AppView.DASHBOARD);
  };

  const handleAddPlayer = (player: Player) => {
    setPlayers(prev => [player, ...prev]);
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
            onAddPlayer={handleAddPlayer}
        />
      )}
    </>
  );
};

export default App;