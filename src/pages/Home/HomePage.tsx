import React from 'react';
import {getSoundById} from '../../engines/audio-engine/sounds';
import {getRemainingMs} from '../../engines/session-engine/SessionEngine';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {
  formatDurationHMS,
  formatDurationWords,
  getLocalDateKey,
} from '../../utils/time';

export const HomePage: React.FC = () => {
  const setRoute = useIntervalBellStore((s) => s.setRoute);
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const presets = useIntervalBellStore((s) => s.presets);
  const history = useIntervalBellStore((s) => s.history);
  const startSession = useIntervalBellStore((s) => s.startSession);
  const defaultAlertMode = useIntervalBellStore((s) => s.settings.defaultAlertMode);
  const pauseSession = useIntervalBellStore((s) => s.pauseSession);
  const resumeSession = useIntervalBellStore((s) => s.resumeSession);

  const hour = new Date().getHours();
  const greetingTime =
    hour < 12 ? 'Morning Stillness' : hour < 18 ? 'Afternoon Practice' : 'Evening Sanctuary';

  const todayKey = getLocalDateKey(Date.now());
  const todaySessions = history.filter((item) => getLocalDateKey(item.startedAt) === todayKey);
  const todayFocusSec = todaySessions.reduce((acc, item) => acc + item.actualActiveSec, 0);
  const totalCompleted = history.filter((item) => item.status === 'completed').length;
  const totalFocusSec = history.reduce((acc, item) => acc + item.actualActiveSec, 0);

  const activeRemainingSec = activeSession
    ? Math.ceil(getRemainingMs(activeSession) / 1000)
    : 0;

  return (
    <section className="view-section space-y-12">
      {/* Editorial Greeting & Primary CTA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
            {greetingTime}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-ink-900 dark:text-paper-50 leading-[1.12]">
            Focus in rhythm<span className="text-terracotta-500">.</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setRoute(activeSession ? 'active' : 'setup')}
          className="self-start md:self-auto bg-moss-700 hover:bg-moss-800 text-paper-50 px-6 py-3.5 rounded-full font-medium text-sm shadow-lifted hover:shadow-xl transition-all flex items-center gap-2.5 group shrink-0"
        >
          {activeSession ? (
            <span>Return to Sanctuary</span>
          ) : (
            <>
              <svg
                className="w-4 h-4 transition-transform group-hover:rotate-90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Begin Custom Session</span>
            </>
          )}
        </button>
      </div>

      {/* Active Sitting Banner (only when a session is running/paused) */}
      {activeSession && (
        <div className="bg-paper-100/90 dark:bg-night-900 rounded-3xl p-5 sm:p-6 border border-moss-700/30 dark:border-emerald-500/30 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-moss-700 dark:text-emerald-400 font-medium">
              {activeSession.status === 'paused' ? 'Paused Sitting' : 'Active Sitting'}
            </p>
            <h2 className="font-serif text-2xl font-normal text-ink-900 dark:text-paper-50">
              {activeSession.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-serif text-3xl font-light tabular-nums text-ink-900 dark:text-paper-50">
              {formatDurationHMS(activeRemainingSec)}
            </span>
            <button
              type="button"
              onClick={activeSession.status === 'paused' ? resumeSession : pauseSession}
              className="px-4 py-2 rounded-full bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 text-xs font-medium hover:bg-paper-200/70 transition-colors"
            >
              {activeSession.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => setRoute('active')}
              className="px-5 py-2 rounded-full bg-moss-700 hover:bg-moss-800 text-paper-50 text-xs font-medium shadow-soft transition-colors"
            >
              Enter Sanctuary
            </button>
          </div>
        </div>
      )}

      {/* Quiet Reflection Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-3xl p-6 shadow-soft border border-paper-200/50 dark:border-night-800">
          <span className="text-xs font-medium text-ink-400 uppercase tracking-wider">
            Today&apos;s Presence
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-normal tabular-nums">
              {formatDurationWords(todayFocusSec)}
            </span>
            <span className="text-xs text-moss-700 dark:text-emerald-400 font-medium">mindful</span>
          </div>
        </div>

        <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-3xl p-6 shadow-soft border border-paper-200/50 dark:border-night-800">
          <span className="text-xs font-medium text-ink-400 uppercase tracking-wider">
            Completed Sittings
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-normal tabular-nums">
              {totalCompleted}
            </span>
            <span className="text-xs text-ink-400">cycles</span>
          </div>
        </div>

        <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-3xl p-6 shadow-soft border border-paper-200/50 dark:border-night-800">
          <span className="text-xs font-medium text-ink-400 uppercase tracking-wider">
            Cumulative Depth
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-normal tabular-nums">
              {formatDurationWords(totalFocusSec)}
            </span>
            <span className="text-xs text-ink-400">all time</span>
          </div>
        </div>
      </div>

      {/* Two-Column Rituals & Recent Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* Left 7 Cols: Curated Rituals */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-2xl font-normal">Curated Rituals</h2>
            <button
              type="button"
              onClick={() => setRoute('presets')}
              className="text-xs font-medium text-moss-700 dark:text-emerald-400 hover:underline"
            >
              Manage all &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {presets.slice(0, 4).map((preset) => {
              const sound = getSoundById(preset.soundId);
              return (
                <div
                  key={preset.id}
                  className="group bg-paper-100/75 dark:bg-night-900/90 hover:bg-paper-100 dark:hover:bg-night-800/90 rounded-2xl p-4 sm:p-5 border border-paper-200/60 dark:border-night-800 shadow-soft transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-medium text-base text-ink-900 dark:text-paper-50 truncate">
                      {preset.name}
                    </h3>
                    <p className="text-xs text-ink-400">
                      {formatDurationWords(preset.durationSec)} total &middot; Chime every{' '}
                      {formatDurationWords(preset.intervalSec)} &middot; {sound.name}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!!activeSession}
                    onClick={() => {
                      startSession({
                        name: preset.name,
                        durationSec: preset.durationSec,
                        intervalSec: preset.intervalSec,
                        soundId: preset.soundId,
                        soundEnabled: preset.soundEnabled,
                        vibrationEnabled: preset.vibrationEnabled,
                        volume: preset.volume,
                        alertMode: preset.alertMode ?? defaultAlertMode,
                      });
                    }}
                    title={`Begin ${preset.name}`}
                    className="shrink-0 w-10 h-10 rounded-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-700 group-hover:bg-moss-700 group-hover:text-paper-50 group-hover:border-moss-700 disabled:opacity-45 disabled:pointer-events-none flex items-center justify-center transition-all shadow-soft"
                  >
                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Recent Reflections */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-2xl font-normal">Recent Reflections</h2>
            <button
              type="button"
              onClick={() => setRoute('history')}
              className="text-xs font-medium text-ink-400 hover:text-ink-900 dark:hover:text-paper-100"
            >
              Journal &rarr;
            </button>
          </div>

          <div
            className={`bg-paper-100/60 dark:bg-night-900/70 rounded-3xl p-6 border border-paper-200/60 dark:border-night-800 min-h-[260px] flex flex-col ${
              history.length === 0 ? 'justify-center' : ''
            }`}
          >
            {history.length === 0 ? (
              <div className="text-center space-y-2 py-4">
                <p className="font-serif text-lg text-ink-600 dark:text-paper-300">
                  No sittings recorded yet
                </p>
                <p className="text-xs text-ink-400 max-w-xs mx-auto leading-relaxed">
                  Completed sessions are stored quietly on your device with duration and acoustic chime counts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-paper-200/60 dark:border-night-800 last:border-none"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-ink-400">
                        {new Date(item.startedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        &middot; {item.remindersDelivered} chimes
                      </p>
                    </div>
                    <span className="font-mono text-xs bg-moss-100 dark:bg-moss-800/40 text-moss-700 dark:text-emerald-400 px-2.5 py-1 rounded-full shrink-0 tabular-nums">
                      {formatDurationWords(item.actualActiveSec)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
