import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const refreshForUpdate = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
};

export const PwaLifecycle = () => {
  const hasShownUpdateToastRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleUpdateReady = () => {
      if (hasShownUpdateToastRef.current) return;
      hasShownUpdateToastRef.current = true;

      toast('App update ready', {
        description: 'Refresh to get the latest student workspace improvements.',
        action: {
          label: 'Refresh',
          onClick: () => {
            void refreshForUpdate();
          },
        },
      });
    };

    const handleControllerChange = () => {
      window.location.reload();
    };

    window.addEventListener('pwa:update-ready', handleUpdateReady);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('pwa:update-ready', handleUpdateReady);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
};
