import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';

// Detect if running as installed PWA
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

// Detect platform
const getDevice = (): 'ios' | 'android' | 'desktop' => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
};

const DISMISS_KEY = 'scoutbuddy_install_dismissed';
const DISMISS_DAYS = 14; // Show again after 14 days

/** Smart install banner — appears once, dismissable, platform-aware */
export const InstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Already installed
    if (isStandalone()) return;

    // Previously dismissed and not expired
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      if (Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Show after a short delay so it doesn't fight the loading screen
    const timer = setTimeout(() => setVisible(true), 3000);

    // Capture the Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (!visible) return null;

  const device = getDevice();

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 md:max-w-sm z-[105] animate-fade-in">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-scout-accent/20 border border-scout-accent/30 flex items-center justify-center shrink-0">
            <Download size={20} className="text-scout-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white">Install Scout Buddy</p>
            {device === 'ios' ? (
              <p className="text-xs text-gray-400 mt-1">
                Tap <Share size={12} className="inline -mt-0.5 text-blue-400" /> then <span className="font-bold text-gray-300">"Add to Home Screen"</span> <Plus size={12} className="inline -mt-0.5 text-gray-300" />
              </p>
            ) : device === 'android' && deferredPrompt ? (
              <p className="text-xs text-gray-400 mt-1">
                Get the full app experience with offline access and push notifications.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Add to your home screen for quick access and a better experience.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 hover:bg-scout-700 rounded-lg text-gray-500 hover:text-white transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
        {device === 'android' && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full mt-3 py-2.5 bg-scout-accent text-scout-900 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-[0.98]"
          >
            <Download size={14} />
            Install Now
          </button>
        )}
      </div>
    </div>
  );
};

/** Small sidebar link — hidden when installed */
export const InstallSidebarLink: React.FC = () => {
  const [show, setShow] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (getDevice() === "desktop") return;
    setShow(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShow(false);
    } else {
      setShowInstructions(prev => !prev);
    }
  };

  if (!show) return null;

  const device = getDevice();

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-scout-accent hover:bg-scout-accent/5 transition-all text-xs font-bold"
      >
        <Download size={16} />
        Install App
      </button>
      {showInstructions && !deferredPrompt && (
        <div className="mx-4 mt-1 p-3 bg-scout-900 border border-scout-700 rounded-xl text-[11px] text-gray-400 space-y-1 animate-fade-in">
          {device === 'ios' ? (
            <>
              <p className="font-bold text-white">Safari:</p>
              <p>Tap <Share size={12} className="inline text-scout-accent" /> Share → <strong className="text-white">Add to Home Screen</strong></p>
            </>
          ) : (
            <>
              <p className="font-bold text-white">Safari:</p>
              <p>Menu → File → <strong className="text-white">Add to Dock</strong></p>
              <p className="text-gray-600 mt-1">Or use Chrome for one-click install.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
