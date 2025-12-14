import React from 'react';
import { UserProfile, Player, ScoutingEvent, PlayerStatus } from '../types';
import { BadgeCheck, Share2, Award, MapPin, Users, Calendar, Briefcase, Star, QrCode } from 'lucide-react';

interface ProfileTabProps {
  user: UserProfile;
  players: Player[];
  events: ScoutingEvent[];
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, players, events }) => {
  const signedPlayers = players.filter(p => p.status === PlayerStatus.PLACED).length;
  const totalPlayers = players.length;
  const totalEvents = events.length;

  const copyLink = () => {
    // In a real app, this would copy a public URL
    alert("Public profile link copied to clipboard!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-scout-700 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                My Scout Profile 
                <BadgeCheck className="text-scout-accent" size={28} />
            </h2>
            <p className="text-gray-400">Manage your professional identity and public appearance.</p>
        </div>
        <button 
            onClick={copyLink}
            className="flex items-center gap-2 bg-scout-800 hover:bg-scout-700 border border-scout-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
            <Share2 size={18} /> Share Public Link
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: The "Digital Scout Pass" Card */}
        <div className="md:col-span-1">
            <div className="bg-gradient-to-br from-scout-900 to-black border border-scout-600 rounded-xl overflow-hidden shadow-2xl relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-scout-accent/10 rounded-bl-full z-0"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-scout-highlight/10 rounded-tr-full z-0"></div>
                
                <div className="p-6 relative z-10 flex flex-col items-center text-center">
                     <div className="w-24 h-24 rounded-full bg-scout-700 border-4 border-scout-800 shadow-lg flex items-center justify-center text-3xl font-bold text-white mb-4">
                        {user.name.charAt(0)}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-1">{user.name}</h3>
                    <div className="bg-scout-accent/20 text-scout-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-scout-accent/30">
                        Verified Scout
                    </div>

                    <div className="w-full space-y-3 text-left border-t border-scout-800/50 pt-4 mt-2">
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <Briefcase size={16} className="text-gray-500" />
                            <span>{user.role}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                             <MapPin size={16} className="text-gray-500" />
                             <span>{user.region}</span>
                        </div>
                         {user.affiliation && (
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <Users size={16} className="text-gray-500" />
                                <span>{user.affiliation}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 bg-white p-2 rounded w-fit mx-auto opacity-90">
                        <QrCode className="text-black" size={64} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 tracking-widest uppercase">ID: WARUBI-{Date.now().toString().slice(-6)}</p>
                </div>
            </div>
        </div>

        {/* Right Column: Stats & Achievements */}
        <div className="md:col-span-2 space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-scout-800 p-4 rounded-lg border border-scout-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold mb-2">
                        <Users size={14} /> Total Scouts
                    </div>
                    <div className="text-3xl font-bold text-white">{totalPlayers}</div>
                    <p className="text-xs text-gray-500 mt-1">Players Submitted</p>
                </div>
                
                <div className="bg-scout-800 p-4 rounded-lg border border-scout-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold mb-2">
                        <Calendar size={14} /> Events
                    </div>
                    <div className="text-3xl font-bold text-white">{totalEvents}</div>
                    <p className="text-xs text-gray-500 mt-1">Showcases Hosted</p>
                </div>

                 <div className="bg-scout-800 p-4 rounded-lg border border-scout-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold mb-2">
                        <Award size={14} /> Success
                    </div>
                    <div className="text-3xl font-bold text-scout-accent">{signedPlayers}</div>
                    <p className="text-xs text-gray-500 mt-1">Players Signed</p>
                </div>
            </div>

            {/* Badges / Achievements */}
            <div className="bg-scout-800 rounded-lg border border-scout-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Star size={18} className="text-scout-highlight" /> 
                    Credibility Badges
                </h3>
                <div className="flex flex-wrap gap-4">
                    {/* Default Badge */}
                    <div className="flex flex-col items-center gap-2 p-3 bg-scout-900 rounded-lg border border-scout-600 w-24 text-center">
                        <div className="p-2 bg-scout-accent/20 rounded-full text-scout-accent">
                            <BadgeCheck size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-300">Verified</span>
                    </div>

                    {/* Conditional Badges */}
                    {totalPlayers > 0 ? (
                         <div className="flex flex-col items-center gap-2 p-3 bg-scout-900 rounded-lg border border-scout-600 w-24 text-center">
                            <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                                <Users size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-300">Talent Spotter</span>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center gap-2 p-3 bg-scout-900 rounded-lg border border-scout-700/30 w-24 text-center opacity-50 grayscale">
                            <div className="p-2 bg-gray-700 rounded-full text-gray-400">
                                <Users size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-500">Talent Spotter</span>
                        </div>
                    )}

                    {totalEvents > 0 ? (
                         <div className="flex flex-col items-center gap-2 p-3 bg-scout-900 rounded-lg border border-scout-600 w-24 text-center">
                            <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">
                                <Calendar size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-300">Event Host</span>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center gap-2 p-3 bg-scout-900 rounded-lg border border-scout-700/30 w-24 text-center opacity-50 grayscale">
                            <div className="p-2 bg-gray-700 rounded-full text-gray-400">
                                <Calendar size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-500">Event Host</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bio / About */}
            <div className="bg-scout-800 rounded-lg border border-scout-700 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Scout Bio</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                    Professional talent scout specialized in the {user.region} region. 
                    Focused on identifying high-potential athletes for the WARUBI International Talent Program.
                    {user.affiliation && ` Currently affiliated with ${user.affiliation}.`}
                </p>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileTab;