import { CHEAP_PRICE } from './products';

/**
 * Подбор подарка: три вопроса — кому, повод, бюджет. Отдельных полей у товара
 * для этого нет: «кому» и «повод» — те же метки поводов, что Марина ставит
 * в админке. Метка с предлогом («на свадьбу», «к 8 Марта», «в дорогу») — повод,
 * без предлога («учителю», «маме») — кому.
 */
const REASON = /^(на|к|ко|в|во)\s/i;

export const BUDGETS = [
  { id: 'cheap', title: `до ${CHEAP_PRICE} ₽`, max: CHEAP_PRICE },
  { id: 'mid', title: 'до 3000 ₽', max: 3000 },
];

/** Метки изделий → { who: [...], why: [...] }, самые частые первыми. */
export function splitOccasions(products) {
  const counts = new Map();
  products.forEach((item) => item.occasions.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)));
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .map(([name]) => name);
  return { who: sorted.filter((name) => !REASON.test(name)), why: sorted.filter((name) => REASON.test(name)) };
}

/** Сначала в наличии, потом под заказ, «нет в наличии» — в конце. */
const STOCK_ORDER = { in_stock: 0, to_order: 1, sold_out: 2 };

/**
 * Изделия под ответы { who, why, budget } (пустое — «не важно»).
 * exact — подходят по всем вопросам; close — хотя бы по одному, лучше — выше.
 */
export function pickGifts(products, { who, why, budget }) {
  const max = BUDGETS.find((item) => item.id === budget)?.max;
  const checks = [
    who && ((item) => item.occasions.includes(who)),
    why && ((item) => item.occasions.includes(why)),
    max && ((item) => Boolean(item.price) && item.price <= max),
  ].filter(Boolean);

  const scored = products.map((item) => ({ item, score: checks.filter((check) => check(item)).length }));
  const byScore = (a, b) => b.score - a.score || STOCK_ORDER[a.item.stock] - STOCK_ORDER[b.item.stock];
  scored.sort(byScore);
  return {
    exact: scored.filter((entry) => entry.score === checks.length).map((entry) => entry.item),
    close: scored.filter((entry) => entry.score > 0 && entry.score < checks.length).map((entry) => entry.item),
  };
}
