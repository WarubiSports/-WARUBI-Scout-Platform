import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardContext } from '../DashboardLayout';
import { LazyMyBusinessTab, LazyFallback } from '../../router';

const MyBusinessRoute: React.FC = () => {
    const { players, user } = useDashboardContext();
    return (
        <ErrorBoundary name="My Business">
            <Suspense fallback={<LazyFallback />}>
                <LazyMyBusinessTab players={players} scoutId={user.scoutId} />
            </Suspense>
        </ErrorBoundary>
    );
};

export default MyBusinessRoute;
