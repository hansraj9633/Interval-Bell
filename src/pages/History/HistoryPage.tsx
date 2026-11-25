import React, {useMemo, useState} from 'react';
import {useToast} from '../../components/common/ToastBanner';
import {useIntervalBellStore} from '../../store/useIntervalBellStore';
import {
  formatDateTime,
  formatDurationHMS,
  formatDurationWords,
  getLast7Days,
  getLocalDateKey,
} from '../../utils/time';

type StatusFilter = 'all' | 'completed' | 'stopped';

export const HistoryPage: React.FC = () => {
  const history = useIntervalBellStore((s) => s.history);
  const removeHistoryItem = useIntervalBellStore((s) => s.removeHistoryItem);
  const clearHistory = useIntervalBellStore((s) => s.clearHistory);
  const setRoute = useIntervalBellStore((s) => s.setRoute);
  const {showToast} = useToast();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const stats = useMemo(() => {
    const totalFocusSec = history.reduce((sum, r) => sum + r.actualActiveSec, 0);
    const completedCount = history.filter((r) => r.status === 'completed').length;
    const todayKey = getLocalDateKey(Date.now());
    const dailyCount = history.filter((r) => getLocalDateKey(r.startedAt) === todayKey).length;
    const avgDurationSec = history.length > 0 ? Math.round(totalFocusSec / history.length) : 0;

    const last7Days = getLast7Days();
    const dailyActivity = last7Days.map((day) => {
      const dayRecords = history.filter((r) => getLocalDateKey(r.startedAt) === day.key);
      const minutes = Math.round(
        dayRecords.reduce((sum, r) => sum + r.actualActiveSec, 0) / 60
      );
      return {
        ...day,
        count: dayRecords.length,
        minutes,
      };
    });
    const maxMinutes = Math.max(30, ...dailyActivity.map((d) => d.minutes));

    return {
      totalFocusSec,
      completedCount,
      dailyCount,
      avgDurationSec,
      dailyActivity,
      maxMinutes,
    };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (query && !item.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [history, filter, search]);

  return (
    <section className="view-section space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-400 font-medium">
            Mindful Continuity
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal mt-1">
            Practice Journal
          </h1>
        </div>

        {history.length > 0 && (
          <div>
            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="px-4 py-2 rounded-full border border-terracotta-500/40 text-terracotta-500 hover:bg-terracotta-500/10 text-xs font-medium transition-colors whitespace-nowrap"
              >
                Clear Practice Journal
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void clearHistory();
                    setConfirmClearAll(false);
                    showToast('Practice journal cleared');
                  }}
                  className="px-4 py-2 rounded-full bg-terracotta-500 text-white text-xs font-medium whitespace-nowrap"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-4 py-2 rounded-full bg-paper-100 dark:bg-night-800 border border-paper-200 dark:border-night-700 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly Rhythm Visualizer */}
      <div className="bg-paper-100/80 dark:bg-night-900 rounded-3xl p-6 sm:p-8 shadow-soft border border-paper-200/60 dark:border-night-800 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl font-normal">7-Day Resonance</h2>
          <span className="text-xs text-ink-400">Minutes of deep presence</span>
        </div>

        <div className="grid grid-cols-7 gap-3 sm:gap-6 h-40 items-end pt-6">
          {stats.dailyActivity.map((day) => {
            const heightPct =
              day.minutes > 0
                ? Math.max(12, Math.round((day.minutes / stats.maxMinutes) * 100))
                : 4;
            return (
              <div key={day.key} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono text-[11px] text-ink-400 tabular-nums">
                  {day.minutes > 0 ? `${day.minutes}m` : '0'}
                </span>
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[36px] rounded-t-xl transition-all duration-500 ${
                      day.minutes > 0
                        ? 'bg-moss-700 dark:bg-emerald-500'
                        : 'bg-paper-200 dark:bg-night-800'
                    }`}
                    style={{height: `${heightPct}%`}}
                    title={`${day.label}: ${day.minutes} minutes (${day.count} sittings)`}
                  />
                </div>
                <span className="text-xs text-ink-600 dark:text-paper-300 font-medium">
                  {day.shortDay}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiet Summary Strip + Filter Controls (shown when history exists) */}
      {history.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-2xl p-4 sm:p-5 border border-paper-200/50 dark:border-night-800">
              <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                Total Presence
              </span>
              <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-normal tabular-nums">
                {formatDurationWords(stats.totalFocusSec)}
              </p>
            </div>
            <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-2xl p-4 sm:p-5 border border-paper-200/50 dark:border-night-800">
              <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                Completed Sittings
              </span>
              <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-normal tabular-nums">
                {stats.completedCount}
              </p>
            </div>
            <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-2xl p-4 sm:p-5 border border-paper-200/50 dark:border-night-800">
              <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                Today&apos;s Sittings
              </span>
              <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-normal tabular-nums">
                {stats.dailyCount}
              </p>
            </div>
            <div className="bg-paper-100/70 dark:bg-night-900/90 rounded-2xl p-4 sm:p-5 border border-paper-200/50 dark:border-night-800">
              <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                Average Depth
              </span>
              <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-normal tabular-nums">
                {formatDurationWords(stats.avgDurationSec)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-paper-100/90 dark:bg-night-900 border border-paper-200/70 dark:border-night-800 self-start">
              {(['all', 'completed', 'stopped'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                    filter === status
                      ? 'bg-paper-50 dark:bg-night-800 text-ink-900 dark:text-paper-50 shadow-soft'
                      : 'text-ink-600 dark:text-paper-300/70 hover:text-ink-900'
                  }`}
                >
                  {status === 'stopped' ? 'Ended Early' : status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <svg
                className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search journal entries..."
                aria-label="Search practice journal"
                className="w-full rounded-full border border-paper-200 dark:border-night-800 bg-paper-100/70 dark:bg-night-900 pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-moss-700/30 transition-all placeholder:text-ink-400/80"
              />
            </div>
          </div>
        </div>
      )}

      {/* Session Log */}
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="bg-paper-100/70 dark:bg-night-900 rounded-3xl p-10 text-center space-y-4 border border-paper-200/60 dark:border-night-800">
            <p className="font-serif text-xl">Your journal awaits its first entry</p>
            <p className="text-xs text-ink-400 max-w-md mx-auto leading-relaxed">
              Once you complete a session, its duration, cadence, and chime count will appear here.
            </p>
            <button
              type="button"
              onClick={() => setRoute('setup')}
              className="bg-moss-700 hover:bg-moss-800 text-paper-50 px-6 py-2.5 rounded-full text-xs font-medium transition-colors shadow-soft"
            >
              Begin First Sitting
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-paper-100/70 dark:bg-night-900 rounded-3xl p-8 text-center text-xs text-ink-400 border border-paper-200/60 dark:border-night-800">
            No sittings match your current filter.
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-paper-100/80 dark:bg-night-900 rounded-2xl p-4 sm:p-5 border border-paper-200/60 dark:border-night-800 shadow-soft flex items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item.status === 'completed'
                        ? 'bg-moss-700 dark:bg-emerald-400'
                        : 'bg-ink-400'
                    }`}
                  />
                  <h3 className="font-medium text-sm sm:text-base truncate">{item.name}</h3>
                </div>
                <p className="text-xs text-ink-400">
                  {formatDateTime(item.startedAt)} &middot;{' '}
                  {item.status === 'completed' ? 'Completed' : 'Ended early'} &middot; Cadence{' '}
                  {formatDurationWords(item.intervalSec)} &middot; {item.remindersDelivered}{' '}
                  {item.remindersDelivered === 1 ? 'interval chime' : 'interval chimes'}
                  {item.snoozeCount > 0 ? ` · ${item.snoozeCount} snooze` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span
                  title={`Active: ${formatDurationHMS(item.actualActiveSec)} of ${formatDurationHMS(item.plannedDurationSec)}`}
                  className="font-mono text-xs bg-moss-100 dark:bg-moss-800/40 text-moss-700 dark:text-emerald-400 px-3 py-1.5 rounded-full font-medium tabular-nums"
                >
                  {formatDurationWords(item.actualActiveSec)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void removeHistoryItem(item.id);
                    showToast('Journal entry removed');
                  }}
                  aria-label={`Delete ${item.name} entry`}
                  title="Remove entry"
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
          ))
        )}
      </div>
    </section>
  );
};
