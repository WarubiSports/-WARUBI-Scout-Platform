import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ScoutProvider } from './contexts/ScoutContext';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';

// Wrapper component that connects Auth and DemoMode to Scout context
function AppWithProviders() {
  const { user } = useAuthContext();
  const { isDemoMode } = useDemoMode();

  return (
    <ScoutProvider userId={user?.id} forceDemoMode={isDemoMode}>
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
    <DemoModeProvider>
      <AuthProvider>
        <AppWithProviders />
      </AuthProvider>
    </DemoModeProvider>
  </React.StrictMode>
);