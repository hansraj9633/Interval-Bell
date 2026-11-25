import React, {useEffect, useState} from 'react';
import {SoundSelectorRow} from '../../components/sounds/SoundSelectorRow';
import {audioEngine} from '../../engines/audio-engine/AudioEngine';
import {SOUND_LIBRARY} from '../../engines/audio-engine/sounds';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {SoundCategory, SoundId} from '../../types';

const FILTER_TABS: Array<{id: 'All' | SoundCategory; label: string}> = [
  {id: 'All', label: 'All Instruments'},
  {id: 'Bell', label: 'Singing Bowls & Bells'},
  {id: 'Ambient', label: 'Harmonic Chimes'},
  {id: 'Nature', label: 'Nature'},
  {id: 'Minimal', label: 'Minimal Pulses'},
];

export const SoundLibraryPage: React.FC = () => {
  const settings = useIntervalBellStore((s) => s.settings);
  const updateSettings = useIntervalBellStore((s) => s.updateSettings);
  const updateDraftConfig = useIntervalBellStore((s) => s.updateDraftConfig);

  const [category, setCategory] = useState<'All' | SoundCategory>('All');
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

  const filteredSounds =
    category === 'All'
      ? SOUND_LIBRARY
      : SOUND_LIBRARY.filter((s) => s.category === category);

  const handleSelectSound = (soundId: SoundId) => {
    updateSettings({defaultSoundId: soundId});
    updateDraftConfig({soundId});
    audioEngine.preview(soundId, settings.defaultVolume);
  };

  const handleTogglePreview = (soundId: SoundId) => {
    if (previewSoundId === soundId) {
      audioEngine.stop();
    } else {
      audioEngine.preview(soundId, settings.defaultVolume);
    }
  };

  return (
    <section className="view-section space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
            Psychoacoustic Synthesis
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal mt-1">
            Acoustic Instruments
          </h1>
        </div>

        {/* Tactile Volume Control */}
        <div className="bg-paper-100 dark:bg-night-900 px-5 py-3 rounded-full flex items-center gap-4 border border-paper-200/70 dark:border-night-800">
          <svg
            className="w-4 h-4 text-ink-600 dark:text-paper-300 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          <input
            type="range"
            aria-label="Global instrument volume"
            min={10}
            max={100}
            value={Math.round(settings.defaultVolume * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              updateSettings({defaultVolume: v});
              updateDraftConfig({volume: v});
            }}
            className="w-28 sm:w-36"
          />
          <span className="font-mono text-xs tabular-nums w-9 text-right">
            {Math.round(settings.defaultVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-ink-900 text-paper-50 dark:bg-paper-100 dark:text-ink-900'
                  : 'bg-paper-100 dark:bg-night-900 text-ink-600 dark:text-paper-300 hover:bg-paper-200/70 dark:hover:bg-night-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSounds.map((sound) => (
          <SoundSelectorRow
            key={sound.id}
            sound={sound}
            selected={settings.defaultSoundId === sound.id}
            isPreviewing={previewSoundId === sound.id}
            onSelect={() => handleSelectSound(sound.id)}
            onTogglePreview={() => handleTogglePreview(sound.id)}
          />
        ))}
      </div>
    </section>
  );
};
