import {NotificationPermissionState, PlatformCapabilities} from '../../types';
import {NotificationPayload, PlatformAdapter} from '../types';
import {WebPlatformAdapter} from '../web/WebPlatformAdapter';

interface CapacitorIntervalBridge {
  showNotification?: (payload: NotificationPayload) => Promise<boolean>;
  cancelNotifications?: () => Promise<void>;
  vibrateLoop?: (enabled: boolean) => void;
  requestNotificationPermission?: () => Promise<NotificationPermissionState>;
}

/**
 * Bridge adapter for Capacitor Android native runtime.
 * Delegates native scheduling/vibration when native plugin is present,
 * falling back cleanly to Web capabilities in browser contexts.
 */
export class AndroidPlatformBridge extends WebPlatformAdapter implements PlatformAdapter {
  private getBridge(): CapacitorIntervalBridge | undefined {
    const win = window as unknown as {
      Capacitor?: {Plugins?: {IntervalBellNative?: CapacitorIntervalBridge}};
    };
    return win.Capacitor?.Plugins?.IntervalBellNative;
  }

  public override getCapabilities(): PlatformCapabilities {
    return {
      platform: 'android',
      supportsNotifications: true,
      supportsVibration: true,
      supportsBackgroundAudioLoop: true,
      supportsWakeLock: true,
      backgroundLimitationNote:
        'Native Android notifications, alarm scheduling, and vibration respect OS battery optimization and Do Not Disturb settings.',
    };
  }

  public override async showNotification(payload: NotificationPayload): Promise<boolean> {
    const bridge = this.getBridge();
    if (bridge?.showNotification) {
      return bridge.showNotification(payload);
    }
    return super.showNotification(payload);
  }

  public override async cancelNotifications(): Promise<void> {
    const bridge = this.getBridge();
    if (bridge?.cancelNotifications) {
      await bridge.cancelNotifications();
      return;
    }
    await super.cancelNotifications();
  }

  public override startVibrationLoop(): void {
    const bridge = this.getBridge();
    if (bridge?.vibrateLoop) {
      bridge.vibrateLoop(true);
      return;
    }
    super.startVibrationLoop();
  }

  public override stopVibration(): void {
    const bridge = this.getBridge();
    if (bridge?.vibrateLoop) {
      bridge.vibrateLoop(false);
      return;
    }
    super.stopVibration();
  }
}
