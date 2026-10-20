/**
 * Разово: свои превью WebP для фото, загруженных до п. 14 (товары, карусель,
 * отзывы). Новые фото получают превью сразу в админке — см. src/lib/photoPreviews.js.
 * Сами фото не трогаем; у которых превью уже есть — пропускаем, так что
 * запускать можно сколько угодно раз. WebP кодирует Chrome — тот же, что в автотестах.
 *
 *   База запущена (npm run db), затем в PowerShell:
 *   $env:PB_EMAIL='почта суперпользователя'; $env:PB_PASSWORD='пароль'; node scripts/make-previews.mjs
 *   Другая база: $env:PB_URL='https://…'
 */
import { chromium } from 'playwright';
import { PREVIEW_SIZES, photoKey, previewsOf } from '../src/lib/photoPreviews.js';

const BASE = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const { PB_EMAIL, PB_PASSWORD } = process.env;
if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Нужны PB_EMAIL и PB_PASSWORD суперпользователя — см. начало файла.');
  process.exit(1);
}

const login = await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
});
if (!login.ok) throw new Error(`Вход не удался: ${await login.text()}`);
const headers = { Authorization: (await login.json()).token };

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();

/** Превью WxH в WebP — та же обрезка по центру, что в админке (shrinkImage.js). */
const makePreviews = (bytes, type, sizes) =>
  page.evaluate(
    async ({ data, type, sizes }) => {
      const blob = await (await fetch(`data:${type};base64,${data}`)).blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      const out = [];
      for (const size of sizes) {
        const [width, height] = size.split('x').map(Number);
        const scale = Math.max(width / bitmap.width, height / bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const w = bitmap.width * scale;
        const h = bitmap.height * scale;
        canvas.getContext('2d').drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
        out.push(canvas.toDataURL('image/webp', 0.82).split(',')[1]);
      }
      return out;
    },
    { data: Buffer.from(bytes).toString('base64'), type, sizes },
  );

let made = 0;
for (const [collection, sizes] of Object.entries(PREVIEW_SIZES)) {
  const list = await fetch(`${BASE}/api/collections/${collection}/records?perPage=500`, { headers });
  if (!list.ok) throw new Error(`${collection}: ${await list.text()}`);
  for (const record of (await list.json()).items) {
    const photos = [record.photos ?? record.photo].flat().filter(Boolean);
    const form = new FormData();
    for (const file of photos) {
      if (previewsOf(record.previews, file).length) continue;
      const response = await fetch(`${BASE}/api/files/${collection}/${record.id}/${file}`, { headers });
      if (!response.ok) throw new Error(`${collection}/${record.id}/${file}: ${response.status}`);
      const type = response.headers.get('content-type');
      const previews = await makePreviews(await response.arrayBuffer(), type, sizes);
      previews.forEach((data, i) =>
        form.append('previews+', new Blob([Buffer.from(data, 'base64')], { type: 'image/webp' }), `${photoKey(file)}-${sizes[i]}.webp`),
      );
      made += previews.length;
    }
    if (![...form.keys()].length) continue;
    const saved = await fetch(`${BASE}/api/collections/${collection}/records/${record.id}`, { method: 'PATCH', headers, body: form });
    if (!saved.ok) throw new Error(`${collection}/${record.id}: ${await saved.text()}`);
    console.log(`${collection}: ${record.title ?? record.author ?? record.id}`);
  }
}

await browser.close();
console.log(made ? `Готово: превью — ${made}.` : 'Все фото уже с превью.');
