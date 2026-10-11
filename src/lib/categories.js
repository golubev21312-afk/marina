import { pb } from './pb';
import { createStore } from './store';

/**
 * Разделы каталога из базы — Марина правит их в админке.
 * { id, slug, title, subtitle, description, sort }, по порядку sort.
 */
const store = createStore(async () => {
  const records = await pb.collection('categories').getFullList({ sort: 'sort' });
  return records.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    description: r.description,
    sort: r.sort,
  }));
}, 'Разделы', 'categories');

export const refreshCategories = store.refresh;
export const useCategories = store.useStore;

/** Русское название → латиница для адреса раздела: «Нижний Тагил» → nizhniy-tagil. */
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(title) {
  return (
    title
      .toLowerCase()
      .split('')
      .map((ch) => MAP[ch] ?? ch)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'razdel'
  );
}
