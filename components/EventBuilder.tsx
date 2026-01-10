import React, { useState } from 'react';
import { Calendar, MapPin, Sparkles, Loader2, FileText, CheckSquare, HelpCircle, Mail, ArrowRight, PlayCircle, Plus, RefreshCw, ChevronRight } from 'lucide-react';
import { ScoutingEvent } from '../types';
import { generateEventPlan } from '../services/geminiService';

interface EventBuilderProps {
  events: ScoutingEvent[];
  onAddEvent: (event: ScoutingEvent) => void;
}

const MOCK_EXTERNAL_EVENTS = [
    { id: 'ext-1', name: 'Surf Cup 2025', date: '2025-07-25', location: 'San Diego, CA', isHosting: false },
    { id: 'ext-2', name: 'Dallas Cup 2025', date: '2025-04-14', location: 'Dallas, TX', isHosting: false },
];

const EventBuilder: React.FC<EventBuilderProps> = ({ events, onAddEvent }) => {
  const [isCreating, setIsCreating] = useState(false);
  // Show guide by default if user has no created events
  const [showGuide, setShowGuide] = useState(events.length === 0);
  const [loading, setLoading] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');

  const handleCreate = async () => {
    if (!name || !location || !date) return;
    setLoading(true);
    
    // Default values for required fields not in this simple form
    const type = 'ID Day';
    const fee = 'Free';

    try {
        const plan = await generateEventPlan(name, location, date, type, fee);
        const newEvent: ScoutingEvent = {
            id: Date.now().toString(),
            isMine: true,
            title: name,
            location,
            date,
            type,
            fee,
            status: 'Draft',
            registeredCount: 0,
            marketingCopy: plan.marketingCopy,
            agenda: plan.agenda,
            checklist: plan.checklist
        };
        onAddEvent(newEvent);
        setIsCreating(false);
        setName('');
        setLocation('');
        setDate('');
        setShowGuide(false); // Hide guide after successful creation
    } catch (e) {
        alert("Failed to generate event plan. Try again.");
    } finally {
        setLoading(false);
    }
  };

  const contactHQ = () => {
      window.location.href = "mailto:events@warubi-sports.com?subject=Help with Scouting Event";
  };

  const syncCalendar = () => {
      alert("Syncing with Google Calendar...");
      setTimeout(() => alert("Calendar Synced Successfully!"), 1500);
  };

  const toggleEventDetails = (id: string) => {
      if (expandedEventId === id) {
          setExpandedEventId(null);
      } else {
          setExpandedEventId(id);
      }
  };

  const EventGuide = () => (
    <div className="bg-scout-800 rounded-xl border border-scout-700 p-6 md:p-8 animate-fade-in mb-8 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-scout-accent/5 rounded-full blur-3xl -z-10"></div>

        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-scout-accent/20 text-scout-accent mb-4 border border-scout-accent/30">
                <PlayCircle size={24} />
            </div>
            <h3 className="text-2xl font-bold text-white">How to Host a Scouting Event</h3>
            <p className="text-gray-400 mt-2 max-w-lg mx-auto">Follow this simple process to organize a professional Warubi Talent ID day in your region.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8 relative">
            <div className="hidden md:block absolute top-6 left-0 w-full h-0.5 bg-scout-700 -z-10"></div>

            <div className="bg-scout-900 p-4 rounded-lg border border-scout-700 relative shadow-lg">
                <div className="w-8 h-8 bg-scout-700 rounded-full flex items-center justify-center text-white font-bold mb-3 border border-scout-600">1</div>
                <h4 className="font-bold text-white mb-1">Set Details</h4>
                <p className="text-xs text-gray-400">Choose a date and field location for your event.</p>
            </div>
             <div className="bg-scout-900 p-4 rounded-lg border border-scout-700 relative shadow-lg">
                <div className="w-8 h-8 bg-scout-700 rounded-full flex items-center justify-center text-white font-bold mb-3 border border-scout-600">2</div>
                <h4 className="font-bold text-white mb-1">AI Plan</h4>
                <p className="text-xs text-gray-400">Use the generator to create your agenda & flyer.</p>
            </div>
             <div className="bg-scout-900 p-4 rounded-lg border border-scout-700 relative shadow-lg">
                <div className="w-8 h-8 bg-scout-700 rounded-full flex items-center justify-center text-white font-bold mb-3 border border-scout-600">3</div>
                <h4 className="font-bold text-white mb-1">Approval</h4>
                <p className="text-xs text-gray-400">Sync with HQ to ensure quality standards.</p>
            </div>
             <div className="bg-scout-900 p-4 rounded-lg border border-scout-700 relative shadow-lg border-b-2 border-b-scout-accent">
                <div className="w-8 h-8 bg-scout-accent rounded-full flex items-center justify-center text-scout-900 font-bold mb-3 border border-scout-accent shadow-glow">4</div>
                <h4 className="font-bold text-white mb-1">Go Live</h4>
                <p className="text-xs text-gray-400">Execute the event using your checklist.</p>
            </div>
        </div>

        <div className="flex justify-center">
            <button 
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-white text-sm flex items-center gap-2 px-4 py-2 rounded hover:bg-scout-700/50 transition-colors"
            >
                Dismiss Guide
            </button>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-scout-700">
            <h2 className="text-2xl font-bold text-white">Events Calendar</h2>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowGuide(!showGuide)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border ${showGuide ? 'bg-scout-700 text-white border-scout-600' : 'bg-transparent text-gray-400 border-transparent hover:bg-scout-800'}`}
                >
                    <HelpCircle size={16} /> How to Host
                </button>
                <button 
                    onClick={syncCalendar}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-red-500/30"
                >
                    <RefreshCw size={16} /> Sync Calendar
                </button>
            </div>
        </div>

        {/* Create Mode */}
        {isCreating ? (
            <div className="bg-scout-800 p-6 rounded-xl border border-scout-700 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                        <Sparkles className="text-scout-highlight" size={18} />
                        AI Event Generator
                    </h3>
                    <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white">Cancel</button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <input 
                        type="text" 
                        placeholder="Event Name (e.g. Summer Showcase)" 
                        className="bg-scout-900 border border-scout-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-scout-accent outline-none"
                        value={name} onChange={e => setName(e.target.value)}
                    />
                    <input 
                        type="text" 
                        placeholder="Location (e.g. Köln Sports Park)" 
                        className="bg-scout-900 border border-scout-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-scout-accent outline-none"
                        value={location} onChange={e => setLocation(e.target.value)}
                    />
                    <input 
                        type="date" 
                        className="bg-scout-900 border border-scout-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-scout-accent outline-none"
                        value={date} onChange={e => setDate(e.target.value)}
                    />
                </div>
                
                <div className="flex justify-between items-center mt-6">
                    <button 
                        onClick={() => setShowGuide(true)}
                        className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                    >
                        <HelpCircle size={14} /> How does this work?
                    </button>
                    <button 
                        onClick={handleCreate}
                        disabled={loading}
                        className="bg-scout-accent hover:bg-emerald-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-lg"
                    >
                        {loading ? <><Loader2 className="animate-spin" /> Designing...</> : 'Generate Event Plan'}
                    </button>
                </div>
            </div>
        ) : (
            <>
                {showGuide && <EventGuide />}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* External Events (Mocked) */}
                    {MOCK_EXTERNAL_EVENTS.map(evt => (
                        <div key={evt.id} className="bg-scout-800 rounded-xl p-5 border border-scout-700 border-t-4 border-t-blue-500 shadow-lg hover:shadow-xl transition-all">
                            <div className="mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-500/20 text-blue-400 mb-2 inline-block">
                                    Attending
                                </span>
                                <h3 className="text-xl font-bold text-white">{evt.name}</h3>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <Calendar size={16} className="text-gray-500" />
                                    <span>{evt.date}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-300">
                                    <MapPin size={16} className="text-gray-500" />
                                    <span>{evt.location}</span>
                                </div>
                            </div>

                            <button className="w-full py-2 rounded-lg border border-scout-600 text-gray-300 hover:bg-scout-700 hover:text-white text-sm font-medium transition-colors">
                                View Details
                            </button>
                        </div>
                    ))}

                    {/* User Hosted Events */}
                    {events.map(evt => (
                        <div key={evt.id} className="bg-scout-800 rounded-xl p-5 border border-scout-700 border-t-4 border-t-red-500 shadow-lg hover:shadow-xl transition-all">
                            <div className="mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-red-500/20 text-red-400 mb-2 inline-block">
                                    Hosting
                                </span>
                                <h3 className="text-xl font-bold text-white">{evt.title}</h3>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <Calendar size={16} className="text-gray-500" />
                                    <span>{evt.date}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-300">
                                    <MapPin size={16} className="text-gray-500" />
                                    <span>{evt.location}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => toggleEventDetails(evt.id)}
                                className="w-full py-2 rounded-lg bg-scout-700 hover:bg-scout-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {expandedEventId === evt.id ? 'Hide Plan' : 'Manage Event'} <ChevronRight size={14} className={`transition-transform ${expandedEventId === evt.id ? 'rotate-90' : ''}`}/>
                            </button>

                            {expandedEventId === evt.id && (evt.marketingCopy || evt.checklist) && (
                                <div className="mt-4 pt-4 border-t border-scout-700 animate-fade-in text-sm">
                                    <div className="mb-3">
                                        <p className="font-semibold text-scout-accent mb-1 flex items-center gap-2"><FileText size={12}/> Marketing Copy</p>
                                        <p className="text-gray-400 italic">"{evt.marketingCopy}"</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-300 mb-2 flex items-center gap-2"><CheckSquare size={12}/> Checklist</p>
                                        <ul className="space-y-1">
                                            {(evt.checklist || []).slice(0, 3).map((item, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-gray-400">
                                                    <span className={`w-2 h-2 rounded-full ${item.completed ? 'bg-scout-accent' : 'bg-gray-600'}`}></span>
                                                    <span className={item.completed ? 'line-through' : ''}>{item.task}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button onClick={contactHQ} className="mt-3 text-xs text-scout-accent hover:underline flex items-center gap-1">
                                        <Mail size={12} /> Contact HQ for support
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Host New Event Card */}
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-scout-800/30 rounded-xl p-5 border-2 border-dashed border-scout-700 hover:border-scout-500 hover:bg-scout-800/50 transition-all flex flex-col items-center justify-center min-h-[240px] group"
                    >
                        <div className="w-16 h-16 rounded-full bg-scout-700 group-hover:bg-scout-600 flex items-center justify-center mb-4 transition-colors">
                            <Plus size={32} className="text-gray-400 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-300 group-hover:text-white">Host an Event</h3>
                        <p className="text-sm text-gray-500 mt-2 text-center px-4">Request approval for a new ID Day in your region</p>
                    </button>

                </div>
            </>
        )}
    </div>
  );
};

export default EventBuilder;