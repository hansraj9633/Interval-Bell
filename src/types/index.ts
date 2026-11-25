export type SoundCategory = 'Bell' | 'Nature' | 'Ambient' | 'Minimal';

export type SoundId =
  | 'soft-bell'
  | 'classic-bell'
  | 'double-bell'
  | 'birds'
  | 'rain'
  | 'forest'
  | 'soft-chime'
  | 'gentle-piano'
  | 'digital-beep'
  | 'short-beep';

export interface SoundDefinition {
  id: SoundId;
  name: string;
  category: SoundCategory;
  description: string;
  loopIntervalMs: number;
  durationLabel: string;
}

export type SessionStatus = 'running' | 'paused' | 'completed' | 'stopped';

export type AlertState = 'WAITING' | 'REMINDER_TRIGGERED' | 'ALERT_ACTIVE' | 'SNOOZED';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppRoute =
  | 'home'
  | 'setup'
  | 'active'
  | 'sounds'
  | 'presets'
  | 'history'
  | 'settings';

export interface SessionConfig {
  name: string;
  durationSec: number;
  intervalSec: number;
  soundId: SoundId;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number; // 0..1
}

export interface ClockAdjustmentNotice {
  detectedAt: number;
  driftMs: number;
  direction: 'forward' | 'backward';
  message: string;
}

export interface ActiveSession {
  id: string;
  name: string;
  durationSec: number;
  intervalSec: number;
  soundId: SoundId;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number;
  startedAt: number;
  endAt: number;
  totalPausedMs: number;
  pausedAt: number | null;
  activeElapsedMs: number;
  status: SessionStatus;
  remindersDelivered: number;
  snoozeCount: number;
  deliveredScheduleIndices: number[];
  lastTickWallTime: number;
  lastTickPerfTime: number | null;
  clockNotice: ClockAdjustmentNotice | null;
}

export interface ReminderAlertContext {
  state: AlertState;
  reminderIndex: number | null;
  isSnoozeReminder: boolean;
  triggeredAtElapsedMs: number | null;
  snoozeUntilElapsedMs: number | null;
  snoozeDurationSec: number;
  label: string;
}

export interface SessionHistoryRecord {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  plannedDurationSec: number;
  actualActiveSec: number;
  intervalSec: number;
  remindersDelivered: number;
  snoozeCount: number;
  status: 'completed' | 'stopped';
}

export interface SessionPreset {
  id: string;
  name: string;
  durationSec: number;
  intervalSec: number;
  soundId: SoundId;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  defaultSoundId: SoundId;
  defaultSoundEnabled: boolean;
  defaultVibrationEnabled: boolean;
  defaultVolume: number;
  defaultSnoozeSec: number;
  keepScreenAwake: boolean;
  notificationsEnabled: boolean;
}

export type PlatformKind = 'web' | 'android' | 'windows';

export interface PlatformCapabilities {
  platform: PlatformKind;
  supportsNotifications: boolean;
  supportsVibration: boolean;
  supportsBackgroundAudioLoop: boolean;
  supportsWakeLock: boolean;
  backgroundLimitationNote: string;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';
