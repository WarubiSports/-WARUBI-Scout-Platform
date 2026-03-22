import React, { useState, useEffect, memo } from 'react';
import { ScoutingEvent, UserProfile, EventStatus } from '../types';
import { generateEventPlan } from '../services/geminiService';
import { haptic, handleMobileFocus } from '../hooks/useMobileFeatures';
import { parseEventType } from '../lib/guards';
import { useEventAttendees, AttendeeWithScout } from '../hooks/useEventAttendees';
import { supabaseRest } from '../lib/supabase';
import {
  Calendar, MapPin, Sparkles, Plus, Copy, CheckCircle,
  Share2, Users, FileText, CheckSquare, Loader2, ArrowRight,
  ClipboardList, X, ShieldCheck, Lock, Eye,
  HelpCircle, Check, QrCode, ChevronRight, Navigation, History, CalendarPlus, Ticket, Clock, Camera, Edit3, Timer, ExternalLink, StickyNote, Megaphone, Upload, Send, Mail
} from 'lucide-react';

import type { Player } from '../types';

interface EventHubProps {
  events: ScoutingEvent[];
  user: UserProfile;
  players?: Player[];
  onAddEvent: (event: ScoutingEvent) => void;
  onUpdateEvent: (event: ScoutingEvent) => void;
  onScanRoster?: (event: ScoutingEvent) => void;
}

// --- EXTRACTED COMPONENTS ---

const StatusPill = ({ status }: { status: EventStatus }) => {
    const styles: Record<string, string> = {
        'Draft': 'bg-gray-700 text-gray-300 border-gray-600',
        'Pending Approval': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
        'Approved': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        'Published': 'bg-green-500/20 text-green-400 border-green-500/50',
        'Completed': 'bg-gray-800 text-gray-500 border-gray-700',
        'Rejected': 'bg-red-500/20 text-red-400 border-red-500/50',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${styles[status] || styles['Draft']}`}>
            {status}
        </span>
    );
};

// Pre-written share messages for WhatsApp, Instagram, Email
const ShareMessages = ({ event, scoutId, copyToClipboard, copied }: { event: ScoutingEvent; scoutId?: string; copyToClipboard: (text: string, key: string) => void; copied: string | null }) => {
    const [expanded, setExpanded] = useState(false)
    const link = `https://showcase-coordinator.vercel.app/event/${event.showcaseSlug}${scoutId ? `?ref=${scoutId}` : ''}`
    const dateStr = event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

    const whatsapp = `Hey! 👋 There's a ${event.type} coming up — *${event.title}* on ${dateStr} in ${event.location}. College coaches will be there scouting players. Register here: ${link}`
    const instagram = `🔥 ${event.title}\n📍 ${event.location}\n📅 ${dateStr}\n\nCollege coaches scouting live. Limited spots.\n\nRegister → link in bio or DM me\n${link}`
    const email = `Hi,\n\nI wanted to share an upcoming event that could be a great opportunity: ${event.title} on ${dateStr} in ${event.location}.\n\nCollege coaches will be attending to scout players. You can register here:\n${link}\n\nLet me know if you have questions!`

    const messages = [
        { key: 'wa', label: 'WhatsApp', text: whatsapp },
        { key: 'ig', label: 'Instagram', text: instagram },
        { key: 'em', label: 'Email', text: email },
    ]

    return (
        <div className="bg-scout-900 rounded-lg border border-scout-700 overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full p-3 flex items-center justify-between hover:bg-scout-800/50 transition-colors">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase">Share Templates</span>
                </div>
                <ChevronRight size={14} className={`text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
            {expanded && (
                <div className="border-t border-scout-700 divide-y divide-scout-800">
                    {messages.map(m => (
                        <div key={m.key} className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-400">{m.label}</span>
                                <button onClick={() => copyToClipboard(m.text, m.key)} className="text-xs text-scout-accent hover:text-white transition-colors flex items-center gap-1">
                                    {copied === m.key ? <><CheckCircle size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-500 whitespace-pre-line line-clamp-3">{m.text}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Shows player registration count + expandable list from showcase_players
interface RegPlayer { id: string; name: string; position: string | null; club: string | null; registered_at: string | null; referred_by_scout_id: string | null }
const RegistrationCount = ({ showcaseEventId, scoutId }: { showcaseEventId: string; scoutId?: string }) => {
    const [players, setPlayers] = useState<RegPlayer[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)
    const myReferrals = scoutId ? players.filter(r => r.referred_by_scout_id === scoutId).length : 0

    useEffect(() => {
        supabaseRest.select<RegPlayer>('showcase_players', `event_id=eq.${showcaseEventId}&select=id,name,position,club,registered_at,referred_by_scout_id&order=registered_at.desc`).then(
            (res: { data: RegPlayer[] | null }) => {
                setPlayers(res.data || [])
                setLoading(false)
            }
        )
    }, [showcaseEventId])

    if (loading) return null
    return (
        <div className="bg-scout-900 rounded-lg border border-scout-700 overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full p-3 flex items-center justify-between hover:bg-scout-800/50 transition-colors">
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-scout-accent" />
                    <span className="text-xs font-bold text-gray-400 uppercase">Registrations</span>
                </div>
                <div className="flex items-center gap-2">
                    {myReferrals > 0 && <span className="text-[10px] font-bold text-scout-accent bg-scout-accent/10 px-2 py-0.5 rounded-full">{myReferrals} yours</span>}
                    <span className="text-lg font-bold text-white">{players.length}</span>
                    <ChevronRight size={14} className={`text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </button>
            {expanded && players.length > 0 && (
                <div className="border-t border-scout-700 max-h-48 overflow-y-auto">
                    {players.map(p => (
                        <div key={p.id} className={`px-3 py-2 flex items-center justify-between text-sm border-b border-scout-800 last:border-0 ${p.referred_by_scout_id === scoutId ? 'bg-scout-accent/5' : ''}`}>
                            <div>
                                <span className="text-white font-medium">{p.name}</span>
                                {p.position && <span className="text-gray-500 ml-2 text-xs">{p.position}</span>}
                            </div>
                            <span className="text-gray-500 text-xs">{p.club || ''}</span>
                        </div>
                    ))}
                </div>
            )}
            {expanded && players.length === 0 && (
                <div className="border-t border-scout-700 p-4 text-center text-xs text-gray-500">No registrations yet</div>
            )}
        </div>
    )
}

const AttendancePrepModal = ({ event, onCancel, onConfirm }: { event: ScoutingEvent, onCancel: () => void, onConfirm: () => void }) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-scout-800 w-full max-w-md rounded-2xl border border-scout-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-gradient-to-br from-scout-900 to-scout-800 border-b border-scout-700 text-center">
                <div className="w-12 h-12 bg-scout-accent/20 rounded-full flex items-center justify-center text-scout-accent mb-4 border border-scout-accent/30 mx-auto">
                    <CheckCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Confirm Attendance</h3>
                <p className="text-gray-400 text-sm mt-1">Make the most of {event.title}.</p>
            </div>

            <div className="p-6 space-y-4 bg-scout-800">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scout Action Checklist</h4>
                <div className="flex gap-4 items-start group">
                    <div className="mt-1 p-2 bg-scout-900 rounded-lg border border-scout-700 text-blue-400 group-hover:border-blue-500/50 transition-colors">
                        <ClipboardList size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Get the Roster</h4>
                        <p className="text-xs text-gray-400 leading-snug">Do you have the player list with jersey numbers and contact info?</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start group">
                    <div className="mt-1 p-2 bg-scout-900 rounded-lg border border-scout-700 text-scout-highlight group-hover:border-scout-highlight/50 transition-colors">
                        <QrCode size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Prepare Assessment Tool</h4>
                        <p className="text-xs text-gray-400 leading-snug">Have your QR code ready for players to scan instantly.</p>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-scout-900 flex gap-3 border-t border-scout-700">
                <button type="button" onClick={onCancel} className="flex-1 py-3 text-gray-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
                <button
                    type="button"
                    onClick={() => {
                        if (typeof onConfirm !== 'function') {
                            alert('onConfirm is not a function!');
                            return;
                        }
                        onConfirm();
                    }}
                    className="flex-[2] bg-scout-accent hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    Got it, Add to Schedule
                </button>
            </div>
        </div>
    </div>
);

const HostGuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
       <div className="bg-scout-800 w-full max-w-2xl rounded-2xl border border-scout-700 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
           <div className="p-4 border-b border-scout-700 flex justify-between items-center bg-scout-900">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <HelpCircle size={20} className="text-scout-accent"/> Host Guide & FAQ
               </h2>
               <button onClick={onClose} className="text-gray-400 hover:text-white">
                   <X size={24} />
               </button>
           </div>
           <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
               <section>
                   <h3 className="text-lg font-bold text-white mb-2">Why Host an Event?</h3>
                   <p className="text-gray-400 text-sm">
                       Events are the most effective way to identify new talent and build your reputation as a scout. 
                       Hosted ID days allow you to see players in person, verify their data, and build relationships with families.
                   </p>
               </section>
               <div className="p-4 border-t border-scout-700 bg-scout-900 flex justify-end">
                   <button 
                       onClick={onClose}
                       className="bg-white hover:bg-gray-100 text-scout-900 font-bold py-2 px-6 rounded-lg transition-colors"
                   >
                       Got it
                   </button>
               </div>
           </div>
       </div>
    </div>
);

