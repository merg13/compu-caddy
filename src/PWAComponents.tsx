import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// PWA Install Banner Component
interface PWAInstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsVisible(false);
      return;
    }

    // Show banner with a delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg shadow-xl z-50 max-w-md mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">📱 Install Compu-Caddy</h3>
          <p className="text-xs opacity-90">
            Get the full experience with offline access and app-like performance
          </p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="ml-2 text-white hover:text-gray-200"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => {
            setIsVisible(false);
            onInstall();
          }}
          className="flex-1 bg-white text-green-700 px-3 py-2 rounded text-sm font-bold hover:bg-gray-100 transition-colors"
        >
          Install App
        </button>
        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="px-3 py-2 border border-white/30 text-white rounded text-sm hover:bg-white/10 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

// Offline Indicator Component
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium z-50">
      📶 You're offline - Compu-Caddy works offline! Your data is safe.
    </div>
  );
}

// PWA Update Notification Component
interface PWAUpdateNotificationProps {
  onUpdate: () => void;
}

export function PWAUpdateNotification({ onUpdate }: PWAUpdateNotificationProps) {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setShowUpdate(true);
        }
      });
    }
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">🔄 Update Available</h3>
          <p className="text-xs opacity-90">
            A new version of Compu-Caddy is ready to install.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => {
            setShowUpdate(false);
            onUpdate();
          }}
          className="flex-1 bg-white text-blue-600 px-3 py-2 rounded text-sm font-bold hover:bg-gray-100 transition-colors"
        >
          Update Now
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="px-3 py-2 border border-white/30 text-white rounded text-sm hover:bg-white/10 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

// PWA Install Hook
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === 'accepted') {
      // Track successful installation
      console.log('PWA installed successfully');
      return true;
    }

    return false;
  };

  return { installApp, isInstallable };
}

// Service Worker Registration with Update Handling
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered: ', registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update available
                  navigator.serviceWorker.controller.postMessage({
                    type: 'UPDATE_AVAILABLE'
                  });
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        console.log('Cache updated');
      }
    });
  }
}