import {AndroidPlatformBridge} from './android/AndroidPlatformBridge';
import {DesktopPlatformBridge} from './desktop/DesktopPlatformBridge';
import {PlatformAdapter} from './types';
import {WebPlatformAdapter} from './web/WebPlatformAdapter';

function createPlatformAdapter(): PlatformAdapter {
  if (typeof window !== 'undefined') {
    const win = window as unknown as {
      Capacitor?: {isNativePlatform?: () => boolean};
      electronAPI?: unknown;
    };
    if (win.Capacitor?.isNativePlatform?.()) {
      return new AndroidPlatformBridge();
    }
    if (win.electronAPI) {
      return new DesktopPlatformBridge();
    }
  }
  return new WebPlatformAdapter();
}

export const platformAdapter: PlatformAdapter = createPlatformAdapter();