// --- NEW COMPONENT: SCOUT LEDGER ROW ---
const EventRow: React.FC<{ event: ScoutingEvent; isOpportunity?: boolean; isAdded?: boolean; onClick: (e: ScoutingEvent) => void; onAdd?: (e: ScoutingEvent) => void; onScan?: (e: ScoutingEvent) => void }> = ({ event, isOpportunity, isAdded, onClick, onAdd, onScan }) => {
    const isHost = event.role === 'HOST' || event.isMine;
    // Parse date parts directly to avoid timezone issues
    const [year, month, day] = event.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const endDateObj = event.endDate ? (() => {
        const [ey, em, ed] = event.endDate.split('-').map(Number);
        return new Date(ey, em - 1, ed);
    })() : null;
    const isMultiDay = endDateObj && event.endDate !== event.date;

    return (
        <div
            onClick={() => onClick(event)}
            className="group flex items-center bg-scout-800 hover:bg-scout-700/50 border border-scout-700 rounded-lg overflow-hidden transition-all cursor-pointer shadow-sm mb-2"
        >
            {/* Left Status Bar */}
            <div className={`w-1.5 self-stretch ${isHost ? 'bg-emerald-500' : (isAdded || !isOpportunity) ? 'bg-blue-500' : 'bg-gray-600'}`}></div>

            {/* Date Block */}
            <div className="flex flex-col items-center justify-center px-4 py-2 min-w-[70px] border-r border-scout-700/50">
                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">{dateObj.toLocaleString('default', { month: 'short' })}</span>
                {isMultiDay ? (
                    <span className="text-lg font-black text-white leading-none">{day}-{endDateObj!.getDate()}</span>
                ) : (
                    <span className="text-xl font-black text-white leading-none">{day}</span>
                )}
            </div>

            {/* Event Info */}
            <div className="flex-1 px-4 py-2 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-scout-accent transition-colors">{event.title}</h3>
                    <StatusPill status={event.status} />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><MapPin size={10} className="text-gray-600"/> {event.location}</span>
                    <span className="hidden md:flex items-center gap-1"><Ticket size={10} className="text-gray-600"/> {event.type}</span>
                </div>
            </div>

            {/* Proximity Actions */}
            <div className="px-4 py-2 shrink-0 flex items-center gap-2">
                {!isOpportunity && isAdded && onScan && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); onScan(event); }}
                        className="p-2 bg-scout-900 border border-scout-700 rounded-full text-scout-highlight hover:text-white hover:border-scout-highlight/50 transition-all shadow-sm active:scale-90"
                        title="Scan Paper Roster"
                     >
                        <Camera size={16} />
                     </button>
                )}

                {isOpportunity ? (
                    isAdded ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-500/20">
                            <CheckCircle size={14}/> Scheduled
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAdd) {
                                    onAdd(event);
                                }
                            }}
                            className="bg-scout-accent hover:bg-emerald-600 text-scout-900 font-bold text-xs px-4 py-1.5 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-1"
                        >
                            <Plus size={14} /> Add to Schedule
                        </button>
                    )
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-white transition-colors">
                        <span className="text-[10px] font-bold uppercase hidden md:inline">View Details</span>
                        <ChevronRight size={16} />
                    </div>
                )}
            </div>
        </div>
    );
};

