import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardContext } from '../DashboardLayout';
import { LazyInsightsTab, LazyFallback } from '../../router';

const InsightsRoute: React.FC = () => {
    const { players } = useDashboardContext();
    return (
        <ErrorBoundary name="Insights">
            <Suspense fallback={<LazyFallback />}>
                <LazyInsightsTab players={players} />
            </Suspense>
        </ErrorBoundary>
    );
};

export default InsightsRoute;
