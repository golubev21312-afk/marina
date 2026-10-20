import { defineConfig } from '@playwright/test';
import { PORT } from './tests/e2e/accounts.mjs';

/**
 * Автотесты сайта и админки: `npm run test:e2e`.
 * Сайт собирается и раздаётся PocketBase на чистой временной базе
 * (tests/e2e/server.mjs). Браузер — установленный Chrome, отдельно не качается.
 * Тесты идут по очереди: у них общая база.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  // Нет эталонного снимка (screens.spec.mjs) — записать его, а не падать
  updateSnapshots: 'missing',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    locale: 'ru-RU',
    // Обычный Chrome: в «безголовом» режиме сайт принял бы браузер за робота и не вёл статистику
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 860 },
    // Рисуем программно (SwiftShader), без видеокарты — и здесь, и на GitHub,
    // где её нет. Тесты не зависят от драйвера: 19.10 зависшая Intel UHD
    // давала ~1 кадр/с, и Playwright не мог дождаться, пока кнопка «встанет»
    launchOptions: {
      args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    // Порт +1 — сигнал из server.mjs, что база поднята и редактор заведён
    url: `http://127.0.0.1:${PORT + 1}`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
