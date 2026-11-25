import React from 'react';
import {SoundDefinition} from '../../types';

interface SoundSelectorRowProps {
  sound: SoundDefinition;
  selected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onTogglePreview: () => void;
}

export const SoundSelectorRow: React.FC<SoundSelectorRowProps> = ({
  sound,
  selected,
  isPreviewing,
  onSelect,
  onTogglePreview,
}) => {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-3xl p-5 sm:p-6 border transition-all flex items-center justify-between gap-4 ${
        selected
          ? 'bg-moss-100/60 dark:bg-moss-800/30 border-moss-700/60 shadow-soft'
          : 'bg-paper-100/75 dark:bg-night-900 border-paper-200/70 dark:border-night-800 hover:bg-paper-100 dark:hover:bg-night-800/90'
      }`}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
            selected ? 'bg-moss-700 border-moss-700 text-white' : 'border-ink-400/50'
          }`}
        >
          {selected && (
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-sm sm:text-base text-ink-900 dark:text-paper-50">
              {sound.name}
            </h3>
            <span className="text-[11px] font-mono text-ink-400">
              {sound.category} &middot; {sound.durationLabel}
            </span>
          </div>
          <p className="text-xs text-ink-600 dark:text-paper-300 leading-relaxed">
            {sound.description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePreview();
        }}
        className={`shrink-0 px-4 py-2 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors ${
          isPreviewing
            ? 'bg-moss-700 border-moss-700 text-paper-50'
            : 'bg-paper-50 dark:bg-night-950 border-paper-200 dark:border-night-700 hover:border-moss-700 text-ink-900 dark:text-paper-100'
        }`}
      >
        {isPreviewing ? (
          <>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            <span>Stop</span>
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5 text-moss-700 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Listen</span>
          </>
        )}
      </button>
    </div>
  );
};
