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

/** Запись базы → товар в том виде, в каком его ждут компоненты. */
export function toProduct(record) {
  const url = (file, thumb) => pb.files.getURL(record, file, thumb ? { thumb } : undefined);
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? '',
    price: record.price || null,
    // Раздел: slug — для адресов и фильтра, categoryId — для админки
    category: record.expand?.category?.slug ?? '',
    categoryId: record.category,
    stock: record.stock || 'in_stock',
    photos: record.photos.map((file) => url(file)),
    thumbs: record.photos.map((file) => url(file, '600x750')),
    small: record.photos.map((file) => url(file, '240x300')),
    files: record.photos,
    sort: record.sort,
    created: record.created,
  };
}

const store = createStore(async () => {
  const records = await pb.collection('products').getFullList({ sort: 'sort,-created', expand: 'category' });
  return records.map(toProduct);
}, 'Товары', 'products');

export const refreshProducts = store.refresh;
export const useProducts = store.useStore;
