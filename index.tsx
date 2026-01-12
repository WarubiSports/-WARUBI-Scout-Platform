import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ScoutProvider } from './contexts/ScoutContext';

// Wrapper component that connects Auth to Scout context
function AppWithProviders() {
  const { user } = useAuthContext();

  return (
    <ScoutProvider userId={user?.id}>
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
