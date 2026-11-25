import React, {useState} from 'react';
import {useOnlineStatus} from '../../hooks/useOnlineStatus';
import {usePWAInstall} from '../../hooks/usePWAInstall';
import {useToast} from './ToastBanner';

interface InstallGuideModalProps {
  open: boolean;
  onClose: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  onDirectInstall: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  onClose,
  isIOS,
  isAndroid,
  isInstallable,
  onDirectInstall,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-night-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-paper-200 dark:border-night-800 bg-paper-50 dark:bg-night-900 p-6 sm:p-7 shadow-lifted"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium">
              Offline App
            </p>
            <h3
              id="pwa-install-guide-title"
              className="font-serif text-xl font-normal text-ink-900 dark:text-paper-50 mt-0.5"
            >
              {isIOS ? 'Install on iPhone or iPad' : 'Download Interval Bell'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-ink-400 hover:bg-paper-100 dark:hover:bg-night-800 transition-colors"
            aria-label="Close install guide"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isIOS ? (
          <ol className="mt-4 space-y-2.5 text-xs text-ink-600 dark:text-paper-300 leading-relaxed">
            <li>1. Tap the Share button in Safari&apos;s toolbar.</li>
            <li>2. Scroll down and select &ldquo;Add to Home Screen&rdquo;.</li>
            <li>3. Tap Add to install Interval Bell for offline use.</li>
          </ol>
        ) : isAndroid ? (
          <ol className="mt-4 space-y-2.5 text-xs text-ink-600 dark:text-paper-300 leading-relaxed">
            <li>1. Open your browser&apos;s menu button (⋮ in the top corner).</li>
            <li>2. Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</li>
            <li>3. Confirm to launch Interval Bell offline anytime.</li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-2.5 text-xs text-ink-600 dark:text-paper-300 leading-relaxed">
            <li>1. Open your mobile browser directly (outside embedded preview if viewing one).</li>
            <li>2. Choose &ldquo;Install app&rdquo; (Android / Chrome) or Share → &ldquo;Add to Home Screen&rdquo; (iOS Safari).</li>
            <li>3. Launch Interval Bell offline from your home screen.</li>
          </ol>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {isInstallable && (
            <button
              type="button"
              onClick={onDirectInstall}
              className="w-full py-3 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 text-xs font-medium transition-colors shadow-soft"
            >
              Install App Now
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 rounded-full text-xs font-medium transition-colors ${
              isInstallable
                ? 'bg-paper-100 dark:bg-night-800 text-ink-600 dark:text-paper-300 hover:bg-paper-200/70'
                : 'bg-moss-700 hover:bg-moss-800 text-paper-50 shadow-soft'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({compact = false}) => {
  const {isInstallable, isInstalled, isIOS, isAndroid, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const {showToast} = useToast();

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        showToast('Interval Bell installed');
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={`inline-flex items-center justify-center gap-2 rounded-full transition-colors whitespace-nowrap shrink-0 font-medium ${
          isInstallable
            ? 'bg-moss-700 hover:bg-moss-800 text-paper-50 shadow-soft'
            : 'border border-paper-200 dark:border-night-700 bg-paper-50 dark:bg-night-800 text-ink-900 dark:text-paper-100 hover:bg-paper-200/70'
        } ${compact ? 'px-4 py-2 text-xs' : 'w-full px-5 py-3 text-sm'}`}
      >
        <span>{isIOS ? 'Install on iOS' : 'Download App'}</span>
      </button>

      <InstallGuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isInstallable={isInstallable}
        onDirectInstall={() => {
          void install().then((accepted) => {
            if (accepted) {
              setShowGuide(false);
              showToast('Interval Bell installed');
            }
          });
        }}
      />
    </>
  );
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
