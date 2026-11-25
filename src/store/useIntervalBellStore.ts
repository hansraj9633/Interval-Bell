import {create} from 'zustand';
import {audioEngine} from '../engines/audio-engine/AudioEngine';
import {getSoundById} from '../engines/audio-engine/sounds';
import {
  checkAndTriggerSnoozeAlert,
  createInitialAlertContext,
  dismissAlert as dismissAlertState,
  snoozeAlert as snoozeAlertState,
  triggerPeriodicAlert,
} from '../engines/reminder-engine/ReminderEngine';
import {
  buildHistoryRecord,
  createSession,
  pauseSession as pauseSessionEngine,
  restoreSessionAfterReopen,
  resumeSession as resumeSessionEngine,
  stopSession as stopSessionEngine,
  tickSession as tickSessionEngine,
} from '../engines/session-engine/SessionEngine';
import {platformAdapter} from '../platform';
import {
  addSessionHistory,
  clearAllSessionHistory,
  deletePreset,
  deleteSessionHistoryRecord,
  listPresets,
  listSessionHistory,
  resetAllDatabaseData,
  savePreset,
} from '../services/storage/db';
import {
  clearLocalStoragePreferences,
  DEFAULT_SETTINGS,
  loadActiveSession,
  loadAlertContext,
  loadSettings,
  saveActiveSession,
  saveAlertContext,
  saveSettings,
} from '../services/storage/settingsStorage';
import {
  ActiveSession,
  AlertPlayMode,
  AppRoute,
  AppSettings,
  NotificationPermissionState,
  ReminderAlertContext,
  SessionConfig,
  SessionHistoryRecord,
  SessionPreset,
} from '../types';
import {formatDurationHMS, generateId} from '../utils/time';
import {validateSessionConfig} from '../utils/validation';

interface IntervalBellState {
  isInitialized: boolean;
  route: AppRoute;
  settings: AppSettings;
  activeSession: ActiveSession | null;
  alertContext: ReminderAlertContext;
  lastCompletedRecord: SessionHistoryRecord | null;
  history: SessionHistoryRecord[];
  presets: SessionPreset[];
  draftConfig: SessionConfig;
  notificationPermission: NotificationPermissionState;

  // Actions
  initialize: () => Promise<void>;
  setRoute: (route: AppRoute) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateDraftConfig: (partial: Partial<SessionConfig>) => void;
  applyPresetToDraft: (preset: SessionPreset, andNavigateToSetup?: boolean) => void;
  requestNotificationPermission: () => Promise<NotificationPermissionState>;

  // Session lifecycle
  startSession: (config: SessionConfig) => {ok: boolean; error?: string};
  tick: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => Promise<void>;
  dismissAlert: () => void;
  snoozeAlert: (snoozeSec?: number) => void;
  setActiveAlertMode: (mode: AlertPlayMode) => void;
  clearCompletedSummary: () => void;
  dismissClockNotice: () => void;

