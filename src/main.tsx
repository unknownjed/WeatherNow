import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { warmForecastVoices } from './lib/forecastSpeech';

// Start voice discovery while weather data loads, not after the first tap.
warmForecastVoices();

// Never let an older installed PWA cache mask source changes while the dashboard
// is being served by Vite (`npm run dev`), including through Tailscale Funnel.
// Production service-worker registration and updates are managed exclusively by
// vite-plugin-pwa (`registerType: 'autoUpdate'`) so startup is not interrupted by
// a second registration/update cycle or a forced controllerchange reload.
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  });
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
