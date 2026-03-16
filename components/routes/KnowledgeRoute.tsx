import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { LazyKnowledgeTab, LazyFallback } from '../../router';
import { useDashboardContext } from '../DashboardLayout';

const KnowledgeRoute: React.FC = () => {
    const { user } = useDashboardContext();
    return (
        <ErrorBoundary name="Pathways">
            <Suspense fallback={<LazyFallback />}>
                <LazyKnowledgeTab user={user} />
            </Suspense>
        </ErrorBoundary>
    );
};

export default KnowledgeRoute;
