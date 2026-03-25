import React, { useState } from 'react';
import { Share2, FileUp, Send, Check, Zap } from 'lucide-react';

interface FirstRunGuideProps {
  assessmentLink: string;
  onCopyLink: () => void;
  linkCopied: boolean;
  onStartImport: () => void;
  hasPlayers: boolean;
  onShareLink?: () => void;
  onBulkOutreach?: () => void;
}

export const FirstRunGuide: React.FC<FirstRunGuideProps> = ({
  onStartImport,
  hasPlayers,
  onShareLink,
  onBulkOutreach,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const steps = [
    {
      num: 1,
      icon: Share2,
      title: 'Share your link',
      desc: 'Send this to players — they get a free talent analysis, you get leads.',
      done: false,
      action: onShareLink ? (
        <button
          onClick={onShareLink}
          className="mt-3 w-full py-2.5 bg-scout-accent text-scout-900 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-[0.98]"
        >
          <Share2 size={14} /> Share Your Link
        </button>
      ) : null,
    },
    {
      num: 2,
      icon: FileUp,
      title: 'Import a roster',
      desc: 'Upload a PDF, photo, or paste names — AI extracts the players.',
      done: hasPlayers,
      action: !hasPlayers ? (
        <button
          onClick={onStartImport}
          className="mt-3 w-full py-2.5 bg-scout-800 border border-scout-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:border-scout-accent transition-colors"
        >
          <FileUp size={14} /> Import Your First Roster
        </button>
      ) : (
        <p className="mt-2 text-scout-accent text-xs font-bold">Done!</p>
      ),
    },
    {
      num: 3,
      icon: Send,
      title: 'Message your players',
      desc: 'Reach out to imported players via WhatsApp or email with one tap.',
      done: false,
      action: hasPlayers && onBulkOutreach ? (
        <button
          onClick={onBulkOutreach}
          className="mt-3 w-full py-2.5 bg-scout-800 border border-scout-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:border-scout-accent transition-colors"
        >
          <Send size={14} /> Bulk Outreach
        </button>
      ) : null,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-scout-accent/5 to-scout-900 border border-scout-accent/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-scout-accent" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Get Started</h3>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[10px] text-gray-500 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-gray-400">Three steps to start filling your pipeline with leads.</p>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`bg-scout-800/50 border rounded-xl p-4 transition-all ${
              step.done ? 'border-scout-accent/40' : 'border-scout-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                step.done ? 'bg-scout-accent text-scout-900' : 'bg-scout-700 text-gray-400'
              }`}>
                {step.done ? <Check size={14} /> : step.num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{step.desc}</p>
                {step.action}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
