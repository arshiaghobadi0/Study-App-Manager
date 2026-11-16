import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

import { isTauriRuntime } from './utils/tauriBridge';

if (
  typeof window !== 'undefined' &&
  (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
  !navigator.userAgent.toLowerCase().includes('electron') &&
  !isTauriRuntime()
) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(<App />);
