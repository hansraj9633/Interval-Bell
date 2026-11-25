import {NotificationPermissionState, PlatformCapabilities} from '../../types';
import {NotificationPayload, PlatformAdapter} from '../types';

export class WebPlatformAdapter implements PlatformAdapter {
  private vibrationInterval: ReturnType<typeof setInterval> | null = null;
  private activeNotifications: Notification[] = [];
  private wakeLockSentinel: WakeLockSentinel | null = null;

  public getCapabilities(): PlatformCapabilities {
    const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window;
    const supportsVibration =
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    const supportsWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

    return {
      platform: 'web',
      supportsNotifications,
      supportsVibration,
      supportsBackgroundAudioLoop: false,
      supportsWakeLock,
      backgroundLimitationNote:
        'In web browsers, timer progress stays accurate across background tabs, and notifications deliver when permitted. However, a closed browser tab cannot execute a continuous audio loop.',
    };
  }

  public getNotificationPermission(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public async requestNotificationPermission(): Promise<NotificationPermissionState> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch {
      return Notification.permission;
    }
  }

  public async showNotification(payload: NotificationPayload): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      // Prefer Service Worker notification when active so PWA background notifications work cleanly
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(payload.title, {
            body: payload.body,
            tag: payload.tag ?? 'interval-bell-reminder',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            requireInteraction: payload.requireInteraction ?? true,
          });
          return true;
        }
      }

      const n = new Notification(payload.title, {
        body: payload.body,
        tag: payload.tag ?? 'interval-bell-reminder',
        icon: '/pwa-192x192.png',
        requireInteraction: payload.requireInteraction ?? false,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      this.activeNotifications.push(n);
      return true;
    } catch {
      return false;
    }
  }

  public async cancelNotifications(): Promise<void> {
    for (const n of this.activeNotifications) {
      try {
        n.close();
      } catch {
        // ignore
      }
    }
    this.activeNotifications = [];

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.getNotifications === 'function') {
          const list = await reg.getNotifications({tag: 'interval-bell-reminder'});
          for (const item of list) {
            item.close();
          }
        }
      } catch {
        // ignore
      }
    }
  }

  public startVibrationLoop(): void {
    this.stopVibration();
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }
    const pulse = () => {
      try {
        navigator.vibrate([260, 140, 260]);
      } catch {
        // ignore
      }
    };
    pulse();
    this.vibrationInterval = setInterval(pulse, 2200);
  }

  public stopVibration(): void {
    if (this.vibrationInterval !== null) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }
  }

  public async setWakeLock(enabled: boolean): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }
    try {
      if (enabled) {
        if (!this.wakeLockSentinel) {
          this.wakeLockSentinel = await navigator.wakeLock.request('screen');
          this.wakeLockSentinel.addEventListener('release', () => {
            this.wakeLockSentinel = null;
          });
        }
        return true;
      } else if (this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
      return false;
    } catch {
      return false;
    }
  }
}
