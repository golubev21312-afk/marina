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
    available: true,
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

test('главная: загрузка и сборка матрёшки без ошибок', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.scenario__bar')).toBeAttached();
  await expect(page.locator('.scenario__bar')).not.toBeAttached({ timeout: 30_000 });
  expect(errors).toEqual([]);
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
