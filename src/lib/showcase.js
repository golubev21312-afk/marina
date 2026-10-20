import stories from '../data/stories.json';
import { photoUrl } from './photoPreviews';
import { pb } from './pb';
import { createStore } from './store';

/**
 * Карточки карусели на главной — из базы (коллекция showcase), Марина
 * правит их в админке на вкладке «Главная». Не зависят от каталога.
 * { id, title, photo, preview, previewNames, story, paragraphs, sort, visible }
 */
export function toShowcaseItem(record) {
  return {
    id: record.id,
    title: record.title,
    photo: photoUrl(pb, record, record.photo, '600x800'),
    preview: photoUrl(pb, record, record.photo, '240x320'),
    previewNames: record.previews ?? [],
    story: record.story ?? '',
    // Каждая строка истории — абзац, как в тексте заказчика
    paragraphs: (record.story ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    sort: record.sort,
    visible: record.visible,
  };
}

const store = createStore(async () => {
  const records = await pb.collection('showcase').getFullList({ sort: 'sort' });
  return records.map(toShowcaseItem);
}, 'Карусель', 'showcase');

export const refreshShowcase = store.refresh;
export const useShowcase = store.useStore;

/**
 * Запасные карточки — если база недоступна, главная не остаётся пустой.
 * Те же шесть, с которых база была заполнена.
 */
const FALLBACK = [
  { id: 'nevalyashka-doktor', title: 'Неваляшка «Доктор»' },
  { id: 'nevalyashka-uchitel', title: 'Неваляшка «Учитель»' },
  { id: 'kot-moryak', title: 'Кот-Моряк' },
  { id: 'angel-hranitel', title: 'Ангел-хранитель' },
  { id: 'nevalyashka-deputat', title: 'Неваляшка-депутат' },
  { id: 'khozyayka-mednoy-gory', title: 'Хозяйка Медной горы' },
].map((entry) => ({
  ...entry,
  photo: `/img/${entry.id}.webp`,
  paragraphs: stories[entry.id]?.paragraphs ?? [],
}));

/** Карточки для главной: видимые из базы, при ошибке базы — запасные. */
export function useShowcaseItems() {
  const { status, items } = useShowcase();
  if (status === 'error' && !items.length) return FALLBACK;
  return items.filter((item) => item.visible);
}
