import React, {useEffect, useRef, useState} from 'react';
import {audioEngine} from '../../engines/audio-engine/AudioEngine';
import {
  getMsUntilNextReminder,
  getRemainingMs,
} from '../../engines/session-engine/SessionEngine';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {
  computeReminderSchedule,
  formatDurationHMS,
  formatDurationWords,
} from '../../utils/time';

const RING_CIRCUMFERENCE = 2 * Math.PI * 126; // ~791.68

export const ActiveSessionPage: React.FC = () => {
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const alertContext = useIntervalBellStore((s) => s.alertContext);
  const lastCompletedRecord = useIntervalBellStore((s) => s.lastCompletedRecord);
  const pauseSession = useIntervalBellStore((s) => s.pauseSession);
  const resumeSession = useIntervalBellStore((s) => s.resumeSession);
  const stopSession = useIntervalBellStore((s) => s.stopSession);
  const dismissAlert = useIntervalBellStore((s) => s.dismissAlert);
  const snoozeAlert = useIntervalBellStore((s) => s.snoozeAlert);
  const dismissClockNotice = useIntervalBellStore((s) => s.dismissClockNotice);
  const clearCompletedSummary = useIntervalBellStore((s) => s.clearCompletedSummary);
  const setRoute = useIntervalBellStore((s) => s.setRoute);

  const [confirmingStop, setConfirmingStop] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const prevDeliveredRef = useRef<number>(0);

  // Trigger terracotta ripple animation whenever a periodic bell strikes
  useEffect(() => {
    const delivered = activeSession?.remindersDelivered ?? 0;
    if (delivered > prevDeliveredRef.current) {
      setRippleKey((k) => k + 1);
    }
    prevDeliveredRef.current = delivered;
  }, [activeSession?.remindersDelivered]);

  // Completion / Ended Summary Screen
  if (!activeSession && lastCompletedRecord) {
    const isCompleted = lastCompletedRecord.status === 'completed';
    return (
      <section className="view-section max-w-xl mx-auto py-4 sm:py-8">
        <div className="bg-paper-100/90 dark:bg-night-900 rounded-3xl p-7 sm:p-9 shadow-lifted border border-paper-200/70 dark:border-night-800 space-y-7">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-moss-700 dark:text-emerald-400 font-medium">
              {isCompleted ? 'Sitting Complete' : 'Sitting Recorded'}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink-900 dark:text-paper-50">
              {lastCompletedRecord.name}
            </h1>
            <p className="text-xs text-ink-400">
              {isCompleted
                ? 'Your focus cycle concluded peacefully and has been added to your journal.'
                : 'Your session progress has been saved quietly to your Practice Journal.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-5 border-y border-paper-200/70 dark:border-night-800">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-400 block">
                Active Presence
              </span>
              <span className="mt-1 font-serif text-3xl font-normal tabular-nums block">
                {formatDurationHMS(lastCompletedRecord.actualActiveSec)}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-400 block">
                Planned Duration
              </span>
              <span className="mt-1 font-serif text-3xl font-normal tabular-nums block">
                {formatDurationHMS(lastCompletedRecord.plannedDurationSec)}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-400 block">
                Bells Rung
              </span>
              <span className="mt-1 font-mono text-lg font-medium tabular-nums block">
                {lastCompletedRecord.remindersDelivered}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-400 block">
                Snoozes Used
              </span>
              <span className="mt-1 font-mono text-lg font-medium tabular-nums block">
                {lastCompletedRecord.snoozeCount}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                clearCompletedSummary();
                setRoute('setup');
              }}
              className="flex-1 bg-moss-700 hover:bg-moss-800 text-paper-50 py-3.5 px-6 rounded-full text-sm font-medium shadow-soft transition-colors"
            >
              Begin Another Session
            </button>
            <button
              type="button"
              onClick={() => {
                clearCompletedSummary();
                setRoute('history');
              }}
              className="flex-1 bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 hover:bg-paper-200/60 py-3.5 px-6 rounded-full text-sm font-medium transition-colors"
            >
              Open Practice Journal
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Empty Fallback when user navigates to active route with no session
  if (!activeSession) {
    return (
      <section className="view-section max-w-lg mx-auto py-12 text-center space-y-5">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
          Focus Sanctuary
        </p>
        <h1 className="font-serif text-3xl font-normal">No sitting currently in progress</h1>
        <button
          type="button"
          onClick={() => setRoute('setup')}
          className="bg-moss-700 hover:bg-moss-800 text-paper-50 px-6 py-3 rounded-full text-sm font-medium shadow-lifted transition-colors"
        >
          Shape a New Session
        </button>
      </section>
    );
  }

  const schedule = computeReminderSchedule(activeSession.durationSec, activeSession.intervalSec);
  const remainingMs = getRemainingMs(activeSession);
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const nextReminderMs = getMsUntilNextReminder(activeSession);

  const totalMs = Math.max(1, activeSession.durationSec * 1000);
  const progressRatio = Math.min(1, Math.max(0, activeSession.activeElapsedMs / totalMs));
  const dashOffset = RING_CIRCUMFERENCE * (1 - progressRatio);

  let subReadout = `Completion chime in ${formatDurationHMS(remainingSec)}`;
  if (alertContext.state === 'ALERT_ACTIVE') {
    subReadout = 'Chime ringing — awaiting dismissal';
  } else if (activeSession.status === 'paused') {
    subReadout = 'Paused — attention held';
  } else if (
    alertContext.state === 'SNOOZED' &&
    alertContext.snoozeUntilElapsedMs !== null
  ) {
    const snoozeRemSec = Math.max(
      0,
      Math.ceil((alertContext.snoozeUntilElapsedMs - activeSession.activeElapsedMs) / 1000)
    );
    subReadout = `Snoozed chime in ${formatDurationHMS(snoozeRemSec)}`;
  } else if (nextReminderMs !== null) {
    subReadout = `Next chime in ${formatDurationHMS(Math.ceil(nextReminderMs / 1000))}`;
  }

  const handleManualChime = () => {
    audioEngine.unlock();
    if (alertContext.state !== 'ALERT_ACTIVE') {
      audioEngine.preview(activeSession.soundId, activeSession.volume);
    }
    setRippleKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-40 bg-paper-50 dark:bg-night-950 flex flex-col items-center justify-between p-6 sm:p-12 overflow-y-auto transition-colors duration-300">
      {/* Top Minimal Status */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              activeSession.status === 'running'
                ? 'bg-moss-700 dark:bg-emerald-400 animate-pulse'
                : 'bg-terracotta-500'
            }`}
          />
          <span className="text-sm font-medium text-ink-600 dark:text-paper-300 truncate">
            {activeSession.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-ink-400 bg-paper-100 dark:bg-night-900 px-3 py-1 rounded-full border border-paper-200/70 dark:border-night-800 tabular-nums">
            Bell {activeSession.remindersDelivered} of {schedule.length}
          </span>
          <button
            type="button"
            onClick={() => setRoute('home')}
            className="px-3 py-1 rounded-full bg-paper-100 dark:bg-night-900 hover:bg-paper-200/70 dark:hover:bg-night-800 text-xs text-ink-600 dark:text-paper-300 border border-paper-200/70 dark:border-night-800 transition-colors"
            title="Minimize to Sanctuary dashboard"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Clock Discrepancy Recovery Notice (if device slept or clock shifted) */}
      {activeSession.clockNotice && (
        <div
          role="status"
          className="w-full max-w-xl mt-3 rounded-2xl border border-terracotta-500/40 bg-terracotta-100/70 dark:bg-terracotta-500/15 px-4 py-3 flex items-center justify-between gap-3 text-xs text-ink-900 dark:text-paper-100"
        >
          <span>{activeSession.clockNotice.message}</span>
          <button
            type="button"
            onClick={dismissClockNotice}
            className="font-medium underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Center Organic Breathing Halo & Timer */}
      <div className="relative flex items-center justify-center my-auto py-8">
        {/* Outer Breathing Aura */}
        <div
          className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-moss-700/10 dark:bg-emerald-500/10 pointer-events-none ${
            activeSession.status === 'running' ? 'animate-breathe' : 'opacity-25'
          }`}
        />

        {/* Acoustic Ripple Wave (Re-mounts when bell strikes or Chime Now is tapped) */}
        {rippleKey > 0 && (
          <div
            key={rippleKey}
            className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border-2 border-terracotta-500/60 opacity-0 pointer-events-none ripple-active"
          />
        )}

        {/* SVG Circular Progress Ring */}
        <svg className="w-72 h-72 sm:w-88 sm:h-88 -rotate-90 transform" viewBox="0 0 280 280">
          <circle
            cx="140"
            cy="140"
            r="126"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-paper-200 dark:text-night-800"
          />
          <circle
            cx="140"
            cy="140"
            r="126"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="text-moss-700 dark:text-emerald-400 transition-all duration-500 ease-linear"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="font-serif text-5xl sm:text-6xl font-light tracking-tight tabular-nums text-ink-900 dark:text-paper-50">
            {formatDurationHMS(remainingSec)}
          </span>
          <span className="text-xs text-ink-400 mt-2 font-mono">{subReadout}</span>
          <span className="text-[11px] text-ink-400/75 mt-1">
            {formatDurationWords(activeSession.durationSec)} total &middot; every{' '}
            {formatDurationWords(activeSession.intervalSec)}
          </span>
        </div>
      </div>

      {/* Inline Alert Bar if ringing */}
      {alertContext.state === 'ALERT_ACTIVE' && (
        <div className="mb-4 px-5 py-3 rounded-full bg-terracotta-100 dark:bg-terracotta-500/20 border border-terracotta-500/40 flex items-center gap-3">
          <span className="text-xs font-medium text-terracotta-500">Bell ringing</span>
          <button
            type="button"
            onClick={() => snoozeAlert()}
            className="px-3.5 py-1.5 rounded-full bg-paper-50 dark:bg-night-900 text-xs font-medium border border-paper-200 dark:border-night-700"
          >
            Snooze
          </button>
          <button
            type="button"
            onClick={dismissAlert}
            className="px-4 py-1.5 rounded-full bg-moss-700 text-paper-50 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bottom Tactile Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pb-safe">
        <button
          type="button"
          onClick={handleManualChime}
          title="Strike bell now"
          className="px-5 py-3 rounded-full bg-paper-100 dark:bg-night-900 hover:bg-paper-200/80 dark:hover:bg-night-800 border border-paper-200/70 dark:border-night-800 text-xs font-medium text-ink-600 dark:text-paper-300 transition-colors"
        >
          Chime Now
        </button>

        <button
          type="button"
          onClick={activeSession.status === 'paused' ? resumeSession : pauseSession}
          className="px-8 py-4 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 font-medium text-sm shadow-lifted transition-all min-w-[140px]"
        >
          {activeSession.status === 'paused' ? 'Resume' : 'Pause'}
        </button>

        {!confirmingStop ? (
          <button
            type="button"
            onClick={() => setConfirmingStop(true)}
            className="px-5 py-3 rounded-full bg-paper-100 dark:bg-night-900 hover:bg-terracotta-500/15 hover:text-terracotta-500 border border-paper-200/70 dark:border-night-800 text-xs font-medium text-ink-600 dark:text-paper-300 transition-colors"
          >
            Complete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmingStop(false);
                void stopSession();
              }}
              className="px-5 py-3 rounded-full bg-terracotta-500 text-white text-xs font-medium shadow-soft"
            >
              End &amp; Log
            </button>
            <button
              type="button"
              onClick={() => setConfirmingStop(false)}
              className="px-4 py-3 rounded-full bg-paper-100 dark:bg-night-900 border border-paper-200 dark:border-night-700 text-xs font-medium text-ink-600 dark:text-paper-300"
            >
              Keep Going
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
