import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useScoutContext } from '../contexts/ScoutContext';

interface AuthGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, loading: authLoading } = useAuthContext();
    const { scout, loading: scoutLoading } = useScoutContext();
    const location = useLocation();

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

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!scout) {
        return <Navigate to="/onboarding" replace />;
    }

    if (requireAdmin && !scout.is_admin) {
        return <Navigate to="/dashboard/players" replace />;
    }

    return <>{children}</>;
};
