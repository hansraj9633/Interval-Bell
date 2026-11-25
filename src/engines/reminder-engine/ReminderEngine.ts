import {ReminderAlertContext} from '../../types';

export function createInitialAlertContext(defaultSnoozeSec: number = 300): ReminderAlertContext {
  return {
    state: 'WAITING',
    reminderIndex: null,
    isSnoozeReminder: false,
    triggeredAtElapsedMs: null,
    snoozeUntilElapsedMs: null,
    snoozeDurationSec: defaultSnoozeSec,
    label: '',
  };
}

/**
 * Transitions WAITING | SNOOZED -> REMINDER_TRIGGERED -> ALERT_ACTIVE
 */
export function triggerPeriodicAlert(
  ctx: ReminderAlertContext,
  reminderIndex: number,
  elapsedMs: number
): ReminderAlertContext {
  // Periodic schedule triggers independently of any prior snooze
  return {
    ...ctx,
    state: 'ALERT_ACTIVE',
    reminderIndex,
    isSnoozeReminder: false,
    triggeredAtElapsedMs: elapsedMs,
    snoozeUntilElapsedMs: null,
    label: `Interval ${reminderIndex} reached`,
  };
}

/**
 * Transitions SNOOZED -> ALERT_ACTIVE when snooze deadline is reached
 */
export function checkAndTriggerSnoozeAlert(
  ctx: ReminderAlertContext,
  elapsedMs: number
): {context: ReminderAlertContext; triggered: boolean} {
  if (
    ctx.state === 'SNOOZED' &&
    ctx.snoozeUntilElapsedMs !== null &&
    elapsedMs >= ctx.snoozeUntilElapsedMs
  ) {
    return {
      triggered: true,
      context: {
        ...ctx,
        state: 'ALERT_ACTIVE',
        isSnoozeReminder: true,
        triggeredAtElapsedMs: elapsedMs,
        snoozeUntilElapsedMs: null,
        label: 'Snoozed reminder',
      },
    };
  }
  return {context: ctx, triggered: false};
}

/**
 * Transitions ALERT_ACTIVE -> WAITING (stops active sound/vibration immediately)
 */
export function dismissAlert(ctx: ReminderAlertContext): ReminderAlertContext {
  return {
    ...ctx,
    state: 'WAITING',
    reminderIndex: null,
    isSnoozeReminder: false,
    triggeredAtElapsedMs: null,
    snoozeUntilElapsedMs: null,
    label: '',
  };
}

/**
 * Transitions ALERT_ACTIVE -> SNOOZED without altering the periodic schedule.
 */
export function snoozeAlert(
  ctx: ReminderAlertContext,
  currentElapsedMs: number,
  totalDurationMs: number,
  snoozeDurationSec: number
): ReminderAlertContext {
  const snoozeMs = Math.max(10_000, snoozeDurationSec * 1000);
  // Schedule snooze before session completion; if remaining time is shorter than snooze, clamp safely
  const targetElapsed = Math.min(totalDurationMs - 2000, currentElapsedMs + snoozeMs);
  if (targetElapsed <= currentElapsedMs) {
    return dismissAlert(ctx);
  }

  return {
    ...ctx,
    state: 'SNOOZED',
    snoozeUntilElapsedMs: targetElapsed,
    snoozeDurationSec,
    label: `Snoozed for ${Math.round(snoozeDurationSec / 60)}m`,
  };
}
