import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);

        // Register periodic background sync
        if ('periodicSync' in registration) {
          (registration as any).periodicSync.register('update-golf-data', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          }).then(() => {
            console.log('Periodic sync registered');
          }).catch((error: any) => {
            console.log('Periodic sync registration failed:', error);
          });
        }
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}