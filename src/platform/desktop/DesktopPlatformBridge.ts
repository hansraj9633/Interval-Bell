import {PlatformCapabilities} from '../../types';
import {NotificationPayload, PlatformAdapter} from '../types';
import {WebPlatformAdapter} from '../web/WebPlatformAdapter';

interface ElectronIntervalAPI {
  showNotification?: (payload: NotificationPayload) => Promise<boolean>;
  cancelNotifications?: () => Promise<void>;
}

/**
 * Bridge adapter for Electron Windows desktop runtime.
 */
export class DesktopPlatformBridge extends WebPlatformAdapter implements PlatformAdapter {
  private getElectronAPI(): ElectronIntervalAPI | undefined {
    return (window as unknown as {electronAPI?: ElectronIntervalAPI}).electronAPI;
  }

  public override getCapabilities(): PlatformCapabilities {
    return {
      platform: 'windows',
      supportsNotifications: true,
      supportsVibration: false,
      supportsBackgroundAudioLoop: true,
      supportsWakeLock: true,
      backgroundLimitationNote:
        'When minimized to the Windows system tray, the desktop process keeps your session and reminder audio active.',
    };
  }

  public override async showNotification(payload: NotificationPayload): Promise<boolean> {
    const api = this.getElectronAPI();
    if (api?.showNotification) {
      return api.showNotification(payload);
    }
    return super.showNotification(payload);
  }

  public override async cancelNotifications(): Promise<void> {
    const api = this.getElectronAPI();
    if (api?.cancelNotifications) {
      await api.cancelNotifications();
      return;
    }
    await super.cancelNotifications();
  }
}
