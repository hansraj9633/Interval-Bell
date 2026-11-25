import {
  ActiveSession,
  ClockAdjustmentNotice,
  SessionConfig,
  SessionHistoryRecord,
} from '../../types';
import {computeReminderSchedule, generateId} from '../../utils/time';

export interface SessionTickResult {
  session: ActiveSession;
  triggeredReminderIndex: number | null;
  completedNow: boolean;
  clockNotice: ClockAdjustmentNotice | null;
}

const CLOCK_DRIFT_THRESHOLD_MS = 5000;

/**
 * Pure, UI-independent session timing and scheduling engine.
 */
export function createSession(
  config: SessionConfig,
  nowWall: number = Date.now(),
  nowPerf: number | null = typeof performance !== 'undefined' ? performance.now() : null
): ActiveSession {
  const durationMs = config.durationSec * 1000;
  return {
    id: generateId(),
    name: config.name.trim() || 'Focus Session',
    durationSec: config.durationSec,
    intervalSec: config.intervalSec,
    soundId: config.soundId,
    soundEnabled: config.soundEnabled,
    vibrationEnabled: config.vibrationEnabled,
    volume: config.volume,
    startedAt: nowWall,
    endAt: nowWall + durationMs,
    totalPausedMs: 0,
    pausedAt: null,
    activeElapsedMs: 0,
    status: 'running',
    remindersDelivered: 0,
    snoozeCount: 0,
    deliveredScheduleIndices: [],
    lastTickWallTime: nowWall,
    lastTickPerfTime: nowPerf,
    clockNotice: null,
  };
}

export function getRemainingMs(session: ActiveSession): number {
  return Math.max(0, session.durationSec * 1000 - session.activeElapsedMs);
}

export function getNextScheduledReminderOffsetSec(session: ActiveSession): number | null {
  const schedule = computeReminderSchedule(session.durationSec, session.intervalSec);
  const elapsedSec = session.activeElapsedMs / 1000;
  for (let i = 0; i < schedule.length; i++) {
    const idx = i + 1;
    if (!session.deliveredScheduleIndices.includes(idx) && schedule[i] > elapsedSec) {
      return schedule[i];
    }
  }
  return null;
}

export function getMsUntilNextReminder(session: ActiveSession): number | null {
  const nextOffsetSec = getNextScheduledReminderOffsetSec(session);
  if (nextOffsetSec === null) return null;
  return Math.max(0, nextOffsetSec * 1000 - session.activeElapsedMs);
}

/**
 * Advances a running session while guarding against system clock manipulation.
 * Policy: When wall-clock delta diverges from monotonic performance clock by >5s
 * (or moves backwards), trust the monotonic clock delta for elapsed focus progress
 * and rebase wall-clock anchors cleanly.
 */
export function tickSession(
  session: ActiveSession,
  nowWall: number = Date.now(),
  nowPerf: number | null = typeof performance !== 'undefined' ? performance.now() : null
): SessionTickResult {
  if (session.status !== 'running') {
    return {
      session,
      triggeredReminderIndex: null,
      completedNow: false,
      clockNotice: null,
    };
  }

  let wallDelta = nowWall - session.lastTickWallTime;
  let clockNotice: ClockAdjustmentNotice | null = null;
  let effectiveDelta = wallDelta;

  if (nowPerf !== null && session.lastTickPerfTime !== null) {
    const monoDelta = Math.max(0, nowPerf - session.lastTickPerfTime);
    const drift = wallDelta - monoDelta;
    if (Math.abs(drift) > CLOCK_DRIFT_THRESHOLD_MS || wallDelta < -1000) {
      effectiveDelta = monoDelta;
      const direction: 'forward' | 'backward' = drift >= 0 ? 'forward' : 'backward';
      clockNotice = {
        detectedAt: nowWall,
        driftMs: Math.abs(drift),
        direction,
        message: `System clock shifted ${direction} by ${Math.round(Math.abs(drift) / 1000)}s. Timer anchors were re-synced automatically to protect your session.`,
      };
    }
  } else if (wallDelta < 0) {
    effectiveDelta = 0;
    clockNotice = {
      detectedAt: nowWall,
      driftMs: Math.abs(wallDelta),
      direction: 'backward',
      message:
        'Backward device clock change detected. Remaining time was preserved using your last verified checkpoint.',
    };
  }

  const totalDurationMs = session.durationSec * 1000;
  const nextElapsedMs = Math.min(totalDurationMs, session.activeElapsedMs + Math.max(0, effectiveDelta));
  const newEndAt = nowWall + (totalDurationMs - nextElapsedMs);

  // Completion takes precedence over any reminder at the exact end time
  if (nextElapsedMs >= totalDurationMs) {
    const completedSession: ActiveSession = {
      ...session,
      activeElapsedMs: totalDurationMs,
      endAt: nowWall,
      status: 'completed',
      lastTickWallTime: nowWall,
      lastTickPerfTime: nowPerf,
      clockNotice: clockNotice ?? session.clockNotice,
    };
    return {
      session: completedSession,
      triggeredReminderIndex: null,
      completedNow: true,
      clockNotice,
    };
  }

  const schedule = computeReminderSchedule(session.durationSec, session.intervalSec);
  const delivered = [...session.deliveredScheduleIndices];
  let newlyTriggeredIndex: number | null = null;

  for (let i = 0; i < schedule.length; i++) {
    const reminderIndex = i + 1;
    const targetMs = schedule[i] * 1000;
    if (!delivered.includes(reminderIndex) && nextElapsedMs >= targetMs) {
      delivered.push(reminderIndex);
      // If multiple intervals elapsed (e.g. tab slept), deliver the latest one without stacking
      newlyTriggeredIndex = reminderIndex;
    }
  }

  const updatedSession: ActiveSession = {
    ...session,
    activeElapsedMs: nextElapsedMs,
    endAt: clockNotice ? newEndAt : session.endAt,
    deliveredScheduleIndices: delivered,
    remindersDelivered:
      newlyTriggeredIndex !== null ? session.remindersDelivered + 1 : session.remindersDelivered,
    lastTickWallTime: nowWall,
    lastTickPerfTime: nowPerf,
    clockNotice: clockNotice ?? session.clockNotice,
  };

  return {
    session: updatedSession,
    triggeredReminderIndex: newlyTriggeredIndex,
    completedNow: false,
    clockNotice,
  };
}

