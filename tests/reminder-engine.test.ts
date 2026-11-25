import {describe, expect, it} from 'vitest';
import {
  checkAndTriggerSnoozeAlert,
  createInitialAlertContext,
  dismissAlert,
  snoozeAlert,
  triggerPeriodicAlert,
} from '../src/engines/reminder-engine/ReminderEngine';

describe('Reminder Alert State Machine', () => {
  it('transitions WAITING -> ALERT_ACTIVE -> WAITING on dismiss', () => {
    let ctx = createInitialAlertContext(300);
    expect(ctx.state).toBe('WAITING');

    ctx = triggerPeriodicAlert(ctx, 1, 300_000);
    expect(ctx.state).toBe('ALERT_ACTIVE');
    expect(ctx.reminderIndex).toBe(1);
    expect(ctx.isSnoozeReminder).toBe(false);

    ctx = dismissAlert(ctx);
    expect(ctx.state).toBe('WAITING');
    expect(ctx.reminderIndex).toBeNull();
  });

  it('schedules snooze independently without breaking periodic schedule', () => {
    let ctx = createInitialAlertContext(300);
    ctx = triggerPeriodicAlert(ctx, 1, 300_000);

    // Snooze for 60s at 300s elapsed in a 1200s session
    ctx = snoozeAlert(ctx, 300_000, 1_200_000, 60);
    expect(ctx.state).toBe('SNOOZED');
    expect(ctx.snoozeUntilElapsedMs).toBe(360_000);

    // Before 360s -> not triggered
    const before = checkAndTriggerSnoozeAlert(ctx, 350_000);
    expect(before.triggered).toBe(false);

    // At 360s -> transitions back to ALERT_ACTIVE
    const atSnooze = checkAndTriggerSnoozeAlert(ctx, 360_000);
    expect(atSnooze.triggered).toBe(true);
    expect(atSnooze.context.state).toBe('ALERT_ACTIVE');
    expect(atSnooze.context.isSnoozeReminder).toBe(true);
  });
});
