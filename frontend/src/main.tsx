import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { Toaster } from 'sonner';
import { getTheme, setTheme } from '@/lib/theme';

setTheme(getTheme());

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) {
        window.dispatchEvent(new CustomEvent('pwa:update-ready'));
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('pwa:update-ready'));
          }
        });
      });
    }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>
);