export function pauseSession(
  session: ActiveSession,
  nowWall: number = Date.now(),
  nowPerf: number | null = typeof performance !== 'undefined' ? performance.now() : null
): ActiveSession {
  if (session.status !== 'running') return session;
  const ticked = tickSession(session, nowWall, nowPerf).session;
  if (ticked.status === 'completed') return ticked;

  return {
    ...ticked,
    status: 'paused',
    pausedAt: nowWall,
    lastTickWallTime: nowWall,
    lastTickPerfTime: nowPerf,
  };
}

export function resumeSession(
  session: ActiveSession,
  nowWall: number = Date.now(),
  nowPerf: number | null = typeof performance !== 'undefined' ? performance.now() : null
): ActiveSession {
  if (session.status !== 'paused') return session;
  const pausedDuration =
    session.pausedAt !== null && nowWall >= session.pausedAt ? nowWall - session.pausedAt : 0;
  const remainingMs = getRemainingMs(session);

  return {
    ...session,
    status: 'running',
    pausedAt: null,
    totalPausedMs: session.totalPausedMs + pausedDuration,
    endAt: nowWall + remainingMs,
    lastTickWallTime: nowWall,
    lastTickPerfTime: nowPerf,
  };
}

export function stopSession(
  session: ActiveSession,
  nowWall: number = Date.now(),
  nowPerf: number | null = typeof performance !== 'undefined' ? performance.now() : null
): {session: ActiveSession; record: SessionHistoryRecord} {
  const current =
    session.status === 'running' ? tickSession(session, nowWall, nowPerf).session : session;

  const stoppedSession: ActiveSession = {
    ...current,
    status: 'stopped',
    pausedAt: null,
    lastTickWallTime: nowWall,
    lastTickPerfTime: nowPerf,
  };

  return {
    session: stoppedSession,
    record: buildHistoryRecord(stoppedSession, nowWall, 'stopped'),
  };
}

export function buildHistoryRecord(
  session: ActiveSession,
  endedAt: number,
  status: 'completed' | 'stopped'
): SessionHistoryRecord {
  return {
    id: session.id,
    name: session.name || 'Focus Session',
    startedAt: session.startedAt,
    endedAt,
    plannedDurationSec: session.durationSec,
    actualActiveSec: Math.min(session.durationSec, Math.round(session.activeElapsedMs / 1000)),
    intervalSec: session.intervalSec,
    remindersDelivered: session.remindersDelivered,
    snoozeCount: session.snoozeCount,
    status,
  };
}

/**
 * Restores a persisted session when the app reopens.
 * Resets monotonic reference (since previous runtime ended) and catches up elapsed time safely.
 */
export function restoreSessionAfterReopen(
  persisted: ActiveSession,
  nowWall: number = Date.now(),
  nowPerf: number | null = typeof performance !== 'undefined' ? performance.now() : null
): SessionTickResult {
  const reanchored: ActiveSession = {
    ...persisted,
    lastTickPerfTime: null,
  };

  if (reanchored.status !== 'running') {
    return {
      session: reanchored,
      triggeredReminderIndex: null,
      completedNow: false,
      clockNotice: null,
    };
  }

  return tickSession(reanchored, nowWall, nowPerf);
}
