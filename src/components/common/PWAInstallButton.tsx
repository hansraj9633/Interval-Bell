import React, {useState} from 'react';
import {useOnlineStatus} from '../../hooks/useOnlineStatus';
import {usePWAInstall} from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({compact = false}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 transition-colors whitespace-nowrap shrink-0 font-medium shadow-soft ${
          compact ? 'px-4 py-2 text-xs' : 'w-full px-5 py-3 text-sm'
        }`}
      >
        <span>Install Offline App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-paper-200 dark:border-night-700 bg-paper-50 dark:bg-night-800 text-ink-900 dark:text-paper-100 hover:bg-paper-200/70 transition-colors whitespace-nowrap shrink-0 font-medium ${
            compact ? 'px-4 py-2 text-xs' : 'w-full px-5 py-3 text-sm'
          }`}
        >
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-3xl border border-paper-200 dark:border-night-800 bg-paper-50 dark:bg-night-900 p-6 sm:p-7 shadow-lifted">
              <div className="flex items-start justify-between gap-4">
                <h3
                  id="ios-install-title"
                  className="font-serif text-xl font-normal text-ink-900 dark:text-paper-50"
                >
                  Install on iPhone or iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-full text-ink-400 hover:bg-paper-100 dark:hover:bg-night-800"
                  aria-label="Close instructions"
                >
                  ✕
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-xs text-ink-600 dark:text-paper-300 leading-relaxed">
                <li>1. Tap the Share button in Safari&apos;s toolbar.</li>
                <li>2. Scroll down and select Add to Home Screen.</li>
                <li>3. Tap Add to launch Interval Bell offline.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-3 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineNoticeBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-paper-200/70 dark:border-night-800 bg-paper-100 dark:bg-night-900 px-4 py-2 text-xs text-ink-600 dark:text-paper-300"
    >
      <span className="w-2 h-2 rounded-full bg-terracotta-500 shrink-0" />
      <span>Offline mode active — timers, acoustics, and journal records stay local.</span>
    </div>
  );
};
