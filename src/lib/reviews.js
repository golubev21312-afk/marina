import { photoUrl } from './photoPreviews';
import { pb } from './pb';
import { createStore } from './store';

/**
 * Отзывы покупателей — из базы (коллекция reviews), Марина ведёт их
 * в админке на вкладке «Отзывы». Сайт показывает только visible.
 * { id, author, text, paragraphs, when, productId, photo, photoFull, preview, previewNames, sort, visible }
 */
export function toReview(record) {
  const photo = (size) => (record.photo ? photoUrl(pb, record, record.photo, size) : '');
  return {
    id: record.id,
    author: record.author,
    text: record.text,
    // Каждая строка — абзац, как Марина вставила из ВК
    paragraphs: record.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    when: record.when ?? '',
    productId: record.product || '',
    photoName: record.photo || '',
    photo: photo('480x480'),
    // Большое — для просмотра на весь экран
    photoFull: record.photo ? photoUrl(pb, record, record.photo) : '',
    preview: photo('160x160'),
    previewNames: record.previews ?? [],
    sort: record.sort,
    visible: record.visible,
  };
}

const store = createStore(async () => {
  const records = await pb.collection('reviews').getFullList({ sort: 'sort,-created' });
  return records.map(toReview);
}, 'Отзывы', 'reviews');

export const refreshReviews = store.refresh;
export const useReviews = store.useStore;
