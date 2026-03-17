import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardContext } from '../DashboardLayout';
import { LazyOutreachTab, LazyFallback } from '../../router';

const OutreachRoute: React.FC = () => {
    const { players, user, onMessageSent, handleStatusChange, onDeletePlayer, onAddPlayer } = useDashboardContext();
    return (
        <ErrorBoundary name="Outreach">
            <Suspense fallback={<LazyFallback />}>
                <LazyOutreachTab
                    players={players}
                    user={user}
                    initialPlayerId={null}
                    onMessageSent={onMessageSent || (() => {})}
                    onAddPlayers={(pls) => pls.forEach(p => onAddPlayer(p))}
                    onStatusChange={handleStatusChange}
                    onDeletePlayer={onDeletePlayer}
                />
            </Suspense>
        </ErrorBoundary>
    );
};

export default OutreachRoute;
