import React, { useState, useMemo } from 'react';
import { X, Users, Upload, Send, CheckCircle, Mail, ChevronRight, Copy, Check } from 'lucide-react';
import { Player } from '../types';

interface NetworkOutreachModalProps {
  open: boolean;
  onClose: () => void;
  players: Player[];
  scoutName: string;
  scoutId: string;
  submissionLink: string;
}

type Step = 'audience' | 'compose';
type Audience = 'database' | 'custom';

// Build plain-text email body for mailto (email clients don't support HTML in mailto)
function buildEmailBody(scoutName: string, submissionLink: string): string {
  return `Hi,

I wanted to share a free tool that might help you or a player you know.

The ExposureEngine analyzes a player's stats, league level, and academics to show where they'd realistically fit — US college soccer (D1, D2, NAIA, JUCO) or European academy pathways including Bundesliga programs. It also gives a personalized action plan.

Takes about 3 minutes:
${submissionLink}

If the results look promising, I'd be happy to discuss next steps.

Best,
${scoutName}`;
}

const BATCH_SIZE = 30; // mailto BCC limit per batch to avoid URL length issues

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
  const [subject, setSubject] = useState(`Free tool: What's your US college soccer level?`);
  const [bodyCopied, setBodyCopied] = useState(false);
  const [batchesSent, setBatchesSent] = useState(0);

  // Players from DB with email addresses
  const dbRecipients = useMemo(() =>
    players
      .filter(p => p.email)
      .map(p => p.email!),
    [players]
  );

  // Parse custom email list
  const customRecipients = useMemo(() => {
    if (!customEmails.trim()) return [];
    return customEmails
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));
  }, [customEmails]);

  const recipients = audience === 'database' ? dbRecipients : customRecipients;

  const emailBody = useMemo(() => buildEmailBody(scoutName, submissionLink), [scoutName, submissionLink]);

  // Split recipients into batches for mailto links
  const batches = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      result.push(recipients.slice(i, i + BATCH_SIZE));
    }
    return result;
  }, [recipients]);

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

  const handleClose = () => {
    setStep('audience');
    setAudience(null);
    setCustomEmails('');
    setBatchesSent(0);
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
              <p className="text-sm text-gray-400">Email your ExposureEngine link to players, parents, and coaches. Opens in your mail app.</p>

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
                      {dbRecipients.length > 0
                        ? `${dbRecipients.length} players with email addresses`
                        : `0 of ${players.length} players have emails — add via Edit Player`}
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
                      Paste email addresses for coaches, parents, agents
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Compose & Send */}
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

              {/* Email Body Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Message</label>
                  <button
                    onClick={copyBody}
                    className="text-[10px] font-bold text-gray-500 hover:text-scout-accent flex items-center gap-1 transition-colors"
                  >
                    {bodyCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy Text</>}
                  </button>
                </div>
                <div className="bg-scout-900 border border-scout-700 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {emailBody}
                </div>
              </div>

              {/* Sender info */}
              <div className="bg-scout-900/50 border border-scout-700 rounded-xl p-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sent From</p>
                <p className="text-sm text-gray-300">Your own email (opens in your mail app)</p>
              </div>

              {/* Send buttons — one per batch */}
              <div className="space-y-3">
                {recipients.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No recipients yet</p>
                )}

                {batches.length === 1 && (
                  <button
                    onClick={() => openMailto(batches[0], 0)}
                    className="w-full py-3.5 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-glow hover:bg-emerald-400 transition-all"
                  >
                    <Send size={16} />
                    Open Email — {recipients.length} {recipients.length === 1 ? 'Recipient' : 'Recipients'}
                  </button>
                )}

                {batches.length > 1 && (
                  <>
                    <p className="text-xs text-gray-500">
                      {recipients.length} recipients split into {batches.length} batches (max {BATCH_SIZE} per email).
                      Send each batch — they'll open in your mail app.
                    </p>
                    {batches.map((batch, i) => (
                      <button
                        key={i}
                        onClick={() => openMailto(batch, i)}
                        className={`w-full py-3 rounded-xl font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all ${
                          i < batchesSent
                            ? 'bg-scout-accent/10 text-scout-accent border border-scout-accent/30'
                            : 'bg-scout-accent text-scout-900 shadow-glow hover:bg-emerald-400'
                        }`}
                      >
                        {i < batchesSent ? (
                          <><CheckCircle size={16} /> Batch {i + 1} Opened ({batch.length})</>
                        ) : (
                          <><Send size={16} /> Send Batch {i + 1} — {batch.length} Recipients</>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Back */}
              <button
                onClick={() => { setStep('audience'); setAudience(null); setBatchesSent(0); }}
                className="w-full py-2.5 text-gray-500 text-sm font-bold hover:text-gray-300 transition-colors"
              >
                &larr; Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkOutreachModal;
