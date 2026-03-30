import React, { useMemo } from 'react';
import { Send, Copy, CheckCircle, ExternalLink, Mail } from 'lucide-react';
import { useDashboardContext } from '../DashboardLayout';
import ShareToolkit from '../ShareToolkit';
import { FunnelStrip } from '../home/FunnelStrip';
import { WarmLeadsStrip } from '../home/WarmLeadsStrip';

const OutreachScreen: React.FC = () => {
  const { players, user, onMessageSent } = useDashboardContext();

  const uncontacted = useMemo(() =>
    players.filter(p => !p.lastContactedAt && p.outreachLogs?.length === 0 && p.status !== 'Archived'),
    [players]
  );

  const eeLink = user.scoutId ? `https://app.warubi-sports.com?ref=${user.scoutId}` : '';

  const outreachMessage = `Hey! I'm ${user.name}, a scout with Warubi Sports. We help players get recruited to play college soccer in the USA — many with scholarships. Check out your options here: ${eeLink}`;

  const handleBulkEmail = () => {
    const emails = uncontacted.filter(p => p.email).map(p => p.email);
    const bcc = emails.join(',');
    const subject = encodeURIComponent('College Soccer Opportunity — Free Assessment');
    const body = encodeURIComponent(outreachMessage);
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, '_blank');
    uncontacted.filter(p => p.email).forEach(p => {
      onMessageSent?.(p.id, { method: 'Email', templateName: 'Outreach' });
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Outreach</h1>
        {uncontacted.length > 0 && (
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
            {uncontacted.length} uncontacted
          </span>
        )}
      </div>

      {/* EE Link hero */}
      {user.scoutId && (
        <ShareToolkit
          scoutId={user.scoutId}
          scoutName={user.name}
          variant="card"
        />
      )}

      {/* Bulk email CTA */}
      {uncontacted.length > 0 && (
        <div className="mt-4 bg-scout-800/50 border border-scout-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-black text-white">Reach {uncontacted.length} uncontacted players</h3>
              <p className="text-[10px] text-gray-500 mt-1">Send your ExposureEngine link to all players who haven't been contacted yet</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkEmail}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 rounded-xl text-white font-black text-sm active:scale-95"
            >
              <Mail size={16} /> Send Email
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(outreachMessage)}
              className="px-4 py-3 bg-scout-800 border border-scout-700 rounded-xl text-gray-400 active:scale-95"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Funnel metrics */}
      <div className="mt-6">
        <FunnelStrip players={players} />
      </div>

      {/* Warm leads */}
      <div className="mt-6">
        <WarmLeadsStrip players={players} />
      </div>
    </div>
  );
};

export default OutreachScreen;
