import { useSyncExternalStore } from 'react';

/**
 * «Отложенные» изделия — без регистрации, только в этом браузере
 * (localStorage). Хранятся номера изделий; удалённые из базы просто
 * не показываются. Соседние вкладки видят изменения (событие storage).
 */
const KEY = 'craft-favorites';
const listeners = new Set();
let cache = null;

function read() {
  if (cache) return cache;
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    cache = Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    cache = []; // приватный режим — список живёт до закрытия вкладки
  }
  return cache;
}

function write(list) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* не сохранилось — не страшно, в памяти список есть */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Номера отложенных изделий — новые в начале. */
export function useFavorites() {
  return useSyncExternalStore(subscribe, read);
}

export function toggleFavorite(id) {
  const list = read();
  write(list.includes(id) ? list.filter((item) => item !== id) : [id, ...list]);
}

export function clearFavorites() {
  write([]);
}
