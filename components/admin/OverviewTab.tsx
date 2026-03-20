import React from 'react';
import { Users, Activity, AlertCircle, TrendingUp, Globe, FileText } from 'lucide-react';

interface OverviewTabProps {
    scoutsLoading: boolean;
    scoutsCount: number;
    playersCount: number;
    pendingEventsCount: number;
    totalValue: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    scoutsLoading,
    scoutsCount,
    playersCount,
    pendingEventsCount,
    totalValue,
}) => (
    <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <Users size={24} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{scoutsLoading ? '...' : scoutsCount}</div>
                <div className="text-sm text-gray-500">Active Scouts</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                        <Activity size={24} />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{playersCount}</div>
                <div className="text-sm text-gray-500">Players in Pipeline</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                        <AlertCircle size={24} />
                    </div>
                    {pendingEventsCount > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded animate-pulse">{pendingEventsCount} New</span>}
                </div>
                <div className="text-3xl font-bold text-gray-900">{pendingEventsCount}</div>
                <div className="text-sm text-gray-500">Pending Approvals</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-50 rounded-lg text-green-600">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">${(totalValue / 1000).toFixed(0)}k</div>
                <div className="text-sm text-gray-500">Placement Value (YTD)</div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Live Network Feed</h3>
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Activity size={32} className="mb-3 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear here as scouts work</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">HQ Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                        <Globe size={24} className="text-gray-400 group-hover:text-blue-500 mb-2"/>
                        <div className="text-sm font-bold text-gray-700 group-hover:text-blue-600">Create Global Event</div>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group">
                        <FileText size={24} className="text-gray-400 group-hover:text-green-500 mb-2"/>
                        <div className="text-sm font-bold text-gray-700 group-hover:text-green-600">Export Annual Report</div>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group">
                        <Users size={24} className="text-gray-400 group-hover:text-purple-500 mb-2"/>
                        <div className="text-sm font-bold text-gray-700 group-hover:text-purple-600">Invite New Scouts</div>
                    </button>
                    <button className="p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all text-left group">
                        <AlertCircle size={24} className="text-gray-400 group-hover:text-red-500 mb-2"/>
                        <div className="text-sm font-bold text-gray-700 group-hover:text-red-600">System Alerts</div>
                    </button>
                </div>
            </div>
        </div>
    </div>
);
