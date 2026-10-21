import { createLocalList } from './localList';

/** «Отложенные» изделия — только в этом браузере (lib/localList.js). */
const list = createLocalList('craft-favorites');

/** Номера отложенных изделий — новые в начале. */
export const useFavorites = list.useList;

export function toggleFavorite(id) {
  const current = list.read();
  list.write(current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]);
}

export function clearFavorites() {
  list.write([]);
}
