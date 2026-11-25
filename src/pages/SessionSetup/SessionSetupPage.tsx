import React, {useEffect, useMemo, useState} from 'react';
import {useToast} from '../../components/common/ToastBanner';
import {audioEngine} from '../../engines/audio-engine/AudioEngine';
import {SOUND_LIBRARY} from '../../engines/audio-engine/sounds';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {SoundId} from '../../types';
import {computeReminderSchedule, formatDurationHMS, formatDurationWords} from '../../utils/time';
import {validateSessionConfig} from '../../utils/validation';

const DURATION_QUICK_OPTIONS = [
  {label: '15m', sec: 900},
  {label: '25m', sec: 1500},
  {label: '45m', sec: 2700},
  {label: '1h', sec: 3600},
  {label: '2h', sec: 7200},
];

const INTERVAL_QUICK_OPTIONS = [
  {label: '5m', sec: 300},
  {label: '10m', sec: 600},
  {label: '15m', sec: 900},
  {label: '20m', sec: 1200},
  {label: '30m', sec: 1800},
];

function splitHMS(totalSec: number) {
  const safe = Math.max(0, Math.floor(totalSec));
  return {
    h: Math.floor(safe / 3600),
    m: Math.floor((safe % 3600) / 60),
    s: safe % 60,
  };
}

