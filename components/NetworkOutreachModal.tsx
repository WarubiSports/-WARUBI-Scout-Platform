import React, { useState, useMemo } from 'react';
import { X, Users, Upload, Send, Loader2, CheckCircle, AlertCircle, Mail, ChevronRight } from 'lucide-react';
import { Player } from '../types';
import { supabase } from '../lib/supabase';

interface NetworkOutreachModalProps {
  open: boolean;
  onClose: () => void;
  players: Player[];
  scoutName: string;
  scoutId: string;
  submissionLink: string;
}

type Step = 'audience' | 'compose' | 'sending' | 'done';
type Audience = 'database' | 'custom';

interface Recipient {
  email: string;
  name?: string;
}

// Build the email HTML — all values are from the scout's own profile, not user input
function buildEmailHtml(scoutName: string, submissionLink: string, recipientName: string): string {
  const safeName = scoutName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeRecipient = recipientName.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #0a0f1a; color: #e5e7eb;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 900; color: white; margin: 0; letter-spacing: -0.5px;">
      Scout<span style="color: #10b981;">Buddy</span>
    </h1>
  </div>
  <div style="background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px;">
    <h2 style="color: white; font-size: 20px; font-weight: 800; margin: 0 0 16px;">
      Know a talented player?
    </h2>
    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      Hi ${safeRecipient},<br><br>
      <strong style="color: white;">${safeName}</strong> is actively scouting new talent. If you know a player who could benefit from professional development opportunities in Germany, you can submit them directly — it only takes 60 seconds.
    </p>
    <a href="${submissionLink}" style="display: inline-block; background: #10b981; color: #0a0f1a; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">
      Submit a Player
    </a>
    <p style="color: #6b7280; font-size: 12px; margin: 24px 0 0;">
      This link is unique to ${safeName}. Any player submitted will go directly into their pipeline.
    </p>
  </div>
  <p style="text-align: center; color: #4b5563; font-size: 11px; margin-top: 24px;">
    Powered by Scout Buddy
  </p>
</div>`;
}

const NetworkOutreachModal: React.FC<NetworkOutreachModalProps> = ({
  open,
  onClose,
  players,
  scoutName,
  scoutId,
  submissionLink,
}) => {
  const [step, setStep] = useState<Step>('audience');
  const [audience, setAudience] = useState<Audience | null>(null);
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState(`${scoutName} — Submit a Player`);
  const [sendCount, setSendCount] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);

  // Players from DB with email addresses
  const dbRecipients = useMemo<Recipient[]>(() =>
    players
      .filter(p => p.email)
      .map(p => ({ email: p.email!, name: p.name })),
    [players]
  );

  // Parse custom email list (comma, newline, or semicolon separated)
  const customRecipients = useMemo<Recipient[]>(() => {
    if (!customEmails.trim()) return [];
    return customEmails
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'))
      .map(e => ({ email: e }));
  }, [customEmails]);

  const recipients = audience === 'database' ? dbRecipients : customRecipients;

  const previewHtml = useMemo(() => buildEmailHtml(scoutName, submissionLink, 'Coach'), [scoutName, submissionLink]);

  const handleSend = async () => {
    if (recipients.length === 0) return;
    setStep('sending');
    setSendError(null);

    try {
      // Build the HTML template with {{name}} placeholder for the edge function
      const htmlBody = buildEmailHtml(scoutName, submissionLink, '{{name}}');

      const { data, error } = await supabase.functions.invoke('send-outreach-email', {
        body: {
          recipients,
          subject,
          htmlBody,
          fromName: scoutName,
          fromDomain: 'warubi',
        },
      });

      if (error) throw error;
      setSendCount(recipients.length);
      setStep('done');
    } catch (err) {
      console.error('[NetworkOutreach] Send error:', err);
      setSendError(err instanceof Error ? err.message : 'Failed to send emails');
      setStep('compose');
    }
  };

  const handleClose = () => {
    setStep('audience');
    setAudience(null);
    setCustomEmails('');
    setSendError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-scout-700">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Let Your Network Know</h2>
          <button onClick={handleClose} className="p-2 hover:bg-scout-700 rounded-xl transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Audience */}
          {step === 'audience' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Who should receive your submission link?</p>

              {/* My Database */}
              <button
                onClick={() => { setAudience('database'); setStep('compose'); }}
                className="w-full bg-scout-900 border border-scout-700 rounded-xl p-5 text-left hover:border-scout-accent/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-scout-accent/10 rounded-xl border border-scout-accent/20 shrink-0">
                    <Users size={22} className="text-scout-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">My Players Database</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Send to all players with email addresses ({dbRecipients.length} contacts)
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-scout-accent transition-colors" />
                </div>
              </button>

              {/* Custom List */}
              <button
                onClick={() => { setAudience('custom'); setStep('compose'); }}
                className="w-full bg-scout-900 border border-scout-700 rounded-xl p-5 text-left hover:border-scout-accent/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shrink-0">
                    <Upload size={22} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Custom Email List</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Paste or type email addresses for coaches, parents, agents
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Compose */}
          {step === 'compose' && (
            <div className="space-y-5">
              {/* Custom email input */}
              {audience === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Email Addresses
                  </label>
                  <textarea
                    value={customEmails}
                    onChange={e => setCustomEmails(e.target.value)}
                    placeholder={"coach@club.com, parent@email.com\nagent@agency.com"}
                    rows={4}
                    className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors resize-none font-mono"
                  />
                  <p className="text-[10px] text-gray-600">
                    Separate with commas, semicolons, or new lines. {customRecipients.length} valid emails found.
                  </p>
                </div>
              )}

              {/* DB recipients summary */}
              {audience === 'database' && (
                <div className="bg-scout-900/50 border border-scout-700 rounded-xl p-4 flex items-center gap-3">
                  <Mail size={18} className="text-scout-accent shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{dbRecipients.length} recipients</p>
                    <p className="text-xs text-gray-500">All players in your database with email addresses</p>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-scout-accent transition-colors"
                />
              </div>

              {/* Email Preview */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Preview</label>
                <div className="bg-[#0a0f1a] rounded-xl overflow-hidden max-h-72 overflow-y-auto border border-scout-700">
                  <iframe
                    srcDoc={previewHtml}
                    title="Email preview"
                    className="w-full h-64 border-0"
                    sandbox=""
                  />
                </div>
              </div>

              {/* Sender info */}
              <div className="bg-scout-900/50 border border-scout-700 rounded-xl p-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sent From</p>
                <p className="text-sm text-gray-300">
                  {scoutName} &lt;{scoutName.toLowerCase().replace(/\s+/g, '.')}@warubi-sports.com&gt;
                </p>
              </div>

              {sendError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {sendError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('audience'); setAudience(null); }}
                  className="px-5 py-3 bg-scout-700 text-gray-300 rounded-xl text-sm font-bold hover:bg-scout-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={recipients.length === 0}
                  className="flex-1 py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  Send to {recipients.length} {recipients.length === 1 ? 'Contact' : 'Contacts'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Sending */}
          {step === 'sending' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 size={40} className="mx-auto text-scout-accent animate-spin" />
              <p className="text-white font-bold">Sending to {recipients.length} contacts...</p>
              <p className="text-gray-500 text-sm">This may take a moment.</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="py-12 text-center space-y-5">
              <div className="w-16 h-16 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto border-2 border-scout-accent/30">
                <CheckCircle size={32} className="text-scout-accent" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase">Emails Sent</h3>
                <p className="text-gray-400 text-sm mt-2">
                  {sendCount} contacts will receive your submission link. New players they submit will appear in your pipeline automatically.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkOutreachModal;
