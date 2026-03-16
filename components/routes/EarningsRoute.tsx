import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardContext } from '../DashboardLayout';
import { LazyEarningsTab, LazyFallback } from '../../router';

const EarningsRoute: React.FC = () => {
    const { players, user } = useDashboardContext();
    return (
        <ErrorBoundary name="Earnings">
            <Suspense fallback={<LazyFallback />}>
                <LazyEarningsTab players={players} scoutId={user.scoutId} />
            </Suspense>
        </ErrorBoundary>
    );
};

export default EarningsRoute;