const CreateEventForm = ({ formData, setFormData, loading, handleCreate, onCancel }: any) => (
    <div className="max-w-2xl mx-auto animate-fade-in">
        <button onClick={onCancel} className="mb-6 text-gray-400 hover:text-white flex items-center gap-1 text-sm">
            <ArrowRight size={16} className="rotate-180" /> Back to Calendar
        </button>
        
        <div className="bg-scout-800 rounded-xl border border-scout-700 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-scout-700 bg-scout-900/50">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CalendarPlus size={24} className="text-scout-accent" /> Add New Event
                </h2>
                <p className="text-gray-400 text-sm mt-1">Host your own event or log one you are attending.</p>
            </div>
            
            <div className="p-8 space-y-6">
                {/* Mode Toggle */}
                <div className="bg-scout-900 p-1 rounded-lg border border-scout-700 flex">
                    <button 
                        onClick={() => setFormData((prev:any) => ({ ...prev, isHosting: false }))}
                        className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${!formData.isHosting ? 'bg-scout-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        I'm Attending
                    </button>
                    <button 
                        onClick={() => setFormData((prev:any) => ({ ...prev, isHosting: true }))}
                        className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${formData.isHosting ? 'bg-scout-accent text-scout-900 shadow' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        I'm Hosting
                    </button>
                </div>

                {formData.isHosting && (
                    <div className="bg-scout-accent/10 border border-scout-accent/20 p-3 rounded-lg text-xs text-scout-accent flex items-start gap-2">
                        <Sparkles size={16} className="shrink-0 mt-0.5" />
                        <span>Host Mode active: AI will generate a marketing plan, agenda, and checklist for you.</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label>
                    <input
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder={formData.isHosting ? "e.g. Winter Talent ID Showcase" : "e.g. State Cup Final"}
                        onFocus={handleMobileFocus}
                        className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                    />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date <span className="text-gray-600 normal-case">(optional)</span></label>
                        <input
                            type="date"
                            value={formData.endDate || ''}
                            onChange={e => setFormData({...formData, endDate: e.target.value})}
                            min={formData.date}
                            className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                        <input
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            placeholder="City, State or Field Name"
                            onFocus={handleMobileFocus}
                            className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Type</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value})}
                            className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                        >
                            <option>ID Day</option>
                            <option>Showcase</option>
                            <option>Camp</option>
                            <option>Tournament</option>
                            <option>League Match</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{formData.isHosting ? 'Player Fee' : 'Scout Fee / Cost'}</label>
                        <input
                            value={formData.fee}
                            onChange={e => setFormData({...formData, fee: e.target.value})}
                            placeholder="e.g. Free, $50, €20"
                            className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Link <span className="text-gray-600 normal-case">(optional)</span></label>
                    <input
                        value={formData.link || ''}
                        onChange={e => setFormData({...formData, link: e.target.value})}
                        placeholder="https://example.com/registration"
                        onFocus={handleMobileFocus}
                        className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes <span className="text-gray-600 normal-case">(optional)</span></label>
                    <textarea
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="Add any additional notes about this event..."
                        rows={3}
                        onFocus={handleMobileFocus}
                        className="w-full bg-scout-900 border border-scout-600 rounded-lg p-3 text-white focus:border-scout-accent outline-none resize-none"
                    />
                </div>

                <div className="pt-4 border-t border-scout-700/50">
                    <button 
                        onClick={handleCreate}
                        disabled={loading || !formData.title}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${formData.isHosting ? 'bg-scout-accent hover:bg-emerald-600 text-scout-900' : 'bg-scout-700 hover:bg-scout-600 text-white'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : formData.isHosting ? <Sparkles size={18} /> : <Calendar size={18} />}
                        {loading ? 'Processing...' : formData.isHosting ? 'Create Event & Generate Kit' : 'Add to Schedule'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const DetailView = ({ event, events, isMobile, onClose, onUpdateEvent, initiateAttendance, copyToClipboard, copied, onSubmitForApproval, onPublishEvent, attendees, attendeeCount, isUserAttending, onRegisterAttendance, onCancelAttendance, currentScoutId }: any) => {
    const isMine = event.role === 'HOST' || event.isMine;
    const isAttending = isUserAttending || isMine || events.some((e: any) => e.id === event.id || (e.title === event.title && e.date === event.date));
    const [mobileTab, setMobileTab] = useState<'overview' | 'agenda' | 'tasks'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        title: event.title,
        date: event.date,
        endDate: event.endDate || '',
        location: event.location,
        type: event.type,
        fee: event.fee,
        link: event.link || '',
        notes: event.notes || ''
    });

    const handleSaveEdit = () => {
        onUpdateEvent({ ...event, ...editData });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditData({
            title: event.title,
            date: event.date,
            endDate: event.endDate || '',
            location: event.location,
            type: event.type,
            fee: event.fee,
            link: event.link || '',
            notes: event.notes || ''
        });
        setIsEditing(false);
    };

    const toggleChecklist = (index: number) => {
        if (!event.checklist) return;
        const newChecklist = [...event.checklist];
        newChecklist[index].completed = !newChecklist[index].completed;
        onUpdateEvent({ ...event, checklist: newChecklist });
    };

    if (!isMobile) {
        return (
          <div className="h-full flex flex-col animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                  <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                      <ArrowRight size={16} className="rotate-180" /> Back to Schedule
                  </button>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-300 font-medium">{event.title}</span>
              </div>

              <div className="bg-scout-800 border border-scout-700 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                  <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-scout-700 bg-scout-800/50 flex flex-col justify-between">
                      <div>
                          <div className="mb-6">
                              <div className="flex justify-between items-start">
                                  <StatusPill status={event.status} />
                                  <div className="flex items-center gap-2">
                                      {!isMine && isAttending && (
                                          <span className="text-[10px] font-bold bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1">
                                              <Check size={10}/> Attending
                                          </span>
                                      )}
                                      {(isMine || isAttending) && !isEditing && (
                                          <button
                                              onClick={() => setIsEditing(true)}
                                              className="text-[10px] font-bold bg-scout-700 text-gray-300 px-2 py-1 rounded border border-scout-600 hover:bg-scout-600 flex items-center gap-1"
                                          >
                                              <Edit3 size={10}/> Edit
                                          </button>
                                      )}
                                  </div>
                              </div>
                              {isEditing ? (
                                  <div className="mt-3 space-y-3">
                                      <input
                                          value={editData.title}
                                          onChange={e => setEditData({...editData, title: e.target.value})}
                                          className="w-full bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-lg font-bold focus:border-scout-accent outline-none"
                                          placeholder="Event Title"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                          <input
                                              type="date"
                                              value={editData.date}
                                              onChange={e => setEditData({...editData, date: e.target.value})}
                                              className="bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none"
                                          />
                                          <input
                                              type="date"
                                              value={editData.endDate}
                                              onChange={e => setEditData({...editData, endDate: e.target.value})}
                                              className="bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none"
                                              placeholder="End Date"
                                          />
                                      </div>
                                      <input
                                          value={editData.location}
                                          onChange={e => setEditData({...editData, location: e.target.value})}
                                          className="w-full bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none"
                                          placeholder="Location"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                          <select
                                              value={editData.type}
                                              onChange={e => setEditData({...editData, type: e.target.value})}
                                              className="bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none"
                                          >
                                              <option value="ID Day">ID Day</option>
                                              <option value="Showcase">Showcase</option>
                                              <option value="Camp">Camp</option>
                                              <option value="Tournament">Tournament</option>
                                              <option value="League Match">League Match</option>
                                          </select>
                                          <input
                                              value={editData.fee}
                                              onChange={e => setEditData({...editData, fee: e.target.value})}
                                              className="bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none"
                                              placeholder="Fee (e.g. Free, $50)"
                                          />
                                      </div>
                                      <input
                                          value={editData.link}
                                          onChange={e => setEditData({...editData, link: e.target.value})}
                                          className="w-full bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none"
                                          placeholder="Event Link (https://...)"
                                      />
                                      <textarea
                                          value={editData.notes}
                                          onChange={e => setEditData({...editData, notes: e.target.value})}
                                          className="w-full bg-scout-900 border border-scout-600 rounded-lg px-3 py-2 text-white text-sm focus:border-scout-accent outline-none resize-none"
                                          placeholder="Notes..."
                                          rows={2}
                                      />
                                      <div className="flex gap-2 pt-2">
                                          <button
                                              onClick={handleSaveEdit}
                                              className="flex-1 bg-scout-accent hover:bg-emerald-600 text-scout-900 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                                          >
                                              <Check size={14}/> Save
                                          </button>
                                          <button
                                              onClick={handleCancelEdit}
                                              className="flex-1 bg-scout-700 hover:bg-scout-600 text-white font-bold py-2 rounded-lg text-sm"
                                          >
                                              Cancel
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <h2 className="text-2xl font-bold text-white mt-2 mb-1">{event.title}</h2>
                                      <div className="space-y-2 text-sm text-gray-400 mt-4">
                                          <div className="flex items-center gap-2"><Calendar size={14}/> {event.date}{event.endDate && event.endDate !== event.date ? ` - ${event.endDate}` : ''}</div>
                                          <div className="flex items-center gap-2"><MapPin size={14}/> {event.location}</div>
                                          <div className="flex items-center gap-2"><Sparkles size={14}/> {event.type} • {event.fee}</div>
                                      </div>
                                      {event.link && (
                                          <a
                                              href={event.link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="mt-4 w-full bg-scout-700 hover:bg-scout-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all border border-scout-600 text-sm"
                                          >
                                              <ExternalLink size={14}/> Open Event Link
                                          </a>
                                      )}
                                      {event.notes && (
                                          <div className="mt-4 p-3 bg-scout-900/50 rounded-lg border border-scout-700">
                                              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                                                  <StickyNote size={12}/> Notes
                                              </div>
                                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.notes}</p>
                                          </div>
                                      )}
                                  </>
                              )}
                          </div>

                          {isMine ? (
                              <div className="space-y-4">
                                  {event.status === 'Draft' && (
                                      <div className="bg-scout-900/50 p-4 rounded-lg border border-scout-700">
                                          <h4 className="text-white font-bold text-sm mb-2">Ready to go?</h4>
                                          <p className="text-xs text-gray-400 mb-4">Publish your event to create a registration page and start sharing it with players.</p>
                                          <button
                                              onClick={() => onPublishEvent(event)}
                                              className="w-full bg-scout-accent hover:bg-emerald-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg mb-2"
                                          >
                                              <Share2 size={18} /> Publish Event
                                          </button>
                                          <button
                                              onClick={() => onSubmitForApproval(event)}
                                              className="w-full bg-scout-700/50 hover:bg-scout-700 text-gray-400 text-sm py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                                          >
                                              <ShieldCheck size={14} /> Or submit for admin review first
                                          </button>
                                      </div>
                                  )}
                                  {event.status === 'Pending Approval' && (
                                      <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30">
                                          <h4 className="text-yellow-500 font-bold text-sm mb-2 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Under Review</h4>
                                          <p className="text-xs text-yellow-200/70">Your event proposal is under review. You'll be notified when approved.</p>
                                      </div>
                                  )}
                                  {event.status === 'Approved' && (
                                      <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                                          <h4 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2"><CheckCircle size={14}/> Approved!</h4>
                                          <p className="text-xs text-blue-200/70 mb-4">Your event is approved. Publish it to go live.</p>
                                          <button onClick={() => onPublishEvent(event)} className="w-full bg-scout-accent hover:bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"><Share2 size={18} /> Publish Event</button>
                                      </div>
                                  )}
                                  {event.status === 'Published' && (
                                      <div className="bg-scout-900 p-4 rounded-lg border border-scout-700">
                                          <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Registration Link</label>
                                          <div className="flex gap-2">
                                              {event.showcaseSlug ? (
                                                <>
                                                  <input readOnly value={`showcase-coordinator.vercel.app/event/${event.showcaseSlug}${currentScoutId ? `?ref=${currentScoutId}` : ''}`} className="bg-scout-800 text-scout-accent text-sm px-2 rounded border border-scout-600 w-full"/>
                                                  <button onClick={() => copyToClipboard(`https://showcase-coordinator.vercel.app/event/${event.showcaseSlug}${currentScoutId ? `?ref=${currentScoutId}` : ''}`, 'link')} className="p-2 bg-scout-700 hover:bg-scout-600 rounded text-white">{copied === 'link' ? <CheckCircle size={16}/> : <Copy size={16}/>}</button>
                                                </>
                                              ) : (
                                                <button onClick={() => onUpdateEvent({ ...event, status: 'Published' })} className="w-full bg-scout-accent/20 text-scout-accent text-sm font-bold py-2 px-3 rounded border border-scout-accent/30 hover:bg-scout-accent/30 transition-colors">
                                                  Retry Sync
                                                </button>
                                              )}
                                          </div>
                                      </div>
                                  )}
                                  {event.status === 'Published' && event.showcaseSlug && (
                                      <ShareMessages event={event} scoutId={currentScoutId} copyToClipboard={copyToClipboard} copied={copied} />
                                  )}
                                  {event.status === 'Published' && event.showcaseSlug && (
                                      <button
                                        onClick={() => setNetworkOutreachEvent(event)}
                                        className="w-full py-3 bg-scout-accent/10 border border-scout-accent/20 text-scout-accent rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-scout-accent/20 transition-all"
                                      >
                                        <Megaphone size={16} /> Let Your Network Know
                                      </button>
                                  )}
                                  {event.showcaseEventId && <RegistrationCount showcaseEventId={event.showcaseEventId} scoutId={currentScoutId} />}
                              </div>
                          ) : (
                              <div className="bg-scout-900/50 p-4 rounded-lg border border-scout-700">
                                  {!isUserAttending ? (
                                      <>
                                          <p className="text-xs text-gray-400 mb-4">Interested in scouting at this event?</p>
                                          <button onClick={onRegisterAttendance} className="w-full bg-scout-700 hover:bg-scout-600 text-white font-bold py-2 rounded-lg transition-all border border-scout-600 text-sm">Mark Attendance</button>
                                      </>
                                  ) : (
                                      <div className="text-center py-2">
                                          <div className="inline-block p-2 bg-green-500/10 rounded-full text-green-400 mb-2"><CheckCircle size={24} /></div>
                                          <p className="text-white font-bold text-sm">You&apos;re Attending</p>
                                          <button onClick={onCancelAttendance} className="text-xs text-gray-500 hover:text-red-400 mt-2 transition-colors">Cancel attendance</button>
                                      </div>
                                  )}
                              </div>
                          )}

                          {/* Scouts Attending */}
                          {attendeeCount > 0 && (
                              <div className="bg-scout-900/50 p-4 rounded-lg border border-scout-700 mt-4">
                                  <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                          <Users size={14} /> Scouts Attending
                                      </span>
                                      <span className="text-xs bg-scout-700 text-white px-2 py-0.5 rounded-full font-bold">{attendeeCount}</span>
                                  </div>
                                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                      {attendees?.map((a: any) => (
                                          <div key={a.id} className="flex items-center gap-2 text-sm">
                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                  a.scout_id === currentScoutId
                                                      ? 'bg-scout-accent text-white'
                                                      : 'bg-scout-700 text-gray-300'
                                              }`}>
                                                  {a.scout?.name?.charAt(0) || '?'}
                                              </div>
                                              <span className="text-gray-300">
                                                  {a.scout?.name || 'Unknown Scout'}
                                                  {a.scout_id === currentScoutId && <span className="text-scout-accent ml-1">(you)</span>}
                                              </span>
                                              {a.scout?.region && (
                                                  <span className="text-[10px] text-gray-500 ml-auto">{a.scout.region}</span>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      {isMine && (
                          <div className="grid grid-cols-1 gap-3 mt-6">
                              <div className="bg-scout-900 p-3 rounded border border-scout-700 text-center flex flex-col items-center justify-center">
                                  <Users size={20} className="text-gray-500 mb-1"/>
                                  <span className="text-[10px] text-gray-500 uppercase">View List</span>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="md:w-2/3 p-6 bg-scout-900 flex flex-col gap-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                      {isMine || isAttending ? (
                          <>
                              <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                      <ClipboardList className="text-scout-highlight" size={20} /> 
                                      {event.role === 'HOST' ? 'Event Kit' : 'Scout Mission'}
                                  </h3>
                                  {(event.status === 'Draft' || event.status === 'Pending Approval') && <span className="text-xs text-scout-highlight animate-pulse">Draft Preview</span>}
                              </div>

                              {event.role === 'HOST' ? (
                                  <div className="space-y-2">
                                      <div className="flex justify-between items-end">
                                          <label className="text-sm font-semibold text-gray-300 flex items-center gap-2"><FileText size={14}/> Marketing Blurb</label>
                                          {event.status === 'Published' && <button onClick={() => copyToClipboard(event.marketingCopy || '', 'marketing')} className="text-xs text-scout-accent hover:text-white flex items-center gap-1">{copied === 'marketing' ? <CheckCircle size={12}/> : <Copy size={12}/>} Copy Text</button>}
                                      </div>
                                      <textarea readOnly value={event.marketingCopy} className="w-full h-32 bg-scout-800 border border-scout-700 rounded-lg p-3 text-sm text-gray-300 resize-none focus:outline-none"/>
                                  </div>
                              ) : (
                                  <div className="bg-gradient-to-r from-scout-800 to-scout-900 border border-scout-700 rounded-lg p-4 mb-2">
                                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                          <ShieldCheck size={14} className="text-scout-accent"/> Core Objectives
                                      </h4>
                                      <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-scout-900/80 p-3 rounded-lg border border-scout-700 flex flex-col items-center text-center gap-2">
                                              <ClipboardList size={20} className="text-blue-400"/>
                                              <span className="text-[10px] font-bold text-gray-300 leading-tight">Get<br/>Roster</span>
                                          </div>
                                          <div className="bg-scout-900/80 p-3 rounded-lg border border-scout-700 flex flex-col items-center text-center gap-2">
                                              <QrCode size={20} className="text-white"/>
                                              <span className="text-[10px] font-bold text-gray-300 leading-tight">Show<br/>QR Code</span>
                                          </div>
                                          <div className="bg-scout-900/80 p-3 rounded-lg border border-scout-700 flex flex-col items-center text-center gap-2">
                                              <Users size={20} className="text-scout-highlight"/>
                                              <span className="text-[10px] font-bold text-gray-300 leading-tight">Ask<br/>Coaches</span>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              <div className="grid md:grid-cols-2 gap-6">
                                  <div>
                                      <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3"><Calendar size={14}/> Agenda</label>
                                      <ul className="space-y-2">
                                          {(event.agenda || []).map((item: string, i: number) => {
                                              const parts = item.split(' - ');
                                              const time = parts[0];
                                              // Remove time prefix from description (e.g., "09:30 AM: Registration" -> "Registration")
                                              const descPart = parts[1] || item;
                                              const description = descPart.replace(/^\d{1,2}:\d{2}\s*(AM|PM):?\s*/i, '');
                                              return (
                                                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                                      <span className="text-scout-accent font-mono text-xs mt-0.5">{time}</span>
                                                      <span>{description}</span>
                                                  </li>
                                              );
                                          })}
                                      </ul>
                                  </div>
                                  <div>
                                      <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2"><CheckSquare size={14}/> Scout Checklist</label>
                                      <ul className="space-y-2">
                                          {(event.checklist || []).map((item: any, i: number) => (
                                              <li key={i} onClick={() => toggleChecklist(i)} className="flex items-center gap-2 text-sm group cursor-pointer hover:bg-scout-800 p-1.5 rounded transition-colors">
                                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.completed ? 'bg-scout-accent border-scout-accent' : 'border-scout-600 group-hover:border-scout-accent'}`}>
                                                      {item.completed && <Check size={12} className="text-scout-900" />}
                                                  </div>
                                                  <span className={item.completed ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-white'}>{item.task}</span>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              </div>
                          </>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                              <Lock size={48} className="text-gray-600 mb-4" />
                              <h3 className="text-xl font-bold text-gray-400">Host Access Only</h3>
                              <p className="text-sm text-gray-500 max-w-sm mt-2">Marketing kits and admin tools are only available for the event host.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-scout-900">
            <div className="p-4 border-b border-scout-700 flex items-center gap-3">
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <ArrowRight size={24} className="rotate-180" />
                </button>
                <h2 className="text-lg font-bold text-white flex-1 truncate">{event.title}</h2>
                <StatusPill status={event.status} />
            </div>

            <div className="flex border-b border-scout-700 bg-scout-800/50">
                <button onClick={() => setMobileTab('overview')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${mobileTab === 'overview' ? 'text-scout-accent border-b-2 border-scout-accent' : 'text-gray-500'}`}>Overview</button>
                <button onClick={() => setMobileTab('agenda')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${mobileTab === 'agenda' ? 'text-scout-accent border-b-2 border-scout-accent' : 'text-gray-500'}`}>Run Sheet</button>
                <button onClick={() => setMobileTab('tasks')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${mobileTab === 'tasks' ? 'text-scout-accent border-b-2 border-scout-accent' : 'text-gray-500'}`}>Tasks</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
                {mobileTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-scout-800 rounded-xl p-4 border border-scout-700">
                            <div className="flex items-start gap-3 mb-4">
                                <MapPin size={20} className="text-scout-accent mt-1" />
                                <div>
                                    <h3 className="font-bold text-white text-lg">{event.location}</h3>
                                    <p className="text-gray-400 text-sm">{event.date}{event.endDate && event.endDate !== event.date ? ` - ${event.endDate}` : ''}</p>
                                </div>
                            </div>
                            <button className="w-full bg-scout-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                                <Navigation size={16} /> Open Maps
                            </button>
                        </div>

                        {isMine && (
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 text-center flex items-center justify-center">
                                    <button className="text-scout-accent text-xs font-bold flex flex-col items-center gap-1">
                                        <QrCode size={24} />
                                        Show Code
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Scouts Attending - Mobile */}
                        {attendeeCount > 0 && (
                            <div className="bg-scout-800 rounded-xl p-4 border border-scout-700">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                        <Users size={14} /> Scouts Attending
                                    </span>
                                    <span className="text-xs bg-scout-700 text-white px-2 py-0.5 rounded-full font-bold">{attendeeCount}</span>
                                </div>
                                <div className="space-y-2">
                                    {attendees?.map((a: any) => (
                                        <div key={a.id} className="flex items-center gap-2 text-sm">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                a.scout_id === currentScoutId
                                                    ? 'bg-scout-accent text-white'
                                                    : 'bg-scout-700 text-gray-300'
                                            }`}>
                                                {a.scout?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-gray-300">
                                                {a.scout?.name || 'Unknown Scout'}
                                                {a.scout_id === currentScoutId && <span className="text-scout-accent ml-1">(you)</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {mobileTab === 'agenda' && (
                    <div className="relative pl-6 space-y-6">
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-scout-700"></div>
                        {(event.agenda || []).map((item: string, i: number) => {
                            const parts = item.split(' - ');
                            const time = parts[0];
                            const descPart = parts[1] || item;
                            const description = descPart.replace(/^\d{1,2}:\d{2}\s*(AM|PM):?\s*/i, '');
                            return (
                                <div key={i} className="relative">
                                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-scout-accent border-2 border-scout-900"></div>
                                    <p className="text-scout-accent font-mono text-xs font-bold mb-1">{time}</p>
                                    <p className="text-white text-sm bg-scout-800 p-3 rounded-lg border border-scout-700 shadow-sm">{description}</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {mobileTab === 'tasks' && (
                    <div className="space-y-2">
                        {(event.checklist || []).map((item: any, i: number) => (
                            <div 
                                key={i} 
                                onClick={() => toggleChecklist(i)}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all active:scale-[0.98] ${item.completed ? 'bg-scout-900 border-scout-700 opacity-60' : 'bg-scout-800 border-scout-600'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${item.completed ? 'bg-scout-accent border-scout-accent' : 'border-gray-500'}`}>
                                    {item.completed && <Check size={16} className="text-scout-900" />}
                                </div>
                                <span className={`text-sm font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-white'}`}>{item.task}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 w-full bg-scout-800 border-t border-scout-700 p-4 pb-safe flex gap-3">
                {event.status === 'Published' && event.showcaseSlug && (
                    <button onClick={() => copyToClipboard(`https://showcase-coordinator.vercel.app/event/${event.showcaseSlug}${currentScoutId ? `?ref=${currentScoutId}` : ''}`, 'link')} className="flex-1 bg-scout-700 text-white font-bold py-3 rounded-xl">
                        {copied === 'link' ? 'Copied!' : 'Share Link'}
                    </button>
                )}
                <button className="flex-1 bg-scout-accent text-scout-900 font-bold py-3 rounded-xl shadow-lg">
                    Check In
                </button>
            </div>
        </div>
    );
};

// --- EVENT NETWORK OUTREACH MODAL ---

const MAILTO_BATCH_SIZE = 30;

const EventNetworkOutreach = ({ event, scoutName, scoutId, players, onClose }: {
  event: ScoutingEvent;
  scoutName: string;
  scoutId?: string;
  players: Player[];
  onClose: () => void;
}) => {
  const [audience, setAudience] = useState<'database' | 'custom' | null>(null);
  const [customEmails, setCustomEmails] = useState('');
  const [bodyCopied, setBodyCopied] = useState(false);
  const [batchesSent, setBatchesSent] = useState(0);

  const regLink = `https://showcase-coordinator.vercel.app/event/${event.showcaseSlug}${scoutId ? `?ref=${scoutId}` : ''}`;
  const dateStr = event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  const subject = `${event.title} — ${dateStr}`;
  const emailBody = `Hi,\n\nI wanted to let you know about an upcoming event:\n\n${event.title}\n📍 ${event.location}\n📅 ${dateStr}${event.fee ? `\n💰 ${event.fee}` : ''}\n\n${event.notes || event.marketingCopy || 'College coaches and scouts will be attending.'}\n\nRegister here:\n${regLink}\n\nSpots are limited — register soon.\n\nBest,\n${scoutName}`;

  const dbRecipients = players.filter(p => p.email).map(p => p.email!);
  const customRecipients = customEmails.trim()
    ? customEmails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes('@'))
    : [];
  const recipients = audience === 'database' ? dbRecipients : customRecipients;

  const batches: string[][] = [];
  for (let i = 0; i < recipients.length; i += MAILTO_BATCH_SIZE) {
    batches.push(recipients.slice(i, i + MAILTO_BATCH_SIZE));
  }

  const openMailto = (bccList: string[], batchIndex: number) => {
    const mailto = `mailto:?bcc=${encodeURIComponent(bccList.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    setBatchesSent(prev => Math.max(prev, batchIndex + 1));
  };

  const copyBody = () => {
    navigator.clipboard.writeText(emailBody);
    setBodyCopied(true);
    setTimeout(() => setBodyCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-scout-700">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Let Your Network Know</h2>
          <button onClick={onClose} className="p-2 hover:bg-scout-700 rounded-xl transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {!audience && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Send the registration link for <strong className="text-white">{event.title}</strong> via your own email.</p>
              <button onClick={() => setAudience('database')} className="w-full bg-scout-900 border border-scout-700 rounded-xl p-5 text-left hover:border-scout-accent/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-scout-accent/10 rounded-xl border border-scout-accent/20 shrink-0"><Users size={22} className="text-scout-accent" /></div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">My Players Database</p>
                    <p className="text-xs text-gray-500 mt-1">{dbRecipients.length} players with email addresses</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-scout-accent transition-colors" />
                </div>
              </button>
              <button onClick={() => setAudience('custom')} className="w-full bg-scout-900 border border-scout-700 rounded-xl p-5 text-left hover:border-scout-accent/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shrink-0"><Upload size={22} className="text-blue-400" /></div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Custom Email List</p>
                    <p className="text-xs text-gray-500 mt-1">Paste email addresses for coaches, parents, agents</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
              </button>
            </div>
          )}

          {audience && (
            <div className="space-y-5">
              {audience === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Addresses</label>
                  <textarea value={customEmails} onChange={e => setCustomEmails(e.target.value)} placeholder={"coach@club.com, parent@email.com\nagent@agency.com"} rows={4} className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors resize-none font-mono" />
                  <p className="text-[10px] text-gray-600">Separate with commas, semicolons, or new lines. {customRecipients.length} valid emails found.</p>
                </div>
              )}
              {audience === 'database' && (
                <div className="bg-scout-900/50 border border-scout-700 rounded-xl p-4 flex items-center gap-3">
                  <Mail size={18} className="text-scout-accent shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{dbRecipients.length} recipients</p>
                    <p className="text-xs text-gray-500">All players with email addresses</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Message Preview</label>
                  <button onClick={copyBody} className="text-[10px] font-bold text-gray-500 hover:text-scout-accent flex items-center gap-1 transition-colors">
                    {bodyCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                </div>
                <div className="bg-scout-900 border border-scout-700 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">{emailBody}</div>
              </div>

              <div className="bg-scout-900/50 border border-scout-700 rounded-xl p-3">
                <p className="text-xs text-gray-400">Opens in your mail app — sends from <strong className="text-white">your own email</strong>.</p>
              </div>

              <div className="space-y-3">
                {recipients.length === 0 && <p className="text-sm text-gray-500 text-center py-2">No recipients yet</p>}
                {batches.length === 1 && (
                  <button onClick={() => openMailto(batches[0], 0)} className="w-full py-3.5 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all">
                    <Send size={16} /> Open Email — {recipients.length} {recipients.length === 1 ? 'Recipient' : 'Recipients'}
                  </button>
                )}
                {batches.length > 1 && (
                  <>
                    <p className="text-xs text-gray-500">{recipients.length} recipients in {batches.length} batches.</p>
                    {batches.map((batch, i) => (
                      <button key={i} onClick={() => openMailto(batch, i)} className={`w-full py-3 rounded-xl font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all ${i < batchesSent ? 'bg-scout-accent/10 text-scout-accent border border-scout-accent/30' : 'bg-scout-accent text-scout-900 shadow-glow hover:bg-emerald-400'}`}>
                        {i < batchesSent ? <><CheckCircle size={16} /> Batch {i + 1} Opened</> : <><Send size={16} /> Send Batch {i + 1} — {batch.length} Recipients</>}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <button onClick={() => { setAudience(null); setBatchesSent(0); }} className="w-full py-2.5 text-gray-500 text-sm font-bold hover:text-gray-300 transition-colors">&larr; Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const EventHub: React.FC<EventHubProps> = ({ events, user, players = [], onAddEvent, onUpdateEvent, onScanRoster }) => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedEvent, setSelectedEvent] = useState<ScoutingEvent | null>(null);
  const [attendingEvent, setAttendingEvent] = useState<ScoutingEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [networkOutreachEvent, setNetworkOutreachEvent] = useState<ScoutingEvent | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Attendees management
  const {
    loadEventAttendees,
    isAttending: checkIsAttending,
    getAttendees,
    getAttendeeCount,
    registerAttendance,
    cancelAttendance,
  } = useEventAttendees(user.scoutId);

  // Wrapper to sync selectedEvent when an event is updated
  const handleUpdateEvent = (updatedEvent: ScoutingEvent) => {
    onUpdateEvent(updatedEvent);
    // If the updated event is currently selected, sync the local state
    if (selectedEvent && selectedEvent.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  };

  // Keep selectedEvent in sync with the events prop (e.g. after showcase sync adds showcaseSlug)
  useEffect(() => {
    if (selectedEvent) {
      const updated = events.find(e => e.id === selectedEvent.id);
      if (updated && (updated.showcaseSlug !== selectedEvent.showcaseSlug || updated.showcaseEventId !== selectedEvent.showcaseEventId || updated.status !== selectedEvent.status)) {
        setSelectedEvent(updated);
      }
    }
  }, [events, selectedEvent]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load attendees when viewing event detail
  useEffect(() => {
    if (selectedEvent && view === 'detail') {
      loadEventAttendees(selectedEvent.id);
    }
  }, [selectedEvent?.id, view, loadEventAttendees]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    date: '',
    endDate: '',
    type: 'ID Day',
    fee: 'Free',
    isHosting: false,
    link: '',
    notes: ''
  });

  // Date Logic for Grouping
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const thisWeekEvents = sortedEvents.filter(e => {
      const d = new Date(e.date);
      return d >= now && d <= nextWeek;
  });

  const futureEvents = sortedEvents.filter(e => new Date(e.date) > nextWeek);
  const pastEvents = sortedEvents.filter(e => new Date(e.date) < now).reverse();

  const handleCreate = async () => {
    if (!formData.title || !formData.date || !formData.location) return;
    setLoading(true);

    const newId = Date.now().toString();
    const baseEvent: ScoutingEvent = {
        id: newId,
        isMine: formData.isHosting,
        role: formData.isHosting ? 'HOST' : 'ATTENDEE',
        status: formData.isHosting ? 'Draft' : 'Published',
        title: formData.title,
        location: formData.location,
        date: formData.date,
        endDate: formData.endDate || undefined,
        type: parseEventType(formData.type),
        fee: formData.fee,
        marketingCopy: '',
        agenda: [],
        checklist: [],
        link: formData.link || undefined,
        notes: formData.notes || undefined
    };

    try {
        if (formData.isHosting) {
            const plan = await generateEventPlan(formData.title, formData.location, formData.date, formData.type, formData.fee);
            const finalEvent = { ...baseEvent, ...plan };
            onAddEvent(finalEvent);
            setSelectedEvent(finalEvent);
        } else {
            const attendeeEvent: ScoutingEvent = {
                ...baseEvent,
                marketingCopy: `Personal scouting mission for ${formData.title}. Goal: Identify top talent and build relationships with coaches.`,
                agenda: ["Arrival", "Match Observation", "Coach Networking", "Assessment"],
                checklist: [
                    { task: "Get the Roster", completed: false },
                    { task: "Prepare QR Code", completed: false }
                ]
            };
            onAddEvent(attendeeEvent);
            setSelectedEvent(attendeeEvent);
        }
        
        setView('detail');
        setFormData({ title: '', location: '', date: '', endDate: '', type: 'ID Day', fee: 'Free', isHosting: false, link: '', notes: '' });
    } catch (e) {
        onAddEvent(baseEvent);
        setSelectedEvent(baseEvent);
        setView('detail');
    } finally {
        setLoading(false);
    }
  };

  const initiateAttendance = (eventToMark: ScoutingEvent) => {
      const isAlreadyAdded = events.some(e =>
          e.id === eventToMark.id ||
          (e.title === eventToMark.title && e.date === eventToMark.date)
      );

      if (isAlreadyAdded) {
          alert("You are already scheduled for this event.");
          return;
      }
      setAttendingEvent(eventToMark);
  };

  const confirmAttendance = async () => {
      if (!attendingEvent) {
          alert('No event selected');
          return;
      }

      const newEvent: ScoutingEvent = {
          ...attendingEvent,
          id: `event-${Date.now()}`,
          isMine: false,
          role: 'ATTENDEE',
          status: 'Published',
          marketingCopy: '',
          agenda: [],
          checklist: [
              { task: "Get the Roster", completed: false },
              { task: "Prepare QR Code", completed: false }
          ]
      };

      try {
          await onAddEvent(newEvent);
          setAttendingEvent(null);
      } catch (error) {
          console.error('Failed to add event:', error);
          alert('Failed to add event: ' + (error instanceof Error ? error.message : String(error)));
      }
  };

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
  };

  const submitForApproval = (event: ScoutingEvent) => {
      const updated = { ...event, status: 'Pending Approval' as EventStatus };
      handleUpdateEvent(updated);
  };

  const publishEvent = (event: ScoutingEvent) => {
      const updated = { ...event, status: 'Published' as EventStatus };
      handleUpdateEvent(updated);
  };

  return (
    <div className="h-full relative">
        {showGuide && <HostGuideModal onClose={() => setShowGuide(false)} />}
        {networkOutreachEvent && (
          <EventNetworkOutreach
            event={networkOutreachEvent}
            scoutName={user.name}
            scoutId={user.scoutId}
            players={players}
            onClose={() => setNetworkOutreachEvent(null)}
          />
        )}
        {attendingEvent && (
            <AttendancePrepModal
                event={attendingEvent}
                onCancel={() => setAttendingEvent(null)}
                onConfirm={confirmAttendance}
            />
        )}

        {view === 'create' ? (
            <CreateEventForm 
                formData={formData}
                setFormData={setFormData}
                loading={loading}
                handleCreate={handleCreate}
                onCancel={() => setView('list')}
            />
        ) : view === 'detail' && selectedEvent ? (
            <DetailView
                event={selectedEvent}
                events={events}
                isMobile={isMobile}
                onClose={() => setView('list')}
                onUpdateEvent={handleUpdateEvent}
                initiateAttendance={initiateAttendance}
                copyToClipboard={copyToClipboard}
                copied={copied}
                onSubmitForApproval={submitForApproval}
                onPublishEvent={publishEvent}
                attendees={getAttendees(selectedEvent.id)}
                attendeeCount={getAttendeeCount(selectedEvent.id)}
                isUserAttending={checkIsAttending(selectedEvent.id)}
                onRegisterAttendance={() => registerAttendance(selectedEvent.id)}
                onCancelAttendance={() => cancelAttendance(selectedEvent.id)}
                currentScoutId={user.scoutId}
            />
        ) : (
            <div className="h-full flex flex-col animate-fade-in">
                {/* Simplified Desktop Header */}
                {!isMobile && (
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase">My Events</h2>
                            <p className="text-gray-400 mt-1">Direct access to your scheduled and upcoming events.</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowGuide(true)}
                                className="px-4 py-2 rounded-lg bg-scout-900 border border-scout-700 text-gray-300 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <HelpCircle size={16} /> Host Guide
                            </button>
                            <button 
                                onClick={() => setView('create')}
                                className="px-5 py-2 rounded-lg bg-scout-accent hover:bg-emerald-600 text-scout-900 font-bold text-sm flex items-center gap-2 shadow-lg transition-colors"
                            >
                                <Plus size={18} /> Add Event
                            </button>
                        </div>
                    </div>
                )}

                {/* Next Event Countdown Banner */}
                {(() => {
                    const allUpcoming = [...thisWeekEvents, ...futureEvents];
                    if (allUpcoming.length === 0) return null;

                    const nextEvent = allUpcoming[0];
                    const [year, month, day] = nextEvent.date.split('-').map(Number);
                    const eventDate = new Date(year, month - 1, day);
                    const nowTime = new Date();
                    const diffMs = eventDate.getTime() - nowTime.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                    if (diffMs < 0) return null;

                    const isToday = diffDays === 0;
                    const isTomorrow = diffDays === 1;

                    return (
                        <div
                            onClick={() => { setSelectedEvent(nextEvent); setView('detail'); }}
                            className="mb-6 p-4 bg-gradient-to-r from-scout-accent/10 via-emerald-500/5 to-scout-accent/10 border border-scout-accent/30 rounded-2xl cursor-pointer hover:border-scout-accent/50 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-scout-accent/20 rounded-xl flex items-center justify-center border border-scout-accent/30">
                                        <Timer size={24} className="text-scout-accent" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-scout-accent uppercase tracking-widest">Next Event</p>
                                        <h3 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-none">{nextEvent.title}</h3>
                                        <p className="text-xs text-gray-400">{nextEvent.location}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl md:text-3xl font-black text-white">
                                        {isToday ? (
                                            <span className="text-scout-accent">TODAY</span>
                                        ) : isTomorrow ? (
                                            <span>Tomorrow</span>
                                        ) : (
                                            <span>{diffDays}<span className="text-base font-bold text-gray-400 ml-1">days</span></span>
                                        )}
                                    </div>
                                    {!isToday && !isTomorrow && diffHours > 0 && (
                                        <p className="text-xs text-gray-500">{diffHours}h remaining</p>
                                    )}
                                    {isToday && diffHours > 0 && (
                                        <p className="text-xs text-scout-accent font-bold">{diffHours} hours to go</p>
                                    )}
                                </div>
                                <ChevronRight size={20} className="text-gray-600 group-hover:text-scout-accent transition-colors hidden md:block" />
                            </div>
                        </div>
                    );
                })()}

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-8">
                    <div className="space-y-8">
                            {/* THIS WEEK */}
                            {thisWeekEvents.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <Clock size={12} className="text-scout-accent"/> This Week
                                    </h4>
                                    {thisWeekEvents.map(evt => (
                                        <EventRow 
                                            key={evt.id} 
                                            event={evt} 
                                            isAdded={true}
                                            onClick={(e) => { setSelectedEvent(e); setView('detail'); }} 
                                            onScan={onScanRoster}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* FUTURE */}
                            {futureEvents.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <Calendar size={12}/> Coming Up
                                    </h4>
                                    {futureEvents.map(evt => (
                                        <EventRow 
                                            key={evt.id} 
                                            event={evt} 
                                            isAdded={true}
                                            onClick={(e) => { setSelectedEvent(e); setView('detail'); }} 
                                            onScan={onScanRoster}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* EMPTY STATE */}
                            {thisWeekEvents.length === 0 && futureEvents.length === 0 && (
                                <div className="bg-gradient-to-br from-scout-800/50 to-scout-900/30 rounded-2xl border border-scout-700 p-8 md:p-12">
                                    <div className="max-w-lg mx-auto text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-scout-accent/20 to-scout-highlight/10 flex items-center justify-center">
                                            <Calendar size={40} className="text-scout-accent" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">No Events Yet</h3>
                                        <p className="text-gray-400 mb-8">Events are where you find talent. Add ID days, showcases, and camps to your calendar.</p>

                                        {/* Quick-add event type buttons */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                            {[
                                                { type: 'ID Day', icon: '🎯', desc: 'College recruiting day' },
                                                { type: 'Showcase', icon: '⚽', desc: 'Competitive event' },
                                                { type: 'Camp', icon: '🏕️', desc: 'Training opportunity' },
                                                { type: 'Tournament', icon: '🏆', desc: 'Competition' },
                                            ].map(item => (
                                                <button
                                                    key={item.type}
                                                    onClick={() => setView('create')}
                                                    className="p-4 bg-scout-900/50 border border-scout-700/50 rounded-xl hover:border-scout-accent/50 hover:bg-scout-800/50 transition-all group text-left"
                                                >
                                                    <span className="text-2xl mb-2 block">{item.icon}</span>
                                                    <p className="text-sm font-bold text-white group-hover:text-scout-accent transition-colors">{item.type}</p>
                                                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setView('create')}
                                            className="inline-flex items-center gap-2 bg-scout-accent text-scout-900 px-8 py-3 rounded-xl font-black text-sm uppercase hover:bg-emerald-400 transition-all shadow-glow"
                                        >
                                            <CalendarPlus size={18} /> Create Your First Event
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PAST */}
                            {pastEvents.length > 0 && (
                                <div className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <History size={12}/> Past Events
                                    </h4>
                                    {pastEvents.map(evt => (
                                        <EventRow 
                                            key={evt.id} 
                                            event={evt} 
                                            isAdded={true}
                                            onClick={(e) => { setSelectedEvent(e); setView('detail'); }} 
                                        />
                                    ))}
                                </div>
                            )}
                    </div>
                </div>
                
                {/* Mobile FAB */}
                {isMobile && (
                    <button
                        onClick={() => { haptic.medium(); setView('create'); }}
                        className="fixed bottom-24 right-6 w-14 h-14 bg-scout-accent rounded-full flex items-center justify-center text-scout-900 shadow-2xl border-4 border-scout-900 active:scale-90 transition-transform z-30"
                    >
                        <CalendarPlus size={28} />
                    </button>
                )}
            </div>
        )}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(EventHub);