import { pb } from './pb';

/**
 * Ошибки у посетителей — в базу (коллекция client_errors, смотреть в /_/).
 * Не больше 5 за открытие страницы и без повторов одной и той же; в
 * разработке и у роботов не шлём. Ошибки расширений браузера (чужие
 * скрипты) не наши — пропускаем.
 */
const LIMIT = 5;
const sent = new Set();

export function reportError(error, extra = '') {
  if (import.meta.env.DEV || /bot|crawl|spider|headless/i.test(navigator.userAgent)) return;
  const message = String(error?.message || error || 'Неизвестная ошибка').slice(0, 500);
  // Шум браузера, а не поломка сайта
  if (/ResizeObserver loop|Script error\.?$/i.test(message)) return;
  if (sent.has(message) || sent.size >= LIMIT) return;
  sent.add(message);
  pb.collection('client_errors')
    .create({
      message,
      stack: [error?.stack, extra].filter(Boolean).join('\n').slice(0, 3000),
      path: (location.pathname + location.search).slice(0, 200),
      browser: navigator.userAgent.slice(0, 300),
    })
    .catch(() => {});
}

/** Ловим всё, что не поймал код: ошибки скриптов и необработанные промисы. */
export function installErrorReporter() {
  window.addEventListener('error', (event) => {
    // Ошибка из чужого файла (расширение браузера) — не наша
    if (event.filename && !event.filename.startsWith(location.origin)) return;
    reportError(event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
}
