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

/** Запросы к базе от суперпользователя — подготовить данные и проверить, что записалось. */
export async function adminApi(request) {
  const { token } = await (
    await request.post('/api/collections/_superusers/auth-with-password', {
      data: { identity: ADMIN.email, password: ADMIN.password },
    })
  ).json();
  const headers = { Authorization: token };
  return {
    list: async (collection, query = '') =>
      (await (await request.get(`/api/collections/${collection}/records?perPage=200${query}`, { headers })).json()).items,
    create: async (collection, data) =>
      (await request.post(`/api/collections/${collection}/records`, { headers, data })).json(),
    remove: (collection, id) => request.delete(`/api/collections/${collection}/records/${id}`, { headers }),
  };
}

/** Настоящий ВК в тестах не открываем. */
export async function blockVk(page) {
  await page.context().route(/https:\/\/(vk\.me|vk\.ru|vk\.com)\//, (route) => route.abort());
}
