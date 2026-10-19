import { useState } from 'react';
import { pb } from '../lib/pb';
import { failText } from './failText';

/**
 * Действия в списках админки (удалить, скрыть, порядок): одно за раз,
 * ошибка — на экране, а не только в консоли. reload — перечитать список
 * после ошибки, чтобы на экране было то, что на самом деле в базе.
 */
export function useListAction(reload) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (what, action) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(failText(err, what));
      await reload();
    }
    setBusy(false);
  };

  return { busy, error, setError, run };
}

/**
 * Поменять запись местами с соседом (delta = -1 выше, +1 ниже):
 * sort у всех переписываем подряд — 10, 20, 30… — без пропусков.
 */
export async function saveOrder(collection, items, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  const order = [...items];
  [order[index], order[target]] = [order[target], order[index]];
  await saveList(collection, order);
}

/** Записать порядок целиком (после перетаскивания): sort — 10, 20, 30… */
export async function saveList(collection, order) {
  for (const [i, item] of order.entries()) {
    if (item.sort !== (i + 1) * 10) await pb.collection(collection).update(item.id, { sort: (i + 1) * 10 });
  }
}