  // Presets & History
  createOrUpdatePreset: (
    config: SessionConfig,
    existingId?: string
  ) => Promise<{ok: boolean; error?: string}>;
  removePreset: (id: string) => Promise<void>;
  removeHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

let lastPersistCheckpoint = 0;

function fireAlertEffects(session: ActiveSession, ctx: ReminderAlertContext, notifyEnabled: boolean) {
  const alertMode: AlertPlayMode = session.alertMode ?? 'once';
  if (session.soundEnabled) {
    if (alertMode === 'continuous') {
      audioEngine.startLoop(session.soundId, session.volume);
    } else {
      audioEngine.playOnce(session.soundId, session.volume);
    }
  }
  if (session.vibrationEnabled) {
    if (alertMode === 'continuous') {
      platformAdapter.startVibrationLoop();
    } else {
      platformAdapter.vibrateOnce();
    }
  }
  const soundName = getSoundById(session.soundId).name;
  const remainingSec = Math.max(0, Math.round((session.durationSec * 1000 - session.activeElapsedMs) / 1000));
  const shouldShowOSNotification =
    notifyEnabled && (typeof document === 'undefined' || document.visibilityState !== 'visible');

  if (shouldShowOSNotification) {
    void platformAdapter.showNotification({
      title: `${session.name} — ${ctx.isSnoozeReminder ? 'Snoozed Reminder' : 'Interval Reminder'}`,
      body:
        alertMode === 'continuous'
          ? `${formatDurationHMS(remainingSec)} remaining · Sound: ${soundName}. Open app to dismiss or snooze.`
          : `${formatDurationHMS(remainingSec)} remaining · Chime ${session.remindersDelivered} (${soundName}).`,
      tag: 'interval-bell-reminder',
      requireInteraction: alertMode === 'continuous',
    });
  }
}

function stopAllAlertEffects() {
  audioEngine.stop();
  platformAdapter.stopVibration();
  void platformAdapter.cancelNotifications();
}

export const useIntervalBellStore = create<IntervalBellState>((set, get) => ({
  isInitialized: false,
  route: 'home',
  settings: DEFAULT_SETTINGS,
  activeSession: null,
  alertContext: createInitialAlertContext(DEFAULT_SETTINGS.defaultSnoozeSec),
  lastCompletedRecord: null,
  history: [],
  presets: [],
  draftConfig: {
    name: '',
    durationSec: 3600,
    intervalSec: 900,
    soundId: DEFAULT_SETTINGS.defaultSoundId,
    soundEnabled: DEFAULT_SETTINGS.defaultSoundEnabled,
    vibrationEnabled: DEFAULT_SETTINGS.defaultVibrationEnabled,
    volume: DEFAULT_SETTINGS.defaultVolume,
    alertMode: DEFAULT_SETTINGS.defaultAlertMode,
  },
  notificationPermission: 'default',

  initialize: async () => {
    if (get().isInitialized) return;
    const settings = loadSettings();
    const [history, presets] = await Promise.all([listSessionHistory(), listPresets()]);
    const persistedSession = loadActiveSession();
    const persistedAlert = loadAlertContext();
    const notificationPermission = platformAdapter.getNotificationPermission();

    let activeSession: ActiveSession | null = null;
    let alertContext = createInitialAlertContext(settings.defaultSnoozeSec);
    let lastCompletedRecord: SessionHistoryRecord | null = null;
    let updatedHistory = history;
    let initialRoute: AppRoute = 'home';

    if (persistedSession && (persistedSession.status === 'running' || persistedSession.status === 'paused')) {
      const restored = restoreSessionAfterReopen(persistedSession);
      if (restored.completedNow) {
        const record = buildHistoryRecord(restored.session, restored.session.endAt, 'completed');
        await addSessionHistory(record);
        updatedHistory = [record, ...history];
        lastCompletedRecord = record;
        saveActiveSession(null);
        saveAlertContext(null);
        initialRoute = 'active';
      } else {
        activeSession = restored.session;
        if (
          restored.triggeredReminderIndex !== null &&
          (restored.session.alertMode ?? 'once') === 'continuous'
        ) {
          alertContext = triggerPeriodicAlert(
            alertContext,
            restored.triggeredReminderIndex,
            restored.session.activeElapsedMs
          );
        } else if (persistedAlert && (restored.session.alertMode ?? 'once') === 'continuous') {
          alertContext = persistedAlert;
        }
        saveActiveSession(activeSession);
        saveAlertContext(alertContext);
        initialRoute = 'active';
      }
    }

    set({
      isInitialized: true,
      settings,
      history: updatedHistory,
      presets,
      activeSession,
      alertContext,
      lastCompletedRecord,
      route: initialRoute,
      notificationPermission,
      draftConfig: {
        name: '',
        durationSec: 3600,
        intervalSec: 900,
        soundId: settings.defaultSoundId,
        soundEnabled: settings.defaultSoundEnabled,
        vibrationEnabled: settings.defaultVibrationEnabled,
        volume: settings.defaultVolume,
        alertMode: settings.defaultAlertMode,
      },
    });
  },

  setRoute: (route) => set({route}),

  updateSettings: (partial) => {
    const next = {...get().settings, ...partial};
    saveSettings(next);
    if (partial.defaultVolume !== undefined) {
      audioEngine.setVolume(partial.defaultVolume);
    }
    if (partial.keepScreenAwake !== undefined && get().activeSession?.status === 'running') {
      void platformAdapter.setWakeLock(partial.keepScreenAwake);
    }
    set({settings: next});
  },

  updateDraftConfig: (partial) => {
    set((state) => ({
      draftConfig: {...state.draftConfig, ...partial},
    }));
  },

  applyPresetToDraft: (preset, andNavigateToSetup = true) => {
    set({
      draftConfig: {
        name: preset.name,
        durationSec: preset.durationSec,
        intervalSec: preset.intervalSec,
        soundId: preset.soundId,
        soundEnabled: preset.soundEnabled,
        vibrationEnabled: preset.vibrationEnabled,
        volume: preset.volume,
        alertMode: preset.alertMode ?? get().settings.defaultAlertMode,
      },
      ...(andNavigateToSetup ? {route: 'setup' as AppRoute} : {}),
    });
  },

  requestNotificationPermission: async () => {
    const permission = await platformAdapter.requestNotificationPermission();
    set({notificationPermission: permission});
    return permission;
  },

  startSession: (config) => {
    const current = get().activeSession;
    if (current && (current.status === 'running' || current.status === 'paused')) {
      return {
        ok: false,
        error: 'A session is already active. Stop the current session before starting a new one.',
      };
    }

    const validation = validateSessionConfig(config);
    if (!validation.valid || !validation.data) {
      const firstError =
        validation.errors.durationSec ||
        validation.errors.intervalSec ||
        validation.errors.name ||
        validation.errors.form ||
        'Please check your session configuration.';
      return {ok: false, error: firstError};
    }

    audioEngine.unlock();
    stopAllAlertEffects();

    const session = createSession(validation.data);
    const alertContext = createInitialAlertContext(get().settings.defaultSnoozeSec);

    saveActiveSession(session);
    saveAlertContext(alertContext);
    lastPersistCheckpoint = Date.now();

    if (get().settings.keepScreenAwake) {
      void platformAdapter.setWakeLock(true);
    }

    set({
      activeSession: session,
      alertContext,
      lastCompletedRecord: null,
      route: 'active',
    });

    return {ok: true};
  },

  tick: () => {
    const {activeSession, alertContext, settings, history} = get();
    if (!activeSession || activeSession.status !== 'running') return;

    const result = tickSessionEngine(activeSession);

    if (result.completedNow) {
      stopAllAlertEffects();
      void platformAdapter.setWakeLock(false);

      if (result.session.soundEnabled) {
        audioEngine.playCompletionCue(result.session.soundId, result.session.volume);
      }

      const record = buildHistoryRecord(result.session, result.session.endAt, 'completed');
      void addSessionHistory(record);
      saveActiveSession(null);
      saveAlertContext(null);

      if (
        settings.notificationsEnabled &&
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        void platformAdapter.showNotification({
          title: `${result.session.name} — Completed`,
          body: `Finished ${formatDurationHMS(result.session.durationSec)} focus session.`,
          tag: 'interval-bell-complete',
          requireInteraction: false,
        });
      }

      set({
        activeSession: null,
        alertContext: createInitialAlertContext(settings.defaultSnoozeSec),
        lastCompletedRecord: record,
        history: [record, ...history],
      });
      return;
    }

    let nextAlert = alertContext;
    let shouldTriggerMedia = false;

    if (result.triggeredReminderIndex !== null) {
      if ((result.session.alertMode ?? 'once') === 'continuous') {
        nextAlert = triggerPeriodicAlert(
          alertContext,
          result.triggeredReminderIndex,
          result.session.activeElapsedMs
        );
      } else {
        nextAlert = createInitialAlertContext(settings.defaultSnoozeSec);
      }
      shouldTriggerMedia = true;
    } else {
      const snoozeCheck = checkAndTriggerSnoozeAlert(alertContext, result.session.activeElapsedMs);
      if (snoozeCheck.triggered) {
        nextAlert = snoozeCheck.context;
        shouldTriggerMedia = true;
      }
    }

    if (shouldTriggerMedia) {
      fireAlertEffects(result.session, nextAlert, settings.notificationsEnabled);
      saveActiveSession(result.session);
      saveAlertContext(nextAlert);
      lastPersistCheckpoint = Date.now();
    } else if (Date.now() - lastPersistCheckpoint > 2000 || result.clockNotice) {
      saveActiveSession(result.session);
      lastPersistCheckpoint = Date.now();
    }

    set({
      activeSession: result.session,
      alertContext: nextAlert,
    });
  },

  pauseSession: () => {
    const {activeSession, alertContext, settings} = get();
    if (!activeSession || activeSession.status !== 'running') return;

    stopAllAlertEffects();
    void platformAdapter.setWakeLock(false);

    const paused = pauseSessionEngine(activeSession);
    const nextAlert =
      alertContext.state === 'ALERT_ACTIVE' ? dismissAlertState(alertContext) : alertContext;

    saveActiveSession(paused);
    saveAlertContext(nextAlert);

    set({
      activeSession: paused,
      alertContext: nextAlert,
    });
    if (paused.status === 'completed') {
      const record = buildHistoryRecord(paused, paused.endAt, 'completed');
      void addSessionHistory(record);
      saveActiveSession(null);
      set({
        activeSession: null,
        lastCompletedRecord: record,
        history: [record, ...get().history],
        alertContext: createInitialAlertContext(settings.defaultSnoozeSec),
      });
    }
  },

  resumeSession: () => {
    const {activeSession, settings} = get();
    if (!activeSession || activeSession.status !== 'paused') return;

    audioEngine.unlock();
    const resumed = resumeSessionEngine(activeSession);
    saveActiveSession(resumed);
    lastPersistCheckpoint = Date.now();

    if (settings.keepScreenAwake) {
      void platformAdapter.setWakeLock(true);
    }

    set({activeSession: resumed});
  },

  stopSession: async () => {
    const {activeSession, settings, history} = get();
    if (!activeSession) return;

    stopAllAlertEffects();
    void platformAdapter.setWakeLock(false);

    const {record} = stopSessionEngine(activeSession);
    await addSessionHistory(record);
    saveActiveSession(null);
    saveAlertContext(null);

    set({
      activeSession: null,
      alertContext: createInitialAlertContext(settings.defaultSnoozeSec),
      lastCompletedRecord: record,
      history: [record, ...history],
    });
  },

  dismissAlert: () => {
    stopAllAlertEffects();
    const nextAlert = dismissAlertState(get().alertContext);
    saveAlertContext(nextAlert);
    set({alertContext: nextAlert});
  },

  snoozeAlert: (snoozeSec) => {
    const {activeSession, alertContext, settings} = get();
    stopAllAlertEffects();
    if (!activeSession) return;

    const chosenSnoozeSec = snoozeSec ?? settings.defaultSnoozeSec;
    const nextAlert = snoozeAlertState(
      alertContext,
      activeSession.activeElapsedMs,
      activeSession.durationSec * 1000,
      chosenSnoozeSec
    );
    const updatedSession: ActiveSession = {
      ...activeSession,
      snoozeCount: activeSession.snoozeCount + 1,
    };

    saveActiveSession(updatedSession);
    saveAlertContext(nextAlert);

    set({
      activeSession: updatedSession,
      alertContext: nextAlert,
    });
  },

  setActiveAlertMode: (mode) => {
    const {activeSession, alertContext} = get();
    if (!activeSession) return;
    const updatedSession: ActiveSession = {
      ...activeSession,
      alertMode: mode,
    };
    let nextAlert = alertContext;
    if (mode === 'once' && alertContext.state !== 'WAITING') {
      stopAllAlertEffects();
      nextAlert = dismissAlertState(alertContext);
      saveAlertContext(nextAlert);
    }
    saveActiveSession(updatedSession);
    set({
      activeSession: updatedSession,
      alertContext: nextAlert,
    });
  },

  clearCompletedSummary: () => {
    set({lastCompletedRecord: null, route: 'home'});
  },

  dismissClockNotice: () => {
    const current = get().activeSession;
    if (!current) return;
    const updated = {...current, clockNotice: null};
    saveActiveSession(updated);
    set({activeSession: updated});
  },

  createOrUpdatePreset: async (config, existingId) => {
    const validation = validateSessionConfig(config);
    if (!validation.valid || !validation.data) {
      const firstError =
        validation.errors.durationSec ||
        validation.errors.intervalSec ||
        validation.errors.name ||
        validation.errors.form ||
        'Invalid preset configuration.';
      return {ok: false, error: firstError};
    }

    const now = Date.now();
    const existing = existingId ? get().presets.find((p) => p.id === existingId) : undefined;
    const preset: SessionPreset = {
      id: existing?.id ?? generateId(),
      name: validation.data.name || 'Custom Preset',
      durationSec: validation.data.durationSec,
      intervalSec: validation.data.intervalSec,
      soundId: validation.data.soundId,
      soundEnabled: validation.data.soundEnabled,
      vibrationEnabled: validation.data.vibrationEnabled,
      volume: validation.data.volume,
      alertMode: validation.data.alertMode ?? 'once',
      isDefault: existing?.isDefault ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await savePreset(preset);
    const presets = await listPresets();
    set({presets});
    return {ok: true};
  },

  removePreset: async (id) => {
    await deletePreset(id);
    const presets = await listPresets();
    set({presets});
  },

  removeHistoryItem: async (id) => {
    await deleteSessionHistoryRecord(id);
    set((state) => ({
      history: state.history.filter((h) => h.id !== id),
    }));
  },

  clearHistory: async () => {
    await clearAllSessionHistory();
    set({history: []});
  },

  resetAllData: async () => {
    stopAllAlertEffects();
    void platformAdapter.setWakeLock(false);
    await resetAllDatabaseData();
    clearLocalStoragePreferences();
    const presets = await listPresets();
    set({
      settings: DEFAULT_SETTINGS,
      activeSession: null,
      alertContext: createInitialAlertContext(DEFAULT_SETTINGS.defaultSnoozeSec),
      lastCompletedRecord: null,
      history: [],
      presets,
      route: 'home',
      draftConfig: {
        name: '',
        durationSec: 3600,
        intervalSec: 900,
        soundId: DEFAULT_SETTINGS.defaultSoundId,
        soundEnabled: DEFAULT_SETTINGS.defaultSoundEnabled,
        vibrationEnabled: DEFAULT_SETTINGS.defaultVibrationEnabled,
        volume: DEFAULT_SETTINGS.defaultVolume,
        alertMode: DEFAULT_SETTINGS.defaultAlertMode,
      },
    });
  },
}));
