import React, {useState} from 'react';
import {useToast} from '../../components/common/ToastBanner';
import {getSoundById} from '../../engines/audio-engine/sounds';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {formatDurationWords} from '../../utils/time';

export const PresetsPage: React.FC = () => {
  const presets = useIntervalBellStore((s) => s.presets);
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const applyPresetToDraft = useIntervalBellStore((s) => s.applyPresetToDraft);
  const startSession = useIntervalBellStore((s) => s.startSession);
  const removePreset = useIntervalBellStore((s) => s.removePreset);
  const setRoute = useIntervalBellStore((s) => s.setRoute);
  const {showToast} = useToast();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await removePreset(id);
    showToast('Ritual removed');
  };

  return (
    <section className="view-section space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
            Repeatable Cadences
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal mt-1">Saved Rituals</h1>
        </div>
        <button
          type="button"
          onClick={() => setRoute('setup')}
          className="self-start sm:self-auto bg-moss-700 hover:bg-moss-800 text-paper-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-soft transition-all"
        >
          + New Ritual
        </button>
      </div>

      {errorMsg && <p className="text-xs font-medium text-terracotta-500">{errorMsg}</p>}

      {presets.length === 0 ? (
        <div className="bg-paper-100/70 dark:bg-night-900 rounded-3xl p-10 text-center space-y-3 border border-paper-200/60 dark:border-night-800">
          <p className="font-serif text-xl">No saved rituals yet</p>
          <p className="text-xs text-ink-400">
            Create a custom cadence in New Session and save it here for instant access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {presets.map((preset) => {
            const sound = getSoundById(preset.soundId);
            return (
              <div
                key={preset.id}
                className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 border border-paper-200/70 dark:border-night-800 shadow-soft flex flex-col justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-2xl font-normal text-ink-900 dark:text-paper-50">
                      {preset.name}
                    </h3>
                    <span className="font-mono text-xs bg-paper-50 dark:bg-night-800 px-3 py-1 rounded-full text-ink-600 dark:text-paper-300 border border-paper-200/70 dark:border-night-700 shrink-0 tabular-nums">
                      {formatDurationWords(preset.durationSec)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400">
                    Chime every{' '}
                    <span className="text-ink-900 dark:text-paper-200 font-medium">
                      {formatDurationWords(preset.intervalSec)}
                    </span>{' '}
                    &middot; {preset.soundEnabled ? sound.name : 'Silent'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-paper-200/60 dark:border-night-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!!activeSession}
                      onClick={() => {
                        setErrorMsg(null);
                        const res = startSession({
                          name: preset.name,
                          durationSec: preset.durationSec,
                          intervalSec: preset.intervalSec,
                          soundId: preset.soundId,
                          soundEnabled: preset.soundEnabled,
                          vibrationEnabled: preset.vibrationEnabled,
                          volume: preset.volume,
                        });
                        if (!res.ok) setErrorMsg(res.error ?? 'Could not start session');
                      }}
                      className="bg-moss-700 hover:bg-moss-800 disabled:opacity-45 text-paper-50 px-5 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Start</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPresetToDraft(preset, true)}
                      className="px-4 py-2 rounded-full bg-paper-50 dark:bg-night-800 border border-paper-200 dark:border-night-700 text-xs font-medium hover:bg-paper-200/60 dark:hover:bg-night-700 transition-colors"
                    >
                      Adjust
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(preset.id)}
                    aria-label={`Remove ${preset.name}`}
                    title="Remove ritual"
                    className="p-2 rounded-full text-ink-400 hover:text-terracotta-500 hover:bg-terracotta-500/10 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
