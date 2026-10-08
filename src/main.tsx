import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// 註冊 PWA Service Worker 並在進入頁面時主動檢查更新
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegistered(r) {
      console.log('[PWA] Service Worker registered:', r);
      if (r) {
        r.update();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update();
          }
        });
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
