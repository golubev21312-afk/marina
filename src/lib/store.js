import { useSyncExternalStore } from 'react';
import { pb } from './pb';

/**
 * Общий список из базы на весь сайт: грузится один раз при первом
 * использовании, все компоненты видят одно и то же. После правок в
 * админке зовём refresh() — и сайт обновляется сам.
 *   state: { status: 'idle' | 'loading' | 'ready' | 'error', items }
 */
export function createStore(load, label, collection) {
  let state = { status: 'idle', items: [] };
  const listeners = new Set();

  const set = (next) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  async function refresh() {
    if (state.status === 'idle') set({ ...state, status: 'loading' });
    try {
      set({ status: 'ready', items: await load() });
    } catch (error) {
      console.error(`${label} не загрузились`, error);
      set({ status: 'error', items: state.items });
    }
  }

  // Живые обновления: база сама сообщает об изменениях (из админки
  // в соседней вкладке или с телефона Марины) — сайт перечитывает список
  let live = false;
  function goLive() {
    if (live || !collection) return;
    live = true;
    let timer = 0;
    pb.collection(collection)
      .subscribe('*', () => {
        // Пачку изменений (фото, порядок) склеиваем в одно обновление
        clearTimeout(timer);
        timer = setTimeout(refresh, 150);
      })
      .catch((error) => {
        live = false;
        console.warn(`${label}: живые обновления недоступны`, error);
      });
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (state.status === 'idle') refresh();
    goLive();
    return () => listeners.delete(listener);
  }

  const snapshot = () => state;
  const useStore = () => useSyncExternalStore(subscribe, snapshot, snapshot);

  return { refresh, useStore };
}
