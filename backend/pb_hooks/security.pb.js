/// <reference path="../pb_data/types.d.ts" />

/**
 * Сжатие ответов и заголовки безопасности — для сайта, который раздаёт
 * PocketBase (хостинг, --publicDir).
 *
 * Сжатие: модели, код и ответы базы уходят в gzip (модель 2,2 → 1,8 МБ,
 * код втрое меньше). Обновления «на лету» (realtime) сжатие не ломает —
 * это проверяет автотест.
 *
 * Политика (CSP) — только для страниц сайта: панель базы /_/ и API живут по
 * своим правилам. Что разрешено и зачем:
 *   script-src  — свои файлы; WebAssembly распаковщика модели (three.js,
 *                 meshopt); Яндекс.Метрика. Встроенных скриптов нет — тема
 *                 ставится из public/theme-init.js
 *   style-src   — свои файлы и стили из кода (анимации задают их на лету)
 *   img-src, connect-src — свои, data: и blob: (текстуры модели, превью фото
 *                 в админке), счётчик Метрики
 *   frame-src, child-src — Вебвизор Метрики
 * Шрифты — свои (/fonts), Google не нужен.
 */
routerUse($apis.gzip());

routerUse((e) => {
  const header = e.response.header();
  header.set('X-Content-Type-Options', 'nosniff');
  header.set('X-Frame-Options', 'DENY');
  header.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  header.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // HSTS — только по HTTPS (за прокси — по X-Forwarded-Proto), иначе браузер запомнит лишнее
  if (e.isTLS() || e.request.header.get('X-Forwarded-Proto') === 'https') {
    header.set('Strict-Transport-Security', 'max-age=31536000');
  }

  const path = e.request.url.path;
  if (!path.startsWith('/_/') && !path.startsWith('/api/')) {
    const metrika = 'https://mc.yandex.ru https://mc.yandex.com';
    header.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' 'wasm-unsafe-eval' https://mc.yandex.ru https://yastatic.net`,
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob: ${metrika}`,
        "font-src 'self'",
        `connect-src 'self' data: blob: ${metrika}`,
        `frame-src blob: ${metrika}`,
        `child-src blob: ${metrika}`,
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
  }

  return e.next();
});
