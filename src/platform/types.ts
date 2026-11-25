import {NotificationPermissionState, PlatformCapabilities} from '../types';

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface PlatformAdapter {
  getCapabilities(): PlatformCapabilities;
  getNotificationPermission(): NotificationPermissionState;
  requestNotificationPermission(): Promise<NotificationPermissionState>;
  showNotification(payload: NotificationPayload): Promise<boolean>;
  cancelNotifications(): Promise<void>;
  startVibrationLoop(): void;
  stopVibration(): void;
  setWakeLock(enabled: boolean): Promise<boolean>;
}
