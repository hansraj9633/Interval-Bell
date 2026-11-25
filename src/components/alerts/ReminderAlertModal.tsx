import React from 'react';
import {getSoundById} from '../../engines/audio-engine/sounds';
import {getRemainingMs} from '../../engines/session-engine/SessionEngine';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {computeReminderSchedule, formatDurationHMS} from '../../utils/time';

const SNOOZE_OPTIONS = [
  {label: '1m', seconds: 60},
  {label: '3m', seconds: 180},
  {label: '5m', seconds: 300},
  {label: '10m', seconds: 600},
];

export const ReminderAlertModal: React.FC = () => {
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const alertContext = useIntervalBellStore((s) => s.alertContext);
  const dismissAlert = useIntervalBellStore((s) => s.dismissAlert);
  const snoozeAlert = useIntervalBellStore((s) => s.snoozeAlert);

  if (!activeSession || alertContext.state !== 'ALERT_ACTIVE') {
    return null;
  }

  const totalReminders = computeReminderSchedule(
    activeSession.durationSec,
    activeSession.intervalSec
  ).length;
  const remainingSec = Math.ceil(getRemainingMs(activeSession) / 1000);
  const soundName = getSoundById(activeSession.soundId).name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 dark:bg-black/70 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reminder-alert-title"
      aria-describedby="reminder-alert-desc"
    >
      <div className="w-full max-w-md rounded-3xl border border-paper-200 dark:border-night-800 bg-paper-50 dark:bg-night-900 p-6 sm:p-8 shadow-lifted">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-terracotta-500 font-medium">
              {alertContext.isSnoozeReminder
                ? 'Snoozed Chime'
                : `Chime ${alertContext.reminderIndex ?? activeSession.remindersDelivered} of ${totalReminders}`}
            </p>
            <h2
              id="reminder-alert-title"
              className="mt-1 font-serif text-2xl sm:text-3xl font-normal text-ink-900 dark:text-paper-50"
            >
              {activeSession.name}
            </h2>
          </div>
          <span className="font-mono text-xs bg-paper-100 dark:bg-night-800 px-3 py-1 rounded-full text-ink-600 dark:text-paper-300 tabular-nums shrink-0">
            {formatDurationHMS(remainingSec)}
          </span>
        </div>

        <p
          id="reminder-alert-desc"
          className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-paper-300"
        >
          Pause for a gentle breath, check your posture and intention, then continue your sitting.
        </p>

        <p className="mt-3 text-xs text-ink-400">
          {activeSession.soundEnabled ? soundName : 'Sound muted'}
          {activeSession.vibrationEnabled ? ' · Haptic pulse active' : ''}
        </p>

        <div className="mt-6">
          <button
            type="button"
            autoFocus
            onClick={dismissAlert}
            className="w-full min-h-[48px] rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 text-sm font-medium shadow-lifted transition-all"
          >
            Dismiss &amp; Continue
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-paper-200/70 dark:border-night-800">
          <p className="text-xs text-ink-400 mb-2.5">
            Snooze chime without altering your cadence:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SNOOZE_OPTIONS.map((opt) => (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => snoozeAlert(opt.seconds)}
                className="min-h-[40px] rounded-full border border-paper-200 dark:border-night-700 bg-paper-100/70 dark:bg-night-800 hover:bg-paper-200 dark:hover:bg-night-700 text-xs font-medium text-ink-900 dark:text-paper-100 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
