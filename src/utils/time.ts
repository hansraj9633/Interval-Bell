export function formatDurationHMS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function formatDurationWords(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  if (parts.length === 0) return '0m';
  return parts.join(' ');
}

export function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getLocalDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLast7Days(): Array<{key: string; label: string; shortDay: string}> {
  const days: Array<{key: string; label: string; shortDay: string}> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({
      key: getLocalDateKey(d.getTime()),
      label: d.toLocaleDateString([], {month: 'short', day: 'numeric'}),
      shortDay: d.toLocaleDateString([], {weekday: 'short'}),
    });
  }
  return days;
}

/**
 * Computes exact periodic reminder offsets in seconds from session start.
 * Completion at durationSec takes precedence over a reminder at the exact end time.
 */
export function computeReminderSchedule(durationSec: number, intervalSec: number): number[] {
  if (durationSec <= 0 || intervalSec <= 0 || intervalSec >= durationSec) {
    return [];
  }
  const count = Math.floor((durationSec - 1) / intervalSec);
  const schedule: number[] = [];
  for (let i = 1; i <= count; i++) {
    schedule.push(i * intervalSec);
  }
  return schedule;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
