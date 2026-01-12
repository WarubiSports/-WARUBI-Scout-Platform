import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ScoutProvider } from './contexts/ScoutContext';

// Wrapper component that connects Auth to Scout context
function AppWithProviders() {
  const { user, loading: authLoading, session } = useAuthContext();

  // Only pass userId to ScoutProvider after auth is confirmed and we have a session
  // This prevents queries while auth is still initializing
  const userId = (authLoading || !session) ? undefined : user?.id;

  return (
    <ScoutProvider userId={userId}>
      <App />
    </ScoutProvider>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppWithProviders />
    </AuthProvider>
  </React.StrictMode>
);
