import { lazy } from 'react';

// Lazy-loaded route components
export const LazyAdminDashboard = lazy(() => import('./components/AdminDashboard'));
export const LazyEventHub = lazy(() => import('./components/EventHub'));
export const LazyOutreachTab = lazy(() => import('./components/OutreachTab'));
export const LazyMyBusinessTab = lazy(() => import('./components/MyBusinessTab'));

export const LazyFallback = () => (
    <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm font-bold uppercase tracking-wider animate-pulse">Loading...</div>
    </div>
);
