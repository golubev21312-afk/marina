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
  await expect(page.getByRole('link', { name: 'Показать на Яндекс Картах' })).toHaveAttribute('href', /yandex\.ru\/maps/);
  await expect(page.getByText('с 10:00 до 18:00')).toBeVisible();
  await page.goto('/order');
  // Шаги проступают после загрузки 3D — на программной графике это дольше
  await expect(page.getByText('Берём округлую форму')).toBeVisible({ timeout: 20_000 });
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

test('изделие: «Посмотрите ещё» ведёт к другому изделию, страница — с начала', async ({ page, request }) => {
  const api = await adminApi(request);
  const other = await api.create('products', {
    title: 'Второй тестовый ангел',
    price: 900,
    stock: 'in_stock',
    category: product.category,
  });
  await page.goto(`/izdelie/${product.id}`);
  const related = page.locator('.related');
  await expect(related.getByText('Второй тестовый ангел')).toBeVisible();
  await expect(related.getByText('Тестовый ангел', { exact: true })).toHaveCount(0);
  await related.getByText('Второй тестовый ангел').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Второй тестовый ангел' })).toBeVisible();
  expect(await page.locator('.page').evaluate((el) => el.scrollTop)).toBe(0);
  await api.remove('products', other.id);
});

test('изделие: «Поделиться» на компьютере копирует ссылку', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/izdelie/${product.id}`);
  await page.getByRole('button', { name: 'Поделиться' }).click();
  await expect(page.getByRole('button', { name: 'Ссылка скопирована' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/izdelie/${product.id}$`));
});

