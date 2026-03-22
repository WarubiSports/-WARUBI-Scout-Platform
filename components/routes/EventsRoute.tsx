import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardContext } from '../DashboardLayout';
import { LazyEventHub, LazyFallback } from '../../router';

const EventsRoute: React.FC = () => {
    const { events, user, players, onAddEvent, onUpdateEvent } = useDashboardContext();
    return (
        <ErrorBoundary name="Events">
            <Suspense fallback={<LazyFallback />}>
                <LazyEventHub events={events} user={user} players={players} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} />
            </Suspense>
        </ErrorBoundary>
    );
};

export default EventsRoute;
