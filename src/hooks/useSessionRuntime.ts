import {useEffect} from 'react';
import {getRemainingMs} from '../engines/session-engine/SessionEngine';
import {useIntervalBellStore} from '../store/useIntervalBellStore';
import {formatDurationHMS} from '../utils/time';

export function useSessionRuntime(): void {
  const activeSession = useIntervalBellStore((s) => s.activeSession);
  const alertState = useIntervalBellStore((s) => s.alertContext.state);
  const tick = useIntervalBellStore((s) => s.tick);

  // High-precision 250ms tick while running
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'running') return;
    const interval = setInterval(() => {
      tick();
    }, 250);
    return () => clearInterval(interval);
  }, [activeSession?.id, activeSession?.status, tick]);

  // Immediately reconcile on tab visibility return (counters browser background throttling)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [tick]);

  // Update document title while a session is active
  useEffect(() => {
    if (!activeSession) {
      document.title = 'Interval Bell — Pause. Refocus. Continue.';
      return;
    }
    const remaining = formatDurationHMS(Math.ceil(getRemainingMs(activeSession) / 1000));
    if (alertState === 'ALERT_ACTIVE') {
      document.title = `Bell Alert · ${remaining} — Interval Bell`;
    } else if (activeSession.status === 'paused') {
      document.title = `Paused (${remaining}) — Interval Bell`;
    } else {
      document.title = `${remaining} · ${activeSession.name} — Interval Bell`;
    }
  }, [activeSession, alertState]);
}
