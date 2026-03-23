import React from 'react';
import { MessageCircle, Mail, Phone, Edit3, Trophy } from 'lucide-react';
import { Player, PlayerStatus } from '../../types';

interface PlayerDetailSheetProps {
  player: Player;
  onClose: () => void;
  onEdit: (player: Player) => void;
}

const STATUS_COLORS: Record<string, string> = {
  [PlayerStatus.LEAD]: 'bg-gray-500/20 text-gray-400',
  [PlayerStatus.CONTACT_REQUESTED]: 'bg-cyan-500/20 text-cyan-400',
  [PlayerStatus.REQUEST_TRIAL]: 'bg-blue-500/20 text-blue-400',
  [PlayerStatus.OFFERED]: 'bg-amber-500/20 text-amber-400',
  [PlayerStatus.PLACED]: 'bg-green-500/20 text-green-400',
  [PlayerStatus.ARCHIVED]: 'bg-gray-500/20 text-gray-500',
};

export const PlayerDetailSheet: React.FC<PlayerDetailSheetProps> = ({ player, onClose, onEdit }) => {
  const eval_ = player.evaluation;
  const hasContact = player.phone || player.email;
  const waLink = player.phone ? `https://wa.me/${player.phone.replace(/[^\d+]/g, '').replace(/^\+/, '')}` : null;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-scout-800 rounded-t-3xl border-t border-scout-700 animate-slide-up max-h-[85vh] overflow-y-auto custom-scrollbar"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="w-full flex justify-center py-3" aria-label="Close">
          <div className="w-12 h-1 bg-scout-600 rounded-full" />
        </button>

        <div className="px-5 pb-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-scout-accent/30 to-scout-accent/10 flex items-center justify-center text-xl font-black text-scout-accent">
                {player.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{player.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{player.position || 'Unknown'}</span>
                  {player.age > 0 && <span className="text-xs text-gray-500">· {player.age}y</span>}
                  {player.club && <span className="text-xs text-gray-500">· {player.club}</span>}
                </div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${STATUS_COLORS[player.status] || STATUS_COLORS[PlayerStatus.LEAD]}`}>
              {player.status}
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold text-center flex items-center justify-center gap-2 hover:bg-green-500/20 transition-colors">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {player.email && (
              <a href={`mailto:${player.email}`}
                className="flex-1 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold text-center flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors">
                <Mail size={16} /> Email
              </a>
            )}
            {player.phone && (
              <a href={`tel:${player.phone}`}
                className="flex-1 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 text-xs font-bold text-center flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-colors">
                <Phone size={16} /> Call
              </a>
            )}
            {!hasContact && (
              <span className="flex-1 py-3 text-gray-600 text-xs text-center">No contact info</span>
            )}
          </div>

          {/* EE Score */}
          {eval_ && eval_.score != null && (
            <div className="bg-scout-900 border border-scout-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">ExposureEngine Score</span>
                <span className="text-2xl font-black text-scout-accent">{eval_.score}</span>
              </div>
              <div className="h-2 bg-scout-700 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-scout-accent to-emerald-400 rounded-full" style={{ width: `${eval_.score}%` }} />
              </div>
              {eval_.collegeLevel && (
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={12} className="text-amber-400" />
                  <span className="text-xs text-gray-300">Best fit: <span className="font-bold text-white">{eval_.collegeLevel}</span></span>
                </div>
              )}
              {eval_.strengths && eval_.strengths.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {eval_.strengths.slice(0, 4).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-scout-accent/10 border border-scout-accent/20 rounded text-[10px] text-scout-accent font-bold">{s}</span>
                  ))}
                </div>
              )}
              {eval_.summary && (
                <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">{eval_.summary}</p>
              )}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {player.nationality && (
              <div className="bg-scout-900 border border-scout-700 rounded-lg p-3">
                <span className="text-[9px] font-black text-gray-600 uppercase">Nationality</span>
                <p className="text-sm text-white font-bold mt-0.5">{player.nationality}</p>
              </div>
            )}
            {player.club && (
              <div className="bg-scout-900 border border-scout-700 rounded-lg p-3">
                <span className="text-[9px] font-black text-gray-600 uppercase">Club</span>
                <p className="text-sm text-white font-bold mt-0.5">{player.club}</p>
              </div>
            )}
            {player.gradYear && (
              <div className="bg-scout-900 border border-scout-700 rounded-lg p-3">
                <span className="text-[9px] font-black text-gray-600 uppercase">Grad Year</span>
                <p className="text-sm text-white font-bold mt-0.5">{player.gradYear}</p>
              </div>
            )}
            {player.gpa && (
              <div className="bg-scout-900 border border-scout-700 rounded-lg p-3">
                <span className="text-[9px] font-black text-gray-600 uppercase">GPA</span>
                <p className="text-sm text-white font-bold mt-0.5">{player.gpa}</p>
              </div>
            )}
          </div>

          {/* Parent info */}
          {(player.parentName || player.parentEmail || player.parentPhone) && (
            <div className="bg-scout-900 border border-scout-700 rounded-xl p-4">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 block">Parent / Guardian</span>
              {player.parentName && <p className="text-sm text-white font-bold">{player.parentName}</p>}
              <div className="flex gap-2 mt-2">
                {player.parentPhone && (
                  <a href={`https://wa.me/${player.parentPhone.replace(/[^\d+]/g, '').replace(/^\+/, '')}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[10px] font-bold flex items-center gap-1.5">
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
                {player.parentEmail && (
                  <a href={`mailto:${player.parentEmail}`}
                    className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-bold flex items-center gap-1.5">
                    <Mail size={12} /> Email
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {player.notes && (
            <div className="bg-scout-900 border border-scout-700 rounded-xl p-4">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 block">Notes</span>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{player.notes}</p>
            </div>
          )}

          {/* Outreach history */}
          {player.outreachLogs && player.outreachLogs.length > 0 && (
            <div className="bg-scout-900 border border-scout-700 rounded-xl p-4">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 block">Outreach History</span>
              <div className="space-y-2">
                {player.outreachLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">{new Date(log.date).toLocaleDateString()}</span>
                    <span className="text-gray-400">{log.method}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-300">{log.templateName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit button */}
          <button
            onClick={() => onEdit(player)}
            className="w-full py-3 bg-scout-700 border border-scout-600 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-scout-600 transition-colors"
          >
            <Edit3 size={16} /> Edit Player
          </button>
        </div>
      </div>
    </div>
  );
};
