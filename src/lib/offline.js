import { useSyncExternalStore } from 'react';

/**
 * Работа без сети: подключаем public/sw.js — только в собранном сайте
 * (при разработке Vite он бы мешал: код меняется на лету).
 */
export function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* не вышло (старый браузер, приватный режим) — сайт работает как обычно */
    });
  });
}

function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** Есть ли сеть — перерисовывает, когда пропала или появилась. */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