test('отложить: сердечко, пункт меню, страница, отправить мастеру списком', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await blockVk(page);
  await page.goto('/catalog');
  const card = page.locator('.card-wrap').filter({ hasText: 'Тестовый ангел' });
  await card.getByRole('button', { name: 'Отложить «Тестовый ангел»' }).click();
  await expect(card.getByRole('button', { name: 'Убрать «Тестовый ангел» из отложенных' })).toBeVisible();

  // Пункт меню появился со счётчиком; переживает перезагрузку
  await page.reload();
  await page.getByRole('link', { name: /Отложенные\s*1/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Отложенные' })).toBeVisible();
  await expect(page.locator('.card-wrap')).toHaveCount(1);

  await page.getByRole('button', { name: 'Отправить мастеру в ВК' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('скопирована');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Мне понравились');
  expect(text).toContain(`1. «Тестовый ангел» — `);
  await page.getByRole('dialog').getByRole('button', { name: 'Остаться на сайте' }).click();

  await page.getByRole('button', { name: 'Очистить список' }).click();
  await expect(page.getByText('Здесь пока пусто')).toBeVisible();
});

test('подборки по поводу, материал, размер и срок изготовления', async ({ page, request }) => {
  const api = await adminApi(request);
  const gift = await api.create('products', {
    title: 'Неваляшка для учителя',
    price: 800,
    stock: 'to_order',
    lead_time: '7–10 дней',
    material: 'липа, акрил',
    size: 'высота 12 см',
    occasions: ['учителю'],
    category: product.category,
  });

  await page.goto('/catalog');
  const chips = page.getByRole('group', { name: 'Подборки по поводу' });
  await chips.getByRole('button', { name: 'учителю' }).click();
  await expect(page.locator('.catalog__grid .card-wrap')).toHaveCount(1);
  await expect(page.getByText('Неваляшка для учителя')).toBeVisible();
  // «до 1000 ₽» — по цене: тестовый ангел за 1200 туда не попадает
  await chips.getByRole('button', { name: 'учителю' }).click();
  await chips.getByRole('button', { name: 'до 1000 ₽' }).click();
  await expect(page.getByText('Тестовый ангел', { exact: true })).toHaveCount(0);

  await page.goto(`/izdelie/${gift.id}`);
  await expect(page.getByText('Мастер сделает его для вас за 7–10 дней')).toBeVisible();
  await expect(page.locator('.product__meta')).toContainText('липа, акрил');
  await expect(page.locator('.product__meta')).toContainText('высота 12 см');
  await page.locator('.product__occasions').getByRole('link', { name: 'учителю' }).click();
  await expect(chips.getByRole('button', { name: 'учителю' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.catalog__grid .card-wrap')).toHaveCount(1);
  await api.remove('products', gift.id);
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

test('безопасность: заголовки, сжатие, ни одного нарушения CSP', async ({ page, request }) => {
  const home = await request.get('/', { headers: { 'Accept-Encoding': 'gzip' } });
  const headers = home.headers();
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-encoding']).toBe('gzip');
  // Панель базы — со своей политикой от PocketBase, наша её не перебивает
  expect((await request.get('/_/')).headers()['content-security-policy']).not.toContain('mc.yandex.ru');

  // Нарушения политики браузер не бросает ошибкой, а шлёт событие — собираем их
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.goto('/?reset');
  // Главная с настоящей моделью: WebAssembly распаковщика, текстуры через blob:
  await expect(page.locator('.scenario__loading')).not.toBeAttached({ timeout: 30_000 });
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  for (const path of ['/catalog', `/izdelie/${product.id}`, '/order', '/admin']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.__csp), path).toEqual([]);
  }
});

test('каталог обновляется сам: новый товар появляется без перезагрузки (realtime сквозь сжатие)', async ({ page, request }) => {
  await page.goto('/catalog');
  await expect(page.locator('.card').first()).toBeVisible();
  const api = await adminApi(request);
  const [category] = await api.list('categories', '&sort=sort');
  const fresh = await api.create('products', { title: 'Ангел на лету', stock: 'in_stock', category: category.id });
  try {
    await expect(page.locator('.card', { hasText: 'Ангел на лету' })).toBeVisible({ timeout: 10_000 });
  } finally {
    await api.remove('products', fresh.id);
  }
});

test('цвет строки браузера (theme-color) — как у темы, и до, и после загрузки сайта', async ({ page }) => {
  for (const theme of ['malachite', 'kraft']) {
    await page.goto(`/catalog?theme=${theme}`);
    const meta = () => page.locator('meta[name="theme-color"]').getAttribute('content');
    const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim());
    expect(await meta(), theme).toBe(token);
    // В самом index.html (до React) — тот же цвет: превью ВК и первая отрисовка
    if (theme === 'malachite') expect((await (await page.request.get('/')).text())).toContain(`name="theme-color" content="${token}"`);
  }
});

test('бездействие 2 минуты: выглядывает матрёшка с подсказкой, раз за визит', async ({ page }) => {
  // fastForward перескакивает время: runFor честно крутил бы каждый кадр 3D на странице заказа
  await page.clock.install();
  // Действие сбрасывает отсчёт: 1,5 мин тишины, движение мышью, ещё 1 мин — подсказки нет
  await page.goto('/catalog?theme=malachite');
  await expect(page.locator('.card').first()).toBeVisible();
  await page.clock.fastForward(90_000);
  await page.mouse.move(200, 200);
  await page.clock.fastForward(60_000);
  await expect(page.locator('.idle-hint')).toHaveCount(0);

  // Ещё минута тишины — две минуты с последнего движения: выглянула
  await page.clock.fastForward(61_000);
  const hint = page.locator('.idle-hint');
  await expect(hint).toContainText('Не нашли нужное?');
  await expect(hint.locator('img')).toHaveAttribute('src', '/img/decor-romashka-faces-left.webp');

  // Кнопка ведёт в заказ, подсказка уходит и за этот визит больше не появится
  await hint.getByRole('link', { name: 'Индивидуальный заказ' }).click();
  await expect(page).toHaveURL(/\/order$/);
  await expect(hint).toHaveCount(0);
  await page.clock.fastForward(150_000);
  await expect(hint).toHaveCount(0);
});
