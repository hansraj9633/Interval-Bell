import {ActiveSession, AppSettings, ReminderAlertContext} from '../../types';

const SETTINGS_KEY = 'interval-bell:settings';
const ACTIVE_SESSION_KEY = 'interval-bell:active-session';
const ALERT_CONTEXT_KEY = 'interval-bell:alert-context';
const PRESETS_SEEDED_KEY = 'interval-bell:presets-seeded';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultSoundId: 'soft-bell',
  defaultSoundEnabled: true,
  defaultVibrationEnabled: true,
  defaultVolume: 0.8,
  defaultSnoozeSec: 300,
  defaultAlertMode: 'once',
  keepScreenAwake: false,
  notificationsEnabled: true,
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota errors
  }
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session === null) {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
}

export function loadAlertContext(): ReminderAlertContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ALERT_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReminderAlertContext;
  } catch {
    return null;
  }
}

export function saveAlertContext(ctx: ReminderAlertContext | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (ctx === null) {
      window.localStorage.removeItem(ALERT_CONTEXT_KEY);
    } else {
      window.localStorage.setItem(ALERT_CONTEXT_KEY, JSON.stringify(ctx));
    }
  } catch {
    // ignore
  }
}

export function isPresetsSeeded(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(PRESETS_SEEDED_KEY) === 'true';
}

export function markPresetsSeeded(value: boolean): void {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(PRESETS_SEEDED_KEY, 'true');
  } else {
    window.localStorage.removeItem(PRESETS_SEEDED_KEY);
  }
}

export function clearLocalStoragePreferences(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  window.localStorage.removeItem(ALERT_CONTEXT_KEY);
  window.localStorage.removeItem(PRESETS_SEEDED_KEY);
}
