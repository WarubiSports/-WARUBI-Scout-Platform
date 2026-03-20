import React from 'react';
import { CheckCircle, Calendar, Check } from 'lucide-react';
import { ScoutingEvent } from '../../types';
import type { Scout } from '../../lib/database.types';

interface ApprovalsTabProps {
    pendingEvents: ScoutingEvent[];
    scouts: Scout[];
    approveEvent: (event: ScoutingEvent) => void;
    rejectEvent: (event: ScoutingEvent) => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
    pendingEvents,
    scouts,
    approveEvent,
    rejectEvent,
}) => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-900">Event Requests</h2>

        {pendingEvents.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500">No pending event approvals in the queue.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {pendingEvents.map(evt => (
                    <div key={evt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded uppercase">Pending Review</span>
                                {evt.scoutId && <span className="text-sm text-gray-500">Submitted by {scouts.find(s => s.id === evt.scoutId)?.name || 'Scout'}</span>}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{evt.title}</h3>
                            <div className="flex gap-4 text-sm text-gray-600 mb-4">
                                <span className="flex items-center gap-1"><Calendar size={14}/> {evt.date}</span>
                                <span>•</span>
                                <span>{evt.location}</span>
                                <span>•</span>
                                <span>{evt.type}</span>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">AI Marketing Plan Preview</h4>
                                <p className="text-sm text-gray-600 italic">"{evt.marketingCopy?.substring(0, 150)}..."</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 justify-center border-l border-gray-100 pl-6 w-48">
                            <button
                                onClick={() => approveEvent(evt)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={18} /> Approve
                            </button>
                            <button
                                onClick={() => rejectEvent(evt)}
                                className="w-full bg-white hover:bg-red-50 text-red-600 border border-gray-200 font-bold py-2 rounded-lg transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);