export const SessionSetupPage: React.FC = () => {
  const draftConfig = useIntervalBellStore((s) => s.draftConfig);
  const updateDraftConfig = useIntervalBellStore((s) => s.updateDraftConfig);
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const startSession = useIntervalBellStore((s) => s.startSession);
  const createOrUpdatePreset = useIntervalBellStore((s) => s.createOrUpdatePreset);
  const setRoute = useIntervalBellStore((s) => s.setRoute);
  const notificationPermission = useIntervalBellStore((s) => s.notificationPermission);
  const requestNotificationPermission = useIntervalBellStore(
    (s) => s.requestNotificationPermission
  );
  const {showToast} = useToast();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewSoundId, setPreviewSoundId] = useState<SoundId | null>(null);

  useEffect(() => {
    const sync = () => {
      const state = audioEngine.getState();
      setPreviewSoundId(state.mode === 'preview' ? state.soundId : null);
    };
    sync();
    return audioEngine.subscribe(sync);
  }, []);

  useEffect(() => {
    return () => {
      if (audioEngine.getState().mode === 'preview') {
        audioEngine.stop();
      }
    };
  }, []);

  const durParts = splitHMS(draftConfig.durationSec);
  const intParts = splitHMS(draftConfig.intervalSec);

  const validation = useMemo(() => validateSessionConfig(draftConfig), [draftConfig]);
  const schedule = useMemo(
    () =>
      validation.valid
        ? computeReminderSchedule(draftConfig.durationSec, draftConfig.intervalSec)
        : [],
    [validation.valid, draftConfig.durationSec, draftConfig.intervalSec]
  );

  const setDurationParts = (h: number, m: number, s: number) => {
    const next = Math.max(0, h) * 3600 + Math.max(0, m) * 60 + Math.max(0, s);
    updateDraftConfig({durationSec: next});
    setSubmitError(null);
  };

  const setIntervalParts = (h: number, m: number, s: number) => {
    const next = Math.max(0, h) * 3600 + Math.max(0, m) * 60 + Math.max(0, s);
    updateDraftConfig({intervalSec: next});
    setSubmitError(null);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const res = startSession({
      ...draftConfig,
      name: draftConfig.name.trim() || 'Mindful Sitting',
    });
    if (!res.ok) {
      setSubmitError(res.error ?? 'Could not start session.');
    }
  };

  const handleSavePreset = async () => {
    setSubmitError(null);
    const presetName =
      draftConfig.name.trim() || `${formatDurationWords(draftConfig.durationSec)} Sitting`;
    const res = await createOrUpdatePreset({
      ...draftConfig,
      name: presetName,
    });
    if (!res.ok) {
      setSubmitError(res.error ?? 'Could not save preset.');
      return;
    }
    showToast(`Saved "${presetName}" to Rituals`);
  };

  const togglePreview = () => {
    if (previewSoundId === draftConfig.soundId) {
      audioEngine.stop();
    } else {
      audioEngine.preview(draftConfig.soundId, draftConfig.volume);
    }
  };

  return (
    <section className="view-section space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
          Intentional Design
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal mt-1">Shape Your Session</h1>
      </div>

      {activeSession && (
        <div className="bg-paper-100/90 dark:bg-night-900 rounded-3xl p-5 border border-terracotta-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-ink-900 dark:text-paper-100">
            A sitting ({activeSession.name}) is currently active. Return to the sanctuary or end it before beginning another.
          </p>
          <button
            type="button"
            onClick={() => setRoute('active')}
            className="px-5 py-2.5 rounded-full bg-moss-700 text-paper-50 text-xs font-medium whitespace-nowrap shrink-0"
          >
            Return to Sanctuary
          </button>
        </div>
      )}

      <form onSubmit={handleStart} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Intention Input */}
          <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft space-y-3">
            <label
              htmlFor="session-name"
              className="block text-sm font-medium text-ink-900 dark:text-paper-100"
            >
              Intention or Focus Anchor{' '}
              <span className="text-ink-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="session-name"
              maxLength={80}
              value={draftConfig.name}
              onChange={(e) => updateDraftConfig({name: e.target.value})}
              placeholder="e.g., Deep Writing, Breath Awareness, Reading..."
              className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-moss-700/30 transition-all placeholder:text-ink-400/70"
            />
          </div>

          {/* Total Duration */}
          <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Total Duration</span>
              <span className="font-mono text-sm text-moss-700 dark:text-emerald-400 font-medium bg-moss-100/70 dark:bg-moss-800/40 px-3 py-1 rounded-full tabular-nums">
                {formatDurationHMS(draftConfig.durationSec)}
              </span>
            </div>

            {/* Quick Duration Chips */}
            <div className="flex flex-wrap gap-2">
              {DURATION_QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => {
                    updateDraftConfig({durationSec: opt.sec});
                    setSubmitError(null);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                    draftConfig.durationSec === opt.sec
                      ? 'bg-moss-700 text-white shadow-soft'
                      : 'bg-paper-50 dark:bg-night-800 hover:bg-paper-200 dark:hover:bg-night-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Fine Tune Inputs */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label
                  htmlFor="dur-h"
                  className="text-[11px] uppercase tracking-wider text-ink-400 block mb-1.5"
                >
                  Hours
                </label>
                <input
                  type="number"
                  id="dur-h"
                  min={0}
                  max={24}
                  value={durParts.h}
                  onChange={(e) =>
                    setDurationParts(Number(e.target.value) || 0, durParts.m, durParts.s)
                  }
                  className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-3.5 py-2.5 font-mono text-sm tabular-nums focus:outline-none focus:border-moss-700"
                />
              </div>
              <div>
                <label
                  htmlFor="dur-m"
                  className="text-[11px] uppercase tracking-wider text-ink-400 block mb-1.5"
                >
                  Minutes
                </label>
                <input
                  type="number"
                  id="dur-m"
                  min={0}
                  max={59}
                  value={durParts.m}
                  onChange={(e) =>
                    setDurationParts(durParts.h, Number(e.target.value) || 0, durParts.s)
                  }
                  className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-3.5 py-2.5 font-mono text-sm tabular-nums focus:outline-none focus:border-moss-700"
                />
              </div>
              <div>
                <label
                  htmlFor="dur-s"
                  className="text-[11px] uppercase tracking-wider text-ink-400 block mb-1.5"
                >
                  Seconds
                </label>
                <input
                  type="number"
                  id="dur-s"
                  min={0}
                  max={59}
                  value={durParts.s}
                  onChange={(e) =>
                    setDurationParts(durParts.h, durParts.m, Number(e.target.value) || 0)
                  }
                  className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-3.5 py-2.5 font-mono text-sm tabular-nums focus:outline-none focus:border-moss-700"
                />
              </div>
            </div>

            {validation.errors.durationSec && (
              <p className="text-xs text-terracotta-500 font-medium">
                {validation.errors.durationSec}
              </p>
            )}
          </div>

          {/* Gentle Bell Cadence */}
          <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium block">Gentle Bell Cadence</span>
                <span className="text-xs text-ink-400">
                  Periodic chime to check posture &amp; presence
                </span>
              </div>
              <span className="font-mono text-sm text-terracotta-500 font-medium bg-terracotta-100/80 dark:bg-terracotta-500/15 px-3 py-1 rounded-full tabular-nums shrink-0">
                Every {formatDurationHMS(draftConfig.intervalSec)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {INTERVAL_QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => {
                    updateDraftConfig({intervalSec: opt.sec});
                    setSubmitError(null);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                    draftConfig.intervalSec === opt.sec
                      ? 'bg-moss-700 text-white shadow-soft'
                      : 'bg-paper-50 dark:bg-night-800 hover:bg-paper-200 dark:hover:bg-night-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label
                  htmlFor="int-h"
                  className="text-[11px] uppercase tracking-wider text-ink-400 block mb-1.5"
                >
                  Hours
                </label>
                <input
                  type="number"
                  id="int-h"
                  min={0}
                  max={12}
                  value={intParts.h}
                  onChange={(e) =>
                    setIntervalParts(Number(e.target.value) || 0, intParts.m, intParts.s)
                  }
                  className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-3.5 py-2.5 font-mono text-sm tabular-nums focus:outline-none focus:border-moss-700"
                />
              </div>
              <div>
                <label
                  htmlFor="int-m"
                  className="text-[11px] uppercase tracking-wider text-ink-400 block mb-1.5"
                >
                  Minutes
                </label>
                <input
                  type="number"
                  id="int-m"
                  min={0}
                  max={59}
                  value={intParts.m}
                  onChange={(e) =>
                    setIntervalParts(intParts.h, Number(e.target.value) || 0, intParts.s)
                  }
                  className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-3.5 py-2.5 font-mono text-sm tabular-nums focus:outline-none focus:border-moss-700"
                />
              </div>
              <div>
                <label
                  htmlFor="int-s"
                  className="text-[11px] uppercase tracking-wider text-ink-400 block mb-1.5"
                >
                  Seconds
                </label>
                <input
                  type="number"
                  id="int-s"
                  min={0}
                  max={59}
                  value={intParts.s}
                  onChange={(e) =>
                    setIntervalParts(intParts.h, intParts.m, Number(e.target.value) || 0)
                  }
                  className="w-full bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-3.5 py-2.5 font-mono text-sm tabular-nums focus:outline-none focus:border-moss-700"
                />
              </div>
            </div>

            {validation.errors.intervalSec && (
              <p className="text-xs text-terracotta-500 font-medium">
                {validation.errors.intervalSec}
              </p>
            )}
          </div>

          {/* Acoustic Resonance */}
          <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-7 shadow-soft space-y-5">
            <span className="text-sm font-medium block">Acoustic Resonance</span>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                id="config-sound-select"
                value={draftConfig.soundId}
                onChange={(e) => updateDraftConfig({soundId: e.target.value as SoundId})}
                className="flex-1 bg-paper-50 dark:bg-night-950 border border-paper-200 dark:border-night-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-moss-700"
              >
                {SOUND_LIBRARY.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={togglePreview}
                className="px-5 py-3 rounded-2xl bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-800 hover:bg-paper-200/70 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4 text-moss-700 dark:text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  {previewSoundId === draftConfig.soundId ? (
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  ) : (
                    <polygon points="5 3 19 12 5 21 5 3" />
                  )}
                </svg>
                <span>{previewSoundId === draftConfig.soundId ? 'Stop' : 'Preview Bell'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => updateDraftConfig({soundEnabled: !draftConfig.soundEnabled})}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-medium flex items-center justify-between transition-colors ${
                  draftConfig.soundEnabled
                    ? 'bg-moss-100/60 dark:bg-moss-800/30 border-moss-700/40 text-ink-900 dark:text-paper-50'
                    : 'bg-paper-50 dark:bg-night-950 border-paper-200 dark:border-night-800 text-ink-400'
                }`}
              >
                <span>Sound Chimes</span>
                <span>{draftConfig.soundEnabled ? 'On' : 'Muted'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateDraftConfig({vibrationEnabled: !draftConfig.vibrationEnabled})
                }
                className={`px-4 py-2.5 rounded-2xl border text-xs font-medium flex items-center justify-between transition-colors ${
                  draftConfig.vibrationEnabled
                    ? 'bg-moss-100/60 dark:bg-moss-800/30 border-moss-700/40 text-ink-900 dark:text-paper-50'
                    : 'bg-paper-50 dark:bg-night-950 border-paper-200 dark:border-night-800 text-ink-400'
                }`}
              >
                <span>Haptic Pulse</span>
                <span>{draftConfig.vibrationEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>

            {draftConfig.soundEnabled && (
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs text-ink-400 shrink-0">Volume</span>
                <input
                  type="range"
                  aria-label="Session sound volume"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={draftConfig.volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateDraftConfig({volume: v});
                    audioEngine.setVolume(v);
                  }}
                  className="flex-1"
                />
                <span className="font-mono text-xs tabular-nums w-9 text-right">
                  {Math.round(draftConfig.volume * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Visual Rhythm Arc & Action (5 Cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 bg-paper-100 dark:bg-night-900 rounded-3xl p-6 sm:p-8 shadow-lifted border border-paper-200/70 dark:border-night-800 space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-normal">Rhythm Arc</h2>
            <p className="text-xs text-ink-400 mt-1">
              {validation.valid
                ? schedule.length === 1
                  ? '1 gentle reminder before completion'
                  : `${schedule.length} gentle reminders before completion`
                : 'Adjust duration and cadence to preview'}
            </p>
          </div>

          {/* Visual Timeline Nodes */}
          {validation.valid ? (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {schedule.slice(0, 12).map((offsetSec, idx) => (
                <div
                  key={offsetSec}
                  className="flex items-center justify-between py-2 px-3.5 rounded-2xl bg-paper-50/80 dark:bg-night-950/70 border border-paper-200/60 dark:border-night-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-terracotta-500" />
                    <span className="text-ink-600 dark:text-paper-300">Chime {idx + 1}</span>
                  </div>
                  <span className="font-mono text-ink-900 dark:text-paper-100 tabular-nums">
                    {formatDurationHMS(offsetSec)}
                  </span>
                </div>
              ))}
              {schedule.length > 12 && (
                <p className="text-[11px] text-center text-ink-400 py-1">
                  + {schedule.length - 12} more interval chimes
                </p>
              )}

              <div className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-moss-100/70 dark:bg-moss-800/30 border border-moss-700/20 text-xs font-medium">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-moss-700 dark:bg-emerald-400" />
                  <span className="text-moss-800 dark:text-emerald-300">Session Complete</span>
                </div>
                <span className="font-mono text-moss-800 dark:text-emerald-300 tabular-nums">
                  {formatDurationHMS(draftConfig.durationSec)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-terracotta-100/60 dark:bg-terracotta-500/15 p-4 text-xs text-terracotta-500 font-medium">
              {validation.errors.durationSec ||
                validation.errors.intervalSec ||
                validation.errors.form ||
                'Enter valid duration and cadence values.'}
            </div>
          )}

          {notificationPermission === 'default' && (
            <button
              type="button"
              onClick={() => void requestNotificationPermission()}
              className="w-full py-2.5 px-4 rounded-2xl border border-paper-200 dark:border-night-700 bg-paper-50/70 dark:bg-night-800 text-xs text-ink-600 dark:text-paper-300 hover:text-ink-900 dark:hover:text-paper-50 transition-colors"
            >
              Allow background tab notifications
            </button>
          )}

          {submitError && (
            <p className="text-xs text-terracotta-500 font-medium">{submitError}</p>
          )}

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={!validation.valid || !!activeSession}
              className="w-full bg-moss-700 hover:bg-moss-800 disabled:opacity-45 disabled:pointer-events-none text-paper-50 py-4 rounded-full font-medium text-sm shadow-lifted transition-all flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Enter Focus Sanctuary</span>
            </button>
            <button
              type="button"
              disabled={!validation.valid}
              onClick={() => void handleSavePreset()}
              className="w-full bg-paper-50 dark:bg-night-800 hover:bg-paper-200/70 disabled:opacity-45 text-ink-900 dark:text-paper-100 py-3.5 rounded-full font-medium text-xs border border-paper-200 dark:border-night-700 transition-colors"
            >
              Save as Ritual Preset
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
