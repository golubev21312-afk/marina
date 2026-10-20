/**
 * Фото с телефона весят 5–10 МБ — перед загрузкой уменьшаем до 2000 px
 * по длинной стороне (для сайта с запасом) и переводим в WebP: он почти
 * вдвое легче JPEG и хранит прозрачность (вырезанное изделие на PNG).
 * Заодно делаем превью нужных размеров — см. lib/photoPreviews.js.
 *
 * Браузер, который не умеет сохранять WebP (старый Safari), — фото как
 * раньше: JPEG, а PNG/WebP — PNG; превью тогда не делаем, сайт возьмёт
 * превью базы. Не умеет прочитать формат (HEIC в Chrome) — возвращаем
 * как есть; форма такой файл не примет и объяснит почему.
 */
const MAX_SIDE = 2000;
const QUALITY = 0.86;
const PREVIEW_QUALITY = 0.82;

/** Форматы, которые показывают все браузеры (так же разрешено в базе). */
export const WEB_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** Ключ пары «фото — превью»: случайный, чтобы два IMG_1234.jpg не спутались. */
const newKey = () => `p${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;

/** Превью WxH: заполняет кадр, лишнее обрезается по центру — как превью базы. */
async function makePreview(bitmap, size, key) {
  const [width, height] = size.split('x').map(Number);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  canvas.getContext('2d').drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
  const blob = await toBlob(canvas, 'image/webp', PREVIEW_QUALITY);
  return new File([blob], `${key}-${size}.webp`, { type: 'image/webp' });
}

/**
 * Фото для загрузки: { file, previews }. previews — файлы превью
 * размеров sizes (пусто, если браузер не умеет WebP или не прочёл фото).
 */
export async function preparePhoto(file, sizes = []) {
  if (!file.type.startsWith('image/')) return { file, previews: [] };
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return { file, previews: [] };
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const key = newKey();
    let blob = await toBlob(canvas, 'image/webp', QUALITY);
    if (blob?.type === 'image/webp') {
      // Небольшое фото, которое в WebP не полегчало, оставляем как было
      const keepOriginal = scale === 1 && WEB_TYPES.includes(file.type) && blob.size >= file.size;
      const main = keepOriginal ? file : blob;
      const ext = keepOriginal ? file.name.match(/\.[^.]+$/)?.[0] ?? '' : '.webp';
      const previews = await Promise.all(sizes.map((size) => makePreview(bitmap, size, key)));
      return { file: new File([main], key + ext, { type: main.type }), previews };
    }

    // WebP браузер не сохраняет — как раньше: только уменьшаем, и то если надо
    if (scale === 1 && file.size < 2.5 * 1024 * 1024) return { file, previews: [] };
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
    blob = await toBlob(canvas, keepAlpha ? 'image/png' : 'image/jpeg', QUALITY);
    if (!blob) return { file, previews: [] };
    const ext = blob.type === 'image/png' ? '.png' : '.jpg';
    return { file: new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type: blob.type }), previews: [] };
  } catch {
    return { file, previews: [] };
  } finally {
    bitmap.close();
  }
}
