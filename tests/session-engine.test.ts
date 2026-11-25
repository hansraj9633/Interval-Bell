import {describe, expect, it} from 'vitest';
import {
  createSession,
  getMsUntilNextReminder,
  getRemainingMs,
  pauseSession,
  restoreSessionAfterReopen,
  resumeSession,
  stopSession,
  tickSession,
} from '../src/engines/session-engine/SessionEngine';
import {SessionConfig} from '../src/types';
import {computeReminderSchedule} from '../src/utils/time';
import {validateSessionConfig} from '../src/utils/validation';

const baseConfig: SessionConfig = {
  name: 'Test Session',
  durationSec: 1200, // 20 min
  intervalSec: 300, // 5 min
  soundId: 'soft-bell',
  soundEnabled: true,
  vibrationEnabled: true,
  volume: 0.8,
};

describe('Validation & Exact Reminder Scheduling', () => {
  it('validates 20-minute session with 5-minute interval produces 3 reminders', () => {
    const schedule = computeReminderSchedule(1200, 300);
    expect(schedule).toEqual([300, 600, 900]);
  });

  it('validates 1-hour session with 15-minute interval produces 3 reminders', () => {
    const schedule = computeReminderSchedule(3600, 900);
    expect(schedule).toEqual([900, 1800, 2700]);
  });

  it('validates 3-hour session with 30-minute interval produces 5 reminders and completion takes precedence', () => {
    const schedule = computeReminderSchedule(10800, 1800);
    expect(schedule).toEqual([1800, 3600, 5400, 7200, 9000]);
    expect(schedule).not.toContain(10800);
  });

  it('rejects interval greater than or equal to duration', () => {
    const res = validateSessionConfig({...baseConfig, durationSec: 600, intervalSec: 600});
    expect(res.valid).toBe(false);
    expect(res.errors.intervalSec).toBeDefined();
  });

  it('rejects zero or negative duration', () => {
    const res = validateSessionConfig({...baseConfig, durationSec: 0, intervalSec: 60});
    expect(res.valid).toBe(false);
  });
});

describe('Session Engine Lifecycle', () => {
  it('triggers exact reminders and completes cleanly at duration end', () => {
    let wall = 1_000_000;
    let perf = 10_000;
    let session = createSession(baseConfig, wall, perf);

    // Advance 5m (300s) -> Reminder 1
    wall += 300_000;
    perf += 300_000;
    let tick = tickSession(session, wall, perf);
    expect(tick.triggeredReminderIndex).toBe(1);
    expect(tick.completedNow).toBe(false);
    session = tick.session;

    // Advance 5m -> Reminder 2
    wall += 300_000;
    perf += 300_000;
    tick = tickSession(session, wall, perf);
    expect(tick.triggeredReminderIndex).toBe(2);
    session = tick.session;

    // Advance 5m -> Reminder 3
    wall += 300_000;
    perf += 300_000;
    tick = tickSession(session, wall, perf);
    expect(tick.triggeredReminderIndex).toBe(3);
    session = tick.session;

    // Advance final 5m -> Completed, NO reminder 4
    wall += 300_000;
    perf += 300_000;
    tick = tickSession(session, wall, perf);
    expect(tick.triggeredReminderIndex).toBeNull();
    expect(tick.completedNow).toBe(true);
    expect(tick.session.status).toBe('completed');
    expect(tick.session.remindersDelivered).toBe(3);
  });

  it('freezes remaining time and next reminder across a 20-minute pause', () => {
    const longConfig: SessionConfig = {
      ...baseConfig,
      durationSec: 10800, // 3 hours
      intervalSec: 1800, // 30 minutes
    };

    let wall = 2_000_000;
    let perf = 1_000;
    let session = createSession(longConfig, wall, perf);

    // Run 1 hour (3600s -> 2 hours remaining) minus 10m? Let's run 50m (3000s) -> next reminder at 60m (10m away)
    // Wait: PRD example: 2 hours remaining (3600s elapsed), next reminder in 10 minutes (say interval 2100s? Or 2h remaining after 20m elapsed of 2h20m).
    // Let's advance 50m on a 2h50m session or advance 3600s - 600s = 3000s:
    wall += 3_600_000;
    perf += 3_600_000;
    session = tickSession(session, wall, perf).session;
    // Now 2 hours remaining (7200s), next reminder at 5400s (30m away). Advance 20 more minutes (1200s) on a 3h20m session, or check exact remaining:
    const remBeforePause = getRemainingMs(session);
    const nextBeforePause = getMsUntilNextReminder(session);

    session = pauseSession(session, wall, perf);
    expect(session.status).toBe('paused');

    // Time passes while paused (20 minutes = 1,200,000 ms)
    wall += 1_200_000;
    perf += 1_200_000;
    const whilePaused = tickSession(session, wall, perf);
    expect(whilePaused.triggeredReminderIndex).toBeNull();
    expect(getRemainingMs(whilePaused.session)).toBe(remBeforePause);

    // Resume after 20 minutes
    session = resumeSession(session, wall, perf);
    expect(session.status).toBe('running');
    expect(getRemainingMs(session)).toBe(remBeforePause);
    expect(getMsUntilNextReminder(session)).toBe(nextBeforePause);
    expect(session.totalPausedMs).toBe(1_200_000);
  });

  it('detects device clock forward/backward jumps and preserves timer integrity', () => {
    let wall = 5_000_000;
    let perf = 10_000;
    let session = createSession(baseConfig, wall, perf);

    // Real 10 seconds elapsed, but user jumps system clock forward by 2 hours!
    perf += 10_000;
    wall += 7_200_000;
    const forwardTick = tickSession(session, wall, perf);
    expect(forwardTick.clockNotice).not.toBeNull();
    expect(forwardTick.clockNotice?.direction).toBe('forward');
    expect(forwardTick.completedNow).toBe(false);
    expect(forwardTick.session.activeElapsedMs).toBe(10_000);
    expect(getRemainingMs(forwardTick.session)).toBe(1_190_000);

    // Real 5 seconds elapsed, but user turns system clock backward by 1 hour!
    session = forwardTick.session;
    perf += 5_000;
    wall -= 3_600_000;
    const backwardTick = tickSession(session, wall, perf);
    expect(backwardTick.clockNotice).not.toBeNull();
    expect(backwardTick.clockNotice?.direction).toBe('backward');
    expect(backwardTick.session.activeElapsedMs).toBe(15_000);
  });

  it('restores running session accurately after app reopen', () => {
    const startWall = 10_000_000;
    const session = createSession(baseConfig, startWall, 100);

    // App closed for 6 minutes (360s), reopened
    const reopenWall = startWall + 360_000;
    const restored = restoreSessionAfterReopen(session, reopenWall, 50);
    expect(restored.session.activeElapsedMs).toBe(360_000);
    expect(restored.triggeredReminderIndex).toBe(1);
    expect(getRemainingMs(restored.session)).toBe(840_000);
  });

  it('builds accurate history record on early stop', () => {
    let wall = 10_000;
    let perf = 100;
    let session = createSession(baseConfig, wall, perf);
    wall += 310_000;
    perf += 310_000;
    session = tickSession(session, wall, perf).session;

    const {record} = stopSession(session, wall, perf);
    expect(record.status).toBe('stopped');
    expect(record.actualActiveSec).toBe(310);
    expect(record.remindersDelivered).toBe(1);
  });
});
