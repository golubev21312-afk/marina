/**
 * Фото с телефона весят 5–10 МБ — перед загрузкой уменьшаем до 2000 px
 * по длинной стороне (для сайта с запасом).
 *   JPEG, HEIC и прочие фото → JPEG
 *   PNG и WebP (могут быть с прозрачным фоном, например вырезанное
 *   изделие) → WebP: он хранит прозрачность, а JPEG залил бы её чёрным
 * Если браузер не умеет прочитать формат (например, HEIC в Chrome) —
 * возвращаем как есть; форма такой файл не примет и объяснит почему.
 */
const MAX_SIDE = 2000;
const QUALITY = 0.86;

export async function shrinkImage(file) {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
    const type = keepAlpha ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
    if (!blob) return file;
    // Браузер без WebP отдаёт PNG — тоже с прозрачностью, просто тяжелее
    const ext = { 'image/webp': '.webp', 'image/png': '.png' }[blob.type] ?? '.jpg';
    const name = file.name.replace(/\.[^.]+$/, '') + ext;
    return new File([blob], name, { type: blob.type });
  } catch {
    return file;
  }
}
