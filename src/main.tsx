import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './index.css';

// Automatically handle new deployments when older chunk hashes become stale
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Stale chunk detected after new deployment. Reloading latest app version...', event);
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
