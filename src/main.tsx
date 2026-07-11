import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { useSettings, detectReducedMotion } from './store/settingsStore';

// Honour the OS reduced-motion preference the very first time the game runs.
if (typeof window !== 'undefined') {
  const s = useSettings.getState();
  if (detectReducedMotion() && !localStorage.getItem('cell-infinite:settings')) {
    s.set('reducedMotion', true);
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
