import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge any stale service worker caches on startup to guarantee instant UI updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update();
    }
  });
  if (typeof caches !== 'undefined') {
    caches.keys().then((names) => {
      for (const name of names) {
        if (name.startsWith('weathernow-v1') || name.startsWith('weathernow-v2')) {
          caches.delete(name);
        }
      }
    });
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
