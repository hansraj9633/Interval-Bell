import {useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

let cachedPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    for (const listener of promptListeners) {
      listener(cachedPrompt);
    }
  });

  window.addEventListener('appinstalled', () => {
    cachedPrompt = null;
    for (const listener of promptListeners) {
      listener(null);
    }
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => cachedPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    setDeferredPrompt(cachedPrompt);

    const handlePromptUpdate = (next: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(next);
      if (!next && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    promptListeners.add(handlePromptUpdate);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      promptListeners.delete(handlePromptUpdate);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt ?? cachedPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const {outcome} = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      cachedPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!(deferredPrompt ?? cachedPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}
