import { useMemo } from 'react';
import { photoUrl } from './photoPreviews';
import { pb } from './pb';
import { createStore } from './store';

/**
 * Товары из базы — один общий список на весь сайт (каталог, меню,
 * страница товара, админка). Порядок — ручной, Марина задаёт его ↑↓ в админке.
 */

/** Наличие изделия: значение в базе → подпись на сайте и в админке. */
export const STOCK = {
  in_stock: 'В наличии',
  to_order: 'Под заказ',
  sold_out: 'Нет в наличии',
};

/** Материал, если Марина его не указала. */
export const DEFAULT_MATERIAL = 'дерево, ручная роспись';

/** Порог подборки «до 1000 ₽» в каталоге. */
export const CHEAP_PRICE = 1000;

/** «Новинка» — добавлено за столько дней. */
export const NEW_DAYS = 14;

/**
 * Какие изделия — новинки: добавлены за NEW_DAYS дней и не проданы. Если
 * новинок половина каталога и больше (запуск, Марина завела всё разом) —
 * не отмечаем никого: метка на всём ничего не выделяет.
 */
function markNew(items, now = Date.now()) {
  // У базы дата через пробел: «2026-10-21 10:00:00.000Z» — Safari такую не понимает
  const fresh = (item) =>
    item.stock !== 'sold_out' && now - Date.parse(item.created.replace(' ', 'T')) < NEW_DAYS * 24 * 60 * 60 * 1000;
  const newIds = new Set(items.filter(fresh).map((item) => item.id));
  const show = newIds.size > 0 && newIds.size < items.length / 2;
  return items.map((item) => ({ ...item, isNew: show && newIds.has(item.id) }));
}

/** Запись базы → товар в том виде, в каком его ждут компоненты. */
export function toProduct(record) {
  const url = (file, size) => photoUrl(pb, record, file, size);
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? '',
    price: record.price || null,
    // Раздел: slug — для адресов и фильтра, categoryId — для админки
    category: record.expand?.category?.slug ?? '',
    categoryId: record.category,
    stock: record.stock || 'in_stock',
    occasions: Array.isArray(record.occasions) ? record.occasions : [],
    leadTime: record.lead_time ?? '',
    material: record.material ?? '',
    size: record.size ?? '',
    photos: record.photos.map((file) => url(file)),
    thumbs: record.photos.map((file) => url(file, '600x750')),
    small: record.photos.map((file) => url(file, '240x300')),
    files: record.photos,
    // Свои превью фото (WebP) — админке, чтобы убрать их вместе с фото
    previewFiles: record.previews ?? [],
    sort: record.sort,
    // Черновик — сохранён, но на сайте не виден (п. 13)
    draft: Boolean(record.draft),
    // Дата удаления в корзину; пусто — товар на сайте
    deleted: record.deleted || '',
    created: record.created,
  };
}

const store = createStore(async () => {
  const records = await pb.collection('products').getFullList({ sort: 'sort,-created', expand: 'category' });
  return records.map(toProduct);
}, 'Товары', 'products');

export const refreshProducts = store.refresh;

/** Все товары, вместе с корзиной, — для админки. */
export const useAllProducts = store.useStore;

/**
 * Товары для сайта — без корзины и черновиков. Посетителям база их и не
 * отдаёт; а Марине, если она вошла и смотрит сайт, — отдаёт, поэтому
 * отсеиваем и здесь.
 */
export function useProducts() {
  const state = store.useStore();
  return useMemo(
    () => ({ ...state, items: markNew(state.items.filter((item) => !item.deleted && !item.draft)) }),
    [state],
  );
}

/** Списки админки — без корзины, но с черновиками. */
export function useAdminProducts() {
  const state = store.useStore();
  return useMemo(() => ({ ...state, items: state.items.filter((item) => !item.deleted) }), [state]);
}
