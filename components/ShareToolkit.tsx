import React, { useState, useMemo } from 'react';
import { Copy, Check, MessageCircle, Mail, Share2, QrCode, X, Instagram, Users, Send } from 'lucide-react';

interface ShareToolkitProps {
  scoutId: string;
  scoutName: string;
  variant?: 'card' | 'modal';
  onClose?: () => void;
  onEmailBlast?: () => void;
}

const EE_BASE = 'https://app.warubi-sports.com';

const ShareToolkit: React.FC<ShareToolkitProps> = ({ scoutId, scoutName, variant = 'card', onClose, onEmailBlast }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const link = `${EE_BASE}?ref=${scoutId}`;
  const shortLink = `app.warubi-sports.com?ref=${scoutId}`;

  const emailBody = `Hi,\n\nI wanted to share a free tool that might help you or someone you know.\n\nThe ExposureEngine analyzes a player's stats, league level, and academics to show where they'd realistically fit — US college soccer (D1, D2, NAIA, JUCO) or European academy pathways including Bundesliga programs. It also gives a personalized action plan.\n\n${link}\n\nTakes about 3 minutes. If the results look promising, I'd be happy to discuss next steps.\n\nBest,\n${scoutName}`;

  const templates = useMemo(() => ({
    whatsapp: {
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
      message: `Hey! Check out this free tool — it analyzes your stats and shows where you'd fit, whether that's US college soccer or a European academy pathway. Takes 3 minutes:\n\n${link}\n\nPretty eye-opening. Let me know what you get.`,
      url: `https://wa.me/?text=${encodeURIComponent(`Hey! Check out this free tool — it analyzes your stats and shows where you'd fit, whether that's US college soccer or a European academy pathway. Takes 3 minutes:\n\n${link}\n\nPretty eye-opening. Let me know what you get.`)}`,
      hint: 'Opens WhatsApp',
    },
    instagram: {
      label: 'Instagram',
      icon: Instagram,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10 border-pink-500/20',
      message: `Hey! Thought you might find this interesting — it's a free AI tool that analyzes your soccer career options. Shows your fit for US college programs (D1/D2/NAIA) and European academy pathways based on your stats:\n\n${link}\n\nTakes a few minutes. Worth checking out`,
      url: 'https://www.instagram.com/direct/inbox/',
      hint: 'Opens Instagram DMs',
    },
    coach: {
      label: 'Coach',
      icon: Users,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      message: `Hi Coach,\n\nI'm ${scoutName} with Warubi Sports. We connect players with opportunities in US college soccer and European academies — including a direct pathway through FC Köln's International Training Program.\n\nI'd love to share a free tool with your players — the ExposureEngine. It analyzes their stats and shows them where they'd realistically fit, whether that's D1, D2, NAIA in the US, or a Bundesliga academy pathway in Europe. Takes 3 minutes and gives them a personalized action plan.\n\n${link}\n\nFeel free to share it with your squad. If any of your players show strong results, I'd be happy to connect them with programs that match their level.\n\nBest,\n${scoutName}`,
      url: `https://wa.me/?text=${encodeURIComponent(`Hi Coach,\n\nI'm ${scoutName} with Warubi Sports. We connect players with opportunities in US college soccer and European academies — including a direct pathway through FC Köln's International Training Program.\n\nI'd love to share a free tool with your players — the ExposureEngine. It analyzes their stats and shows them where they'd realistically fit, whether that's D1, D2, NAIA in the US, or a Bundesliga academy pathway in Europe. Takes 3 minutes and gives them a personalized action plan.\n\n${link}\n\nFeel free to share it with your squad. If any of your players show strong results, I'd be happy to connect them with programs that match their level.\n\nBest,\n${scoutName}`)}`,
      hint: 'Opens WhatsApp',
    },
    email: {
      label: 'Email',
      icon: Mail,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      message: emailBody,
      url: `mailto:?subject=${encodeURIComponent('Free Career Analysis — ExposureEngine')}&body=${encodeURIComponent(emailBody)}`,
      hint: 'Opens email app',
    },
  }), [link, scoutName, emailBody]);

  const copyTemplate = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // QR code via Google Charts API (no dependency needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(link)}&bgcolor=0a0f1a&color=34d399&format=png`;

  const content = (
    <div className="space-y-3">
      {/* Channel grid — primary action */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(templates).map(([key, t]) => {
          const Icon = t.icon;
          const isEmail = key === 'email' && onEmailBlast;
          const isCopied = copied === key;
          const handleClick = () => {
            if (isEmail) { onEmailBlast(); return; }
            copyTemplate(key, t.message);
            if (t.url) window.open(t.url, '_blank');
          };
          return (
            <button
              key={key}
              onClick={handleClick}
              className={`flex flex-col items-start px-3 py-3 rounded-xl border transition-all active:scale-[0.98] ${isCopied ? 'border-scout-accent/50 bg-scout-accent/10' : `${t.bg} hover:opacity-80`}`}
            >
              <div className="flex items-center gap-2.5 w-full">
                <Icon size={16} className={isCopied ? 'text-scout-accent' : t.color} />
                <span className={`text-xs font-bold ${isCopied ? 'text-scout-accent' : t.color}`}>
                  {isCopied ? 'Copied!' : (isEmail ? 'Bulk Email' : t.label)}
                </span>
                {isEmail && !isCopied && <Send size={11} className="ml-auto text-gray-600" />}
              </div>
              {!isCopied && <span className="text-[9px] text-gray-600 mt-1 ml-[26px]">{isEmail ? 'Send to all players' : t.hint}</span>}
            </button>
          );
        })}
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center gap-2.5 px-3 py-3 rounded-xl border bg-purple-500/10 border-purple-500/20 hover:opacity-80 transition-all active:scale-[0.98]"
        >
          <QrCode size={16} className="text-purple-400" />
          <span className="text-xs font-bold text-purple-400">QR Code</span>
        </button>
      </div>

      {showQR && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="bg-white p-3 rounded-2xl">
            <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
          </div>
          <p className="text-[10px] text-gray-500">Screenshot or right-click to save</p>
        </div>
      )}

      {/* Raw link — secondary */}
      <button
        onClick={() => copyTemplate('link', link)}
        className={`w-full flex items-center gap-3 bg-scout-900 border rounded-lg px-3 py-2 transition-colors ${copied === 'link' ? 'border-scout-accent/50' : 'border-scout-700 hover:border-scout-600'}`}
      >
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] text-gray-500 font-mono truncate">{shortLink}</p>
        </div>
        {copied === 'link' ? <Check size={14} className="text-scout-accent shrink-0" /> : <Copy size={14} className="text-gray-500 shrink-0" />}
      </button>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-scout-800 border border-scout-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-scout-700">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Share Your Link</h2>
            <button onClick={onClose} className="p-2 hover:bg-scout-700 rounded-xl transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="p-6">
            <p className="text-xs text-gray-400 mb-4">
              Players get a free AI analysis. You get a qualified lead in your pipeline. Tap any channel to copy a ready-to-send message.
            </p>
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Card variant (for dashboard)
  return (
    <div className="bg-scout-800 border border-scout-700 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-scout-accent/10 rounded-xl border border-scout-accent/20">
          <Share2 size={18} className="text-scout-accent" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase">Grow Your Pipeline</h3>
          <p className="text-[10px] text-gray-500">Players get free analysis. You get leads.</p>
        </div>
      </div>
      {content}
    </div>
  );
};

export default ShareToolkit;
