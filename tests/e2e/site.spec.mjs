import { expect, test } from '@playwright/test';
import { adminApi, blockVk } from './helpers.mjs';

/** Сайт для посетителя: страницы, изделие, превью ссылок, переход в ВК. */

let product;

test.beforeAll(async ({ request }) => {
  const api = await adminApi(request);
  const [category] = await api.list('categories', '&sort=sort');
  product = await api.create('products', {
    title: 'Тестовый ангел',
    description: 'Расписной ангел из липы для проверки сайта.',
    price: 1200,
    stock: 'in_stock',
    category: category.id,
  });
});

test.afterAll(async ({ request }) => {
  const api = await adminApi(request);
  await api.remove('products', product.id);
});

test('страницы открываются', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page.getByText('Тестовый ангел')).toBeVisible();
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: /О мастерской/ })).toBeVisible();
  await page.goto('/order');
  await expect(page.getByText('Берём округлую форму')).toBeVisible();
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Политика обработки персональных данных' })).toBeVisible();
});

test('шрифты — свои: ни одного запроса к Google', async ({ page }) => {
  const outside = [];
  page.on('request', (r) => /fonts\.(googleapis|gstatic)\.com/.test(r.url()) && outside.push(r.url()));
  const fonts = [];
  page.on('response', (r) => r.url().includes('/fonts/') && fonts.push(r.status()));
  await page.goto('/catalog');
  await expect(page.getByText('Тестовый ангел')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(outside).toEqual([]);
  // Русский текст — фирменными шрифтами, а не запасными
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')),
  );
  expect(loaded).toContain('Lora');
  expect(loaded).toContain('Golos Text');
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((status) => status === 200)).toBe(true);
});

test('главная: загрузка и сборка матрёшки без ошибок', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.scenario__bar')).toBeAttached();
  await expect(page.locator('.scenario__bar')).not.toBeAttached({ timeout: 30_000 });
  // 3D действительно работает, а не сайт ушёл в режим «без 3D»
  const webgl = await page.evaluate(() => Boolean(document.querySelector('.scenario__canvas')?.getContext('webgl2')));
  expect(webgl).toBe(true);
  expect(errors).toEqual([]);
});

// Телефон без WebGL: three.js не может создать холст 3D
const noWebGL = () => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
  };
};

test('без WebGL: главная сразу показывает карусель, заказ — блок заказа', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(noWebGL);
  await page.goto('/?reset');
  await expect(page.locator('.showcase.is-shown')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.scenario__loading')).toHaveCount(0);
  await expect(page.getByText('Что-то пошло не так')).toHaveCount(0);

  await page.goto('/order');
  await expect(page.locator('.order-card[aria-hidden="false"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Написать в ВК' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('«Уменьшить движение»: сцены сменяются без полёта матрёшки', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?reset');
  await expect(page.locator('.scenario__loading')).not.toBeAttached({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Следующая сцена' }).click();
  // Без пятисекундного полёта деталей карусель — сразу
  await expect(page.locator('.showcase.is-shown')).toBeVisible({ timeout: 1500 });
  expect(errors).toEqual([]);
});

test('модель не загрузилась: главная всё равно доходит до карусели', async ({ page }) => {
  await page.route('**/*.glb', (route) => route.abort());
  await page.goto('/?reset');
  await expect(page.locator('.showcase.is-shown')).toBeVisible({ timeout: 10_000 });
});

test('изделие: страница, заголовок вкладки, «нет такого», 404', async ({ page }) => {
  await page.goto(`/izdelie/${product.id}`);
  await expect(page.getByRole('heading', { name: 'Тестовый ангел' })).toBeVisible();
  await expect(page).toHaveTitle(/Тестовый ангел/);
  await page.goto('/izdelie/netakogoizdeliya');
  await expect(page.getByRole('heading', { name: 'Такого изделия нет' })).toBeVisible();
  await page.goto('/kakaya-to-opechatka');
  await expect(page.getByRole('heading', { name: 'Такой страницы нет' })).toBeVisible();
});

test('превью ссылок для ВК: название и фото в HTML', async ({ request }) => {
  const html = await (await request.get(`/izdelie/${product.id}`)).text();
  expect(html).toContain('<title>Тестовый ангел — мастерская «Крафт»</title>');
  expect(html).toContain('og:description" content="Расписной ангел из липы для проверки сайта."');
  expect(html).toMatch(/og:image" content="http:\/\/127\.0\.0\.1:\d+\/img\//);
  const home = await (await request.get('/catalog')).text();
  expect(home).toContain('<title>Каталог — мастерская «Крафт»</title>');
});

test('переход в ВК — через предупреждение', async ({ page }) => {
  await blockVk(page);
  await page.goto(`/izdelie/${product.id}`);
  await page.getByRole('button', { name: 'Заказать в ВК' }).last().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Переходим во ВКонтакте');
  await dialog.getByRole('button', { name: 'Остаться на сайте' }).click();
  await expect(dialog).not.toBeVisible();
});

test('заказ изделия: ссылка на него копируется для сообщения в ВК', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await blockVk(page);
  await page.goto(`/izdelie/${product.id}`);
  // Кнопка на самой странице изделия, не в меню — у меню нет ссылки на изделие
  await page.locator('.product__order').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('status')).toContainText('Ссылка на изделие скопирована');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Тестовый ангел');
  expect(text).toContain(`/izdelie/${product.id}`);
  await dialog.getByRole('button', { name: 'Остаться на сайте' }).click();
  await expect(dialog).not.toBeVisible();
});
