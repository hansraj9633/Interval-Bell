import React, {useEffect, useRef, useState} from 'react';
import {PWAInstallButton} from '../../components/common/PWAInstallButton';
import {useToast} from '../../components/common/ToastBanner';
import {SOUND_LIBRARY} from '../../engines/audio-engine/sounds';
import {platformAdapter} from '../../platform';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {SoundId, ThemeMode} from '../../types';

const THEME_OPTIONS: Array<{value: ThemeMode; label: string}> = [
  {value: 'light', label: 'Light'},
  {value: 'dark', label: 'Dark'},
  {value: 'system', label: 'System'},
];

const SNOOZE_DEFAULTS = [
  {label: '1m', sec: 60},
  {label: '3m', sec: 180},
  {label: '5m', sec: 300},
  {label: '10m', sec: 600},
];

export const SettingsPage: React.FC = () => {
  const settings = useIntervalBellStore((s) => s.settings);
  const updateSettings = useIntervalBellStore((s) => s.updateSettings);
  const updateDraftConfig = useIntervalBellStore((s) => s.updateDraftConfig);
  const notificationPermission = useIntervalBellStore((s) => s.notificationPermission);
  const requestNotificationPermission = useIntervalBellStore(
    (s) => s.requestNotificationPermission
  );
  const clearHistory = useIntervalBellStore((s) => s.clearHistory);
  const resetAllData = useIntervalBellStore((s) => s.resetAllData);
  const {showToast} = useToast();

  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, []);

  const capabilities = platformAdapter.getCapabilities();

  const handleTogglePaperTheme = () => {
    const isCurrentlyDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next: ThemeMode = isCurrentlyDark ? 'light' : 'dark';
    updateSettings({theme: next});
  };

  const handleClearJournalClick = () => {
    if (!confirmClearHistory) {
      setConfirmClearHistory(true);
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = setTimeout(() => {
        setConfirmClearHistory(false);
      }, 3500);
      return;
    }

    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    setConfirmClearHistory(false);
    void clearHistory();
    showToast('Practice journal cleared');
  };

  const handleTestNotification = async () => {
    setNotificationStatus(null);
    let perm = notificationPermission;
    if (perm === 'default') {
      perm = await requestNotificationPermission();
    }
    if (perm !== 'granted') {
      setNotificationStatus(
        perm === 'denied'
          ? 'Notifications are blocked in your browser site settings.'
          : 'Notifications are not supported in this browser.'
      );
      return;
    }
    const ok = await platformAdapter.showNotification({
      title: 'Interval Bell — Test Notification',
      body: 'Background alerts are ready for your focus sessions.',
      tag: 'interval-bell-test',
      requireInteraction: false,
    });
    setNotificationStatus(ok ? 'Test notification sent.' : 'Could not display notification.');
  };

  return (
    <section className="view-section space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
          Environment
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal mt-1">Preferences</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Card: Atmosphere & Defaults */}
        <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft border border-paper-200/60 dark:border-night-800 space-y-6">
          <h2 className="font-serif text-xl font-normal">Atmosphere &amp; Defaults</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-medium block">Paper Theme</span>
                <span className="text-xs text-ink-400">
                  Warm alabaster or low-glare obsidian
                </span>
              </div>
              <button
                type="button"
                onClick={handleTogglePaperTheme}
                className="px-4 py-2 rounded-full bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 hover:bg-paper-200/60 text-xs font-medium transition-colors shrink-0"
              >
                Switch Theme
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-paper-50/90 dark:bg-night-950 border border-paper-200/70 dark:border-night-800">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSettings({theme: opt.value})}
                  className={`py-1.5 rounded-full text-xs font-medium transition-all ${
                    settings.theme === opt.value
                      ? 'bg-moss-700 text-paper-50 shadow-soft'
                      : 'text-ink-600 dark:text-paper-300 hover:text-ink-900 dark:hover:text-paper-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-paper-200/60 dark:border-night-800">
            <div>
              <span className="text-sm font-medium block">Haptic Pulse (Mobile)</span>
              <span className="text-xs text-ink-400">
                Gentle vibration alongside acoustic chime
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Haptic Pulse (Mobile)"
              checked={settings.defaultVibrationEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                updateSettings({defaultVibrationEnabled: next});
                updateDraftConfig({vibrationEnabled: next});
              }}
              className="w-5 h-5 accent-moss-700 rounded cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium block">Acoustic Sound</span>
              <span className="text-xs text-ink-400">
                Play continuous instrument chime at each interval
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Enable acoustic sound by default"
              checked={settings.defaultSoundEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                updateSettings({defaultSoundEnabled: next});
                updateDraftConfig({soundEnabled: next});
              }}
              className="w-5 h-5 accent-moss-700 rounded cursor-pointer shrink-0"
            />
          </div>

          {capabilities.supportsWakeLock && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-medium block">Keep Screen Awake</span>
                <span className="text-xs text-ink-400">
                  Prevent display sleep during an active sitting
                </span>
              </div>
              <input
                type="checkbox"
                aria-label="Keep screen awake during active session"
                checked={settings.keepScreenAwake}
                onChange={(e) => updateSettings({keepScreenAwake: e.target.checked})}
                className="w-5 h-5 accent-moss-700 rounded cursor-pointer shrink-0"
              />
            </div>
          )}

          <div className="space-y-4 pt-3 border-t border-paper-200/60 dark:border-night-800">
            <div>
              <label
                htmlFor="default-sound"
                className="text-xs font-medium text-ink-400 uppercase tracking-wider block mb-2"
              >
                Default Instrument
              </label>
              <select
                id="default-sound"
                value={settings.defaultSoundId}
                onChange={(e) => {
                  const soundId = e.target.value as SoundId;
                  updateSettings({defaultSoundId: soundId});
                  updateDraftConfig({soundId});
                }}
                className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-moss-700"
              >
                {SOUND_LIBRARY.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="settings-volume"
                  className="text-xs font-medium text-ink-400 uppercase tracking-wider"
                >
                  Default Volume
                </label>
                <span className="font-mono text-xs tabular-nums text-ink-600 dark:text-paper-300">
                  {Math.round(settings.defaultVolume * 100)}%
                </span>
              </div>
              <input
                id="settings-volume"
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={settings.defaultVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateSettings({defaultVolume: v});
                  updateDraftConfig({volume: v});
                }}
                className="w-full"
              />
            </div>

            <div>
              <span className="text-xs font-medium text-ink-400 uppercase tracking-wider block mb-2">
                Default Snooze Window
              </span>
              <div className="grid grid-cols-4 gap-2">
                {SNOOZE_DEFAULTS.map((opt) => (
                  <button
                    key={opt.sec}
                    type="button"
                    onClick={() => updateSettings({defaultSnoozeSec: opt.sec})}
                    className={`py-2 rounded-full text-xs font-medium transition-colors ${
                      settings.defaultSnoozeSec === opt.sec
                        ? 'bg-moss-700 text-paper-50 shadow-soft'
                        : 'bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 text-ink-600 dark:text-paper-300 hover:bg-paper-200/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Local Sanctuary Privacy + Alerts & Offline PWA */}
        <div className="space-y-6">
          <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft border border-paper-200/60 dark:border-night-800 space-y-6">
            <h2 className="font-serif text-xl font-normal">Local Sanctuary Privacy</h2>
            <p className="text-xs text-ink-600 dark:text-paper-300 leading-relaxed">
              Your practice stays strictly on this device. No accounts, no cloud telemetry, no
              external tracking.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleClearJournalClick}
                className="px-4 py-2.5 rounded-full border border-terracotta-500/40 text-terracotta-500 hover:bg-terracotta-500/10 text-xs font-medium transition-colors"
              >
                {confirmClearHistory ? 'Click again to confirm reset' : 'Clear Practice Journal'}
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2.5 rounded-full bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 text-ink-600 dark:text-paper-300 hover:text-terracotta-500 text-xs font-medium transition-colors"
                >
                  Reset All Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void resetAllData();
                      setConfirmReset(false);
                      showToast('All local preferences and journal data reset');
                    }}
                    className="px-4 py-2.5 rounded-full bg-terracotta-500 text-white text-xs font-medium"
                  >
                    Confirm Full Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3.5 py-2.5 rounded-full bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft border border-paper-200/60 dark:border-night-800 space-y-5">
            <h2 className="font-serif text-xl font-normal">Alerts &amp; Offline App</h2>

            <div className="text-xs text-ink-600 dark:text-paper-300 space-y-1.5 leading-relaxed">
              <p>
                Browser notifications:{' '}
                <span className="font-medium text-ink-900 dark:text-paper-100 capitalize">
                  {notificationPermission}
                </span>
              </p>
              <p className="text-ink-400">{capabilities.backgroundLimitationNote}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={() => void requestNotificationPermission()}
                  className="px-4 py-2 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 text-xs font-medium transition-colors"
                >
                  Allow Notifications
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleTestNotification()}
                className="px-4 py-2 rounded-full bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 hover:bg-paper-200/60 text-xs font-medium transition-colors"
              >
                Test Notification
              </button>
            </div>

            {notificationStatus && (
              <p className="text-xs text-moss-700 dark:text-emerald-400">{notificationStatus}</p>
            )}

            <div className="pt-3 border-t border-paper-200/60 dark:border-night-800 space-y-3">
              <p className="text-xs text-ink-400">
                Install Interval Bell on your device to launch directly offline anytime.
              </p>
              <PWAInstallButton />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
