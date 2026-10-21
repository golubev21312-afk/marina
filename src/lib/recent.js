import { createLocalList } from './localList';

/** «Вы смотрели» — последние открытые изделия, только в этом браузере (lib/localList.js). */
const list = createLocalList('craft-recent');

/** Столько помним; показываем меньше — см. RecentlyViewed. */
const KEEP = 8;

/** Номера просмотренных изделий — последнее в начале. */
export const useRecent = list.useList;

export function rememberViewed(id) {
  const current = list.read();
  if (current[0] === id) return;
  list.write([id, ...current.filter((item) => item !== id)].slice(0, KEEP));
}

export function clearRecent() {
  list.write([]);
}
