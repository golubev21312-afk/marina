import { expect } from '@playwright/test';
import { ADMIN, EDITOR } from './accounts.mjs';

/** Вход в админку под редактором (как Марина). */
export async function login(page, account = EDITOR) {
  await page.goto('/admin');
  await page.getByLabel('Почта').fill(account.email);
  await page.getByLabel('Пароль').fill(account.password);
  // База пускает не больше 2 входов за 3 секунды — тесты входят часто
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'Войти' }).click();
    const result = await Promise.race([
      page.getByRole('tab', { name: /Товары/ }).waitFor().then(() => 'ok'),
      page.getByText(/Слишком много попыток/).waitFor().then(() => 'wait'),
    ]);
    if (result === 'ok') return;
    await page.waitForTimeout(3500);
  }
  await expect(page.getByRole('tab', { name: /Товары/ })).toBeVisible();
}

// Вход суперпользователя — один на все тесты: база пускает не больше двух
// входов за 3 с (защита от подбора), лишние входы она молча отклоняла
let adminToken = null;

async function superuserToken(request) {
  for (let attempt = 1; !adminToken; attempt++) {
    const response = await request.post('/api/collections/_superusers/auth-with-password', {
      data: { identity: ADMIN.email, password: ADMIN.password },
    });
    if (response.ok()) adminToken = (await response.json()).token;
    else if (attempt === 5) throw new Error(`Суперпользователь не вошёл: ${await response.text()}`);
    else await new Promise((r) => setTimeout(r, 1500));
  }
  return adminToken;
}

/** Запросы к базе от суперпользователя — подготовить данные и проверить, что записалось. */
export async function adminApi(request) {
  const headers = { Authorization: await superuserToken(request) };
  return {
    list: async (collection, query = '') =>
      (await (await request.get(`/api/collections/${collection}/records?perPage=200${query}`, { headers })).json()).items,
    // Не создалось — падаем с ответом базы, а не идём дальше с ошибкой вместо записи
    create: async (collection, data) => {
      const response = await request.post(`/api/collections/${collection}/records`, { headers, data });
      if (!response.ok()) throw new Error(`Не создалась запись в ${collection}: ${await response.text()}`);
      return response.json();
    },
    // То же с файлами: multipart, файл — { name, mimeType, buffer }
    upload: async (collection, multipart) => {
      const response = await request.post(`/api/collections/${collection}/records`, { headers, multipart });
      if (!response.ok()) throw new Error(`Не создалась запись в ${collection}: ${await response.text()}`);
      return response.json();
    },
    update: (collection, id, data) => request.patch(`/api/collections/${collection}/records/${id}`, { headers, data }),
    remove: (collection, id) => request.delete(`/api/collections/${collection}/records/${id}`, { headers }),
  };
}

/** Настоящий ВК в тестах не открываем. */
export async function blockVk(page) {
  await page.context().route(/https:\/\/(vk\.me|vk\.ru|vk\.com)\//, (route) => route.abort());
}
