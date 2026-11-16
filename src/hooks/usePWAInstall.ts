import { useEffect, useState } from 'react';
import {
  isElectronUserAgent,
  isIOSUserAgent,
  shouldShowPWAInstallControl,
} from '../utils/pwa';
import { isTauriRuntime } from '../utils/tauriBridge';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const ua = window.navigator.userAgent;
    setIsIOS(isIOSUserAgent(ua));
    setIsElectron(isElectronUserAgent(ua));
    setIsTauri(isTauriRuntime());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const canShowControl = shouldShowPWAInstallControl({
    isInstalled,
    isElectron,
    isTauri,
    hasDeferredPrompt: !!deferredPrompt,
    isIOS,
  });

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isElectron,
    isTauri,
    canShowControl,
    install,
  };
}
