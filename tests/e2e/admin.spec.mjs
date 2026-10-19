import { expect, test } from '@playwright/test';
import { EDITOR } from './accounts.mjs';
import { adminApi, login } from './helpers.mjs';

/** Админка глазами Марины: вход, разделы, товары, главная, пароль. */

test('вход: неверный пароль — сообщение', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Почта').fill(EDITOR.email);
  await page.getByLabel('Пароль').fill('неверный-пароль');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByText('Неверная почта или пароль.')).toBeVisible();
});

test('разделы: добавить, переименовать, порядок, удалить', async ({ page }) => {
  await login(page);
  await page.getByRole('tab', { name: /Разделы/ }).click();
  await page.getByRole('button', { name: '+ Добавить раздел' }).click();
  await page.getByLabel('Название раздела').fill('Тестовый раздел');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText(/Раздел «Тестовый раздел» добавлен/)).toBeVisible();

  const row = (name) => page.locator('.admin-item--category').filter({ has: page.getByText(name, { exact: true }) });
  await row('Тестовый раздел').getByRole('button', { name: 'Изменить' }).click();
  await page.getByLabel('Название раздела').fill('Тестовый раздел 2');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(row('Тестовый раздел 2')).toBeVisible();

  // Новый раздел — последний; поднимаем на одну строку
  const names = () => page.locator('.admin-item--category strong').allTextContents();
  const before = await names();
  await row('Тестовый раздел 2').getByRole('button', { name: 'Выше' }).click();
  await expect.poll(names).not.toEqual(before);
  const after = await names();
  expect(after.indexOf('Тестовый раздел 2')).toBe(before.indexOf('Тестовый раздел 2') - 1);

  await row('Тестовый раздел 2').getByRole('button', { name: 'Удалить' }).click();
  await row('Тестовый раздел 2').getByRole('button', { name: 'Да' }).click();
  await expect(page.getByText('Раздел «Тестовый раздел 2» удалён.')).toBeVisible();
});

test('товар: добавить с фото, в каталоге, наличие, удалить', async ({ page, request }) => {
  await login(page);
  await page.getByRole('button', { name: '+ Добавить товар' }).click();
  await page.locator('input[type=file]').setInputFiles('public/img/angel-hranitel.jpg');
  await page.getByPlaceholder('Например, Неваляшка «Учитель»').fill('Ангел из автотеста');
  await page.getByPlaceholder('Что это за изделие, для кого, чем особенное').fill('Проверка добавления товара.');
  await page.getByPlaceholder('Пусто — «цена по запросу»').fill('990');
  await page.locator('.admin-field').filter({ hasText: 'Раздел' }).locator('select').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Товар добавлен — он уже на сайте.')).toBeVisible({ timeout: 20_000 });

  const [saved] = (await (await adminApi(request)).list('products', "&filter=(title='Ангел из автотеста')"));
  expect(saved.photos).toHaveLength(1);
  expect(saved.price).toBe(990);

  const row = page.locator('.admin-item').filter({ hasText: 'Ангел из автотеста' });
  await row.getByLabel('Наличие').selectOption('to_order');
  await expect(page.getByText('«Ангел из автотеста»: под заказ.')).toBeVisible();
  await expect(row.getByText('под заказ', { exact: true })).toBeVisible();

  // Поиск в списке
  await page.getByLabel('Найти товар').fill('автотест');
  await expect(page.getByText('Найдено: 1.')).toBeVisible();
  await page.getByLabel('Найти товар').fill('');

  // На сайте
  const site = await page.context().newPage();
  await site.goto(`/izdelie/${saved.id}`);
  await expect(site.getByRole('heading', { name: 'Ангел из автотеста' })).toBeVisible();
  await expect(site.locator('.product__to-order-badge')).toHaveText('Под заказ');
  await site.close();

  // Копия: те же поля и фото, сохраняется новым товаром, исходный — как был
  await row.getByRole('button', { name: 'Копировать' }).click();
  await expect(page.getByRole('heading', { name: 'Копия товара' })).toBeVisible();
  await expect(page.getByPlaceholder('Например, Неваляшка «Учитель»')).toHaveValue('Ангел из автотеста — копия');
  await expect(page.locator('.admin-photo img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Товар добавлен — он уже на сайте.')).toBeVisible({ timeout: 20_000 });

  const api = await adminApi(request);
  const [copy] = await api.list('products', "&filter=(title='Ангел из автотеста — копия')");
  expect(copy.id).not.toBe(saved.id);
  expect(copy.photos).toHaveLength(1);
  expect(copy.price).toBe(990);
  expect(copy.stock).toBe('to_order');
  const [original] = await api.list('products', `&filter=(id='${saved.id}')`);
  expect(original.photos).toEqual(saved.photos);
  await api.remove('products', copy.id);

  const exact = page.locator('.admin-item').filter({ has: page.getByText('Ангел из автотеста', { exact: true }) });
  await exact.getByRole('button', { name: 'Удалить' }).click();
  await exact.getByRole('button', { name: 'Да' }).click();
  await expect(page.getByText('«Ангел из автотеста» удалён.')).toBeVisible();
});

