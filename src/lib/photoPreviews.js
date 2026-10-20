/**
 * Свои превью фото в WebP — поле previews рядом с фото в каждой коллекции.
 * Превью PocketBase из WebP получаются в PNG и весят вдвое больше JPEG,
 * поэтому уменьшенные копии делает админка (shrinkImage.js) и кладёт сама.
 *
 * Пара «фото — превью» связана именем. База дописывает к имени файла
 * «_» и 10 случайных знаков: фото k7x2m9qa.webp → k7x2m9qa_gu823runig.webp,
 * превью k7x2m9qa-600x750.webp → k7x2m9qa_600x750_u9wyrqge4k.webp.
 * Ключ фото — имя без этого хвоста; превью ищем по «ключ_размер_».
 * Нет своего превью (старые записи) — берём превью базы, как раньше.
 *
 * Без импортов: модуль нужен и сайту, и scripts/make-previews.mjs.
 */

/** Размеры превью по коллекциям — те же, что thumbs у полей фото в базе. */
export const PREVIEW_SIZES = {
  products: ['600x750', '240x300'],
  showcase: ['600x800', '240x320'],
  reviews: ['480x480', '160x160'],
};

const STORED_TAIL = /_[a-z0-9]{10}\.[a-z0-9]+$/;

/** Ключ фото по имени в базе: k7x2m9qa_gu823runig.webp → k7x2m9qa. */
export const photoKey = (name) => name.replace(STORED_TAIL, '');

/** Имена превью этого фото в списке previews записи. */
export function previewsOf(previews, file) {
  const prefix = `${photoKey(file)}_`;
  return (previews ?? []).filter((name) => name.startsWith(prefix) && /^\d+x\d+_/.test(name.slice(prefix.length)));
}

/** Ссылка на фото нужного размера: своё превью, иначе превью базы; без size — оригинал. */
export function photoUrl(pb, record, file, size) {
  if (!size) return pb.files.getURL(record, file);
  const own = (record.previews ?? []).find((name) => name.startsWith(`${photoKey(file)}_${size}_`));
  return own ? pb.files.getURL(record, own) : pb.files.getURL(record, file, { thumb: size });
}
