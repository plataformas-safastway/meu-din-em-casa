import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check display-mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // iOS Safari check
      const isIOSStandalone = (navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    // Check if iOS
    const checkIOS = () => {
      const ua = navigator.userAgent;
      const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);
    };

    checkInstalled();
    checkIOS();

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (isIOS) {
      // Show iOS instructions
      setShowIOSInstructions(true);
      return { success: false, isIOS: true };
    }

    if (!deferredPrompt) {
      return { success: false, isIOS: false };
    }

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return { success: true, isIOS: false };
      }
      
      return { success: false, isIOS: false };
    } catch (error) {
      console.error('Error prompting install:', error);
      return { success: false, isIOS: false };
    }
  }, [deferredPrompt, isIOS]);

  const dismissIOSInstructions = useCallback(() => {
    setShowIOSInstructions(false);
    // Remember dismissal
    try {
      localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
    } catch (e) {
      // Ignore
    }
  }, []);

  // Check if we should show install prompt (not dismissed recently)
  const shouldShowPrompt = useCallback(() => {
    if (isInstalled) return false;
    
    // Check if dismissed in last 7 days
    try {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
          return false;
        }
      }
    } catch (e) {
      // Ignore
    }
    
    return isInstallable || isIOS;
  }, [isInstalled, isInstallable, isIOS]);

  const dismissPrompt = useCallback(() => {
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    } catch (e) {
      // Ignore
    }
  }, []);

  return {
    isInstalled,
    isInstallable: isInstallable || (!isInstalled && isIOS),
    isIOS,
    showIOSInstructions,
    promptInstall,
    dismissIOSInstructions,
    shouldShowPrompt,
    dismissPrompt,
  };
}