test('раздел с товаром: «Нет» отменяет, без ответа через 30 с удаляется, товар переезжает', async ({ page, request }) => {
  const api = await adminApi(request);
  const [target] = await api.list('categories', '&sort=sort');
  const doomed = await api.create('categories', { title: 'Раздел под снос', slug: 'pod-snos', sort: 9990 });
  const product = await api.create('products', { title: 'Переезжает', category: doomed.id, stock: 'in_stock' });

  // Список товаров в браузере «не загрузился»: запрос без фильтра обрываем —
  // товары раздела всё равно должны найтись по базе
  await page.route('**/api/collections/products/records?*', (route) =>
    route.request().url().includes('filter=') ? route.continue() : route.abort(),
  );
  await page.clock.install();
  await login(page);
  await page.getByRole('tab', { name: /Разделы/ }).click();
  const row = page.locator('.admin-item--category').filter({ has: page.getByText('Раздел под снос', { exact: true }) });

  await row.getByRole('button', { name: 'Удалить' }).click();
  await expect(row.getByText(/Удалится сам через 30 с/)).toBeVisible();
  await row.getByRole('button', { name: 'Нет' }).click();
  await page.clock.runFor(35_000);
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Удалить' }).click();
  await row.locator('select').selectOption(target.id);
  await page.clock.runFor(31_000);
  await expect(page.getByText(`Раздел «Раздел под снос» удалён, товары (1 шт.) перенесены в «${target.title}».`)).toBeVisible();
  await expect(row).toHaveCount(0);

  const [moved] = await api.list('products', `&filter=${encodeURIComponent(`id='${product.id}'`)}`);
  expect(moved.category).toBe(target.id);
  await api.remove('products', product.id);
});

test('главная: скрыть и снова показать карточку карусели', async ({ page }) => {
  await login(page);
  await page.getByRole('tab', { name: 'Главная' }).click();
  const first = page.locator('.admin-item--showcase').first();
  await first.getByRole('button', { name: 'Скрыть' }).click();
  await expect(first.getByRole('button', { name: 'Показать' })).toBeVisible();
  await first.getByRole('button', { name: 'Показать' }).click();
  await expect(first.getByRole('button', { name: 'Скрыть' })).toBeVisible();
});

test('смена пароля и вход с новым', async ({ page }) => {
  const fresh = 'NewEditorPass1';
  await login(page);
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  const fields = page.locator('form input[type=password]');
  await fields.nth(0).fill(EDITOR.password);
  await fields.nth(1).fill(fresh);
  await fields.nth(2).fill(fresh);
  await page.locator('form').getByRole('button', { name: 'Сменить пароль' }).click();
  await expect(page.getByText('Пароль изменён. В следующий раз входите с новым.')).toBeVisible();

  await page.getByRole('button', { name: 'Выйти' }).click();
  await login(page, { email: EDITOR.email, password: fresh });

  // Вернуть прежний пароль — другие тесты входят с ним
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await fields.nth(0).fill(fresh);
  await fields.nth(1).fill(EDITOR.password);
  await fields.nth(2).fill(EDITOR.password);
  await page.locator('form').getByRole('button', { name: 'Сменить пароль' }).click();
  await expect(page.getByText('Пароль изменён. В следующий раз входите с новым.')).toBeVisible();
});

test('статистика: заход посетителя виден во вкладке', async ({ page, browser }) => {
  // Посетитель — в отдельном окне, без входа в админку
  const { baseURL, userAgent } = test.info().project.use;
  const visitor = await browser.newContext({ baseURL, userAgent });
  const v = await visitor.newPage();
  await v.goto('/catalog');
  await v.goto('/about');
  await v.waitForTimeout(1000);
  await visitor.close();

  await login(page);
  await page.getByRole('tab', { name: 'Статистика' }).click();
  await page.getByRole('button', { name: 'Сегодня' }).click();
  const people = page.locator('.stats-tile').first().locator('.stats-tile__value');
  await expect(people).not.toHaveText('0');
  await expect(page.locator('.stats-list').filter({ hasText: 'Страницы сайта' })).toContainText('О мастерской');
});
