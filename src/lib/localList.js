import { useSyncExternalStore } from 'react';

/**
 * Список номеров изделий в этом браузере (localStorage) — без регистрации.
 * На нём «Отложенные» (favorites.js) и «Вы смотрели» (recent.js).
 * Удалённые из базы изделия просто не показываются. Соседние вкладки видят
 * изменения (событие storage). Приватный режим — список живёт до закрытия вкладки.
 */
export function createLocalList(key) {
  const listeners = new Set();
  let cache = null;

  function read() {
    if (cache) return cache;
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      cache = Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
    } catch {
      cache = [];
    }
    return cache;
  }

  function write(list) {
    cache = list;
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* не сохранилось — не страшно, в памяти список есть */
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener) {
    listeners.add(listener);
    const onStorage = (event) => {
      if (event.key !== key) return;
      cache = null;
      listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  return { read, write, useList: () => useSyncExternalStore(subscribe, read) };
}
