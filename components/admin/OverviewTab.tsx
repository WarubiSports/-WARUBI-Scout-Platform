import React, { useEffect, useState } from 'react';
import { Users, Activity, AlertCircle, TrendingUp, Globe, FileText, ArrowRight } from 'lucide-react';
import { supabaseRest } from '../../lib/supabase';

interface StatusChange {
    id: string;
    prospect_id: string;
    scout_id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
    player_name?: string;
    scout_name?: string;
}

interface OverviewTabProps {
    scoutsLoading: boolean;
    scoutsCount: number;
    playersCount: number;
    pendingEventsCount: number;
    totalValue: number;
}

const STATUS_LABELS: Record<string, string> = {
    lead: 'Lead',
    contact_requested: 'Contact Requested',
    request_trial: 'Request Trial',
    send_contract: 'Offered',
    interested: 'Request Trial',
    offered: 'Offered',
    placed: 'Placed',
    archived: 'Archived',
};

const STATUS_COLORS: Record<string, string> = {
    lead: 'text-gray-500',
    contact_requested: 'text-cyan-600',
    request_trial: 'text-blue-600',
    send_contract: 'text-amber-600',
    interested: 'text-blue-600',
    offered: 'text-amber-600',
    placed: 'text-green-600',
    archived: 'text-gray-400',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    scoutsLoading,
    scoutsCount,
    playersCount,
    pendingEventsCount,
    totalValue,
}) => {
    const [feed, setFeed] = useState<StatusChange[]>([]);
    const [feedLoading, setFeedLoading] = useState(true);

    useEffect(() => {
        const loadFeed = async () => {
            const { data } = await supabaseRest.select<any>(
                'prospect_status_history',
                'select=id,prospect_id,scout_id,old_status,new_status,changed_at&order=changed_at.desc&limit=15'
            );
            if (!data || data.length === 0) { setFeedLoading(false); return; }

            const scoutIds = [...new Set(data.map((d: any) => d.scout_id))];
            const prospectIds = [...new Set(data.map((d: any) => d.prospect_id))];

            const [scoutsRes, prospectsRes] = await Promise.all([
                supabaseRest.select<any>('scouts', `select=id,name&id=in.(${scoutIds.join(',')})`),
                supabaseRest.select<any>('scout_prospects', `select=id,name&id=in.(${prospectIds.join(',')})`),
            ]);

            const scoutMap = new Map((scoutsRes.data || []).map((s: any) => [s.id, s.name]));
            const playerMap = new Map((prospectsRes.data || []).map((p: any) => [p.id, p.name]));

            setFeed(data.map((d: any) => ({
                ...d,
                scout_name: scoutMap.get(d.scout_id) || 'Unknown Scout',
                player_name: playerMap.get(d.prospect_id) || 'Unknown Player',
            })));
            setFeedLoading(false);
        };
        loadFeed();
    }, []);

    return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Users size={24} /></div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{scoutsLoading ? '...' : scoutsCount}</div>
                <div className="text-sm text-gray-500">Active Scouts</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Activity size={24} /></div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{playersCount}</div>
                <div className="text-sm text-gray-500">Players in Pipeline</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><AlertCircle size={24} /></div>
                    {pendingEventsCount > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded animate-pulse">{pendingEventsCount} New</span>}
                </div>
                <div className="text-3xl font-bold text-gray-900">{pendingEventsCount}</div>
                <div className="text-sm text-gray-500">Pending Approvals</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-50 rounded-lg text-green-600"><TrendingUp size={24} /></div>
                </div>
                <div className="text-3xl font-bold text-gray-900">${(totalValue / 1000).toFixed(0)}k</div>
                <div className="text-sm text-gray-500">Placement Value (YTD)</div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Live Network Feed</h3>
                {feedLoading ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                        <Activity size={20} className="animate-spin mr-2" />
                        <span className="text-sm">Loading...</span>
                    </div>
                ) : feed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Activity size={32} className="mb-3 opacity-50" />
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs mt-1">Activity will appear here as scouts move players through the pipeline</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {feed.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                                    {(item.scout_name || '?').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">
                                        <span className="font-bold">{item.scout_name}</span>
                                        {' moved '}
                                        <span className="font-bold">{item.player_name}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs mt-0.5">
                                        <span className={STATUS_COLORS[item.old_status || 'lead']}>{STATUS_LABELS[item.old_status || 'lead'] || item.old_status || '—'}</span>
                                        <ArrowRight size={10} className="text-gray-400" />
                                        <span className={`font-bold ${STATUS_COLORS[item.new_status]}`}>{STATUS_LABELS[item.new_status] || item.new_status}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(item.changed_at)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
};
