import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { warmForecastVoices } from './lib/forecastSpeech';

// Start voice discovery while weather data loads, not after the first tap.
warmForecastVoices();

// Never let an older installed PWA cache mask source changes while the dashboard
// is being served by Vite (`npm run dev`), including through Tailscale Funnel.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if (typeof caches !== 'undefined') {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    });
  } else {
    const isLegalPage = window.location.pathname === '/privacy' || window.location.pathname === '/terms';

    if (isLegalPage && navigator.serviceWorker.controller) {
      // A stale worker can turn these server-rendered legal URLs into the SPA.
      // Remove that worker and its caches, then retry the exact legal URL from
      // the network. This runs only when an old worker already intercepted it.
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if (typeof caches !== 'undefined') {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }
        window.location.replace(window.location.href);
      });
    } else {
      let reloadingForUpdate = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadingForUpdate) return;
        reloadingForUpdate = true;
        window.location.reload();
      });

      // Explicitly register the current worker and bypass the browser HTTP cache
      // for worker updates so older installed WeatherNow PWAs migrate promptly.
      void navigator.serviceWorker.register('/sw.js?v=4', {
        scope: '/',
        updateViaCache: 'none',
      }).then((registration) => registration.update()).catch((error) => {
        console.warn('WeatherNow service worker update failed:', error);
      });
    }
  }
}

// Suppress benign Vite WebSocket connection errors that happen when HMR is disabled
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
