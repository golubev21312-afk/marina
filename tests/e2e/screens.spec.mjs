import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { adminApi } from './helpers.mjs';

/**
 * Снимки страниц в обеих темах — ловят случайно поехавшую вёрстку и цвета.
 * Эталон — в screens.spec.mjs-snapshots/ (не в git: картинки тяжёлые и свои
 * у каждой системы — шрифты Windows и Linux рисуют по-разному). Нет эталона —
 * тест его запишет и пройдёт (updateSnapshots: 'missing' в playwright.config.js).
 * Вёрстку меняли нарочно — обновить эталон:
 *   npx playwright test tests/e2e/screens.spec.mjs --update-snapshots
 * На GitHub не идут: эталона там нет.
 */
test.skip(Boolean(process.env.CI), 'снимки сверяются только на своей машине');

const THEMES = ['malachite', 'kraft'];

/** Главная и заказ — без WebGL: 3D каждый раз рисуется чуть по-разному. */
const noWebGL = () => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
  };
};

let product;

test.beforeAll(async ({ request }) => {
  const api = await adminApi(request);
  const [category] = await api.list('categories', '&sort=sort');
  product = await api.upload('products', {
    title: 'Ангел для снимков',
    description: 'Расписной ангел из липы: ручная роспись, лак, подарочная коробка.',
    price: '1500',
    stock: 'to_order',
    lead_time: '7–10 дней',
    category: category.id,
    photos: { name: 'angel.webp', mimeType: 'image/webp', buffer: fs.readFileSync('public/img/angel-hranitel.webp') },
  });
});

test.afterAll(async ({ request }) => {
  await (await adminApi(request)).remove('products', product.id);
});

/** Открыть страницу в теме. */
async function open(page, path, theme) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(noWebGL);
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}theme=${theme}`);
  // Ящерки «Малахита» бегают случайно — на снимке их нет
  await page.addStyleTag({ content: '.lizard { display: none !important; }' });
}

/**
 * Снимок, когда шрифты и все картинки на месте. Ленивые картинки грузим сразу:
 * снимок во всю страницу их не «докрутит», а догруженная посреди съёмки — это разница.
 */
async function snap(page, name, options) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const loaded = (img) =>
      new Promise((done) => {
        img.addEventListener('load', done);
        img.addEventListener('error', done);
      });
    const images = [...document.images];
    images.forEach((img) => (img.loading = 'eager'));
    await Promise.all(images.filter((img) => !img.complete).map(loaded));
    await Promise.all(images.map((img) => img.decode().catch(() => {})));
  });
  await expect(page).toHaveScreenshot(name, { maxDiffPixels: 100, ...options });
}

const full = { fullPage: true };

for (const theme of THEMES) {
  test.describe(`снимки: ${theme}`, () => {
    test('главная — карусель', async ({ page }) => {
      await open(page, '/?reset', theme);
      await expect(page.locator('.showcase.is-shown')).toBeVisible({ timeout: 10_000 });
      await snap(page, `${theme}-main.png`);
    });

    test('каталог', async ({ page }) => {
      await open(page, '/catalog', theme);
      await expect(page.locator('.card', { hasText: 'Ангел для снимков' })).toBeVisible();
      await snap(page, `${theme}-catalog.png`, full);
    });

    test('изделие', async ({ page }) => {
      await open(page, `/izdelie/${product.id}`, theme);
      await expect(page.getByRole('heading', { name: 'Ангел для снимков' })).toBeVisible();
      await snap(page, `${theme}-product.png`, full);
    });

    test('о мастерской', async ({ page }) => {
      await open(page, '/about', theme);
      await snap(page, `${theme}-about.png`, full);
    });

    test('индивидуальный заказ', async ({ page }) => {
      await open(page, '/order', theme);
      await expect(page.locator('.order-card[aria-hidden="false"]')).toBeVisible({ timeout: 10_000 });
      await snap(page, `${theme}-order.png`);
    });

    test('политика и 404', async ({ page }) => {
      await open(page, '/privacy', theme);
      await snap(page, `${theme}-privacy.png`, full);
      await open(page, '/kakaya-to-opechatka', theme);
      await snap(page, `${theme}-404.png`, full);
    });

    test('телефон: каталог и изделие', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, '/catalog', theme);
      await expect(page.locator('.card', { hasText: 'Ангел для снимков' })).toBeVisible();
      await snap(page, `${theme}-phone-catalog.png`, full);
      await open(page, `/izdelie/${product.id}`, theme);
      await expect(page.getByRole('heading', { name: 'Ангел для снимков' })).toBeVisible();
      await snap(page, `${theme}-phone-product.png`, full);
    });
  });
}
