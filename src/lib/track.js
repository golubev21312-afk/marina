import { pb } from './pb';

/**
 * Статистика посещений.
 * 1. Свой счётчик — коллекция visits в базе, цифры видит Марина во вкладке
 *    «Статистика». Без cookie и личных данных: «человек» — случайный id,
 *    который браузер хранит у себя.
 * 2. Яндекс.Метрика — только если задан номер счётчика (VITE_YM_ID в .env)
 *    и посетитель согласился на cookie (плашка CookieNotice).
 * Не считаем: админку, вошедших редакторов (Марина смотрит сайт — это не
 * посетитель) и поисковых роботов.
 */

export const YM_ID = import.meta.env.VITE_YM_ID || '';

const CONSENT_KEY = 'craft-cookies'; // 'yes' | 'no' — ответ на плашку о cookie

const read = (storage, key) => {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
};
const write = (storage, key, value) => {
  try {
    window[storage].setItem(key, value);
  } catch {
    // хранилище недоступно (приватный режим) — просто не запомним
  }
};

let memoryVisitor = '';
function visitorId() {
  let id = read('localStorage', 'craft-visitor') || memoryVisitor;
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
    write('localStorage', 'craft-visitor', id);
    memoryVisitor = id;
  }
  return id;
}

const isBot = () => /bot|crawl|spider|slurp|preview|headless/i.test(navigator.userAgent);
const skip = () => location.pathname.startsWith('/admin') || pb.authStore.isValid || isBot();

const device = () =>
  (navigator.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) ? 'mobile' : 'desktop';

/** Откуда пришли — по сайту, с которого перешли (только при первом открытии). */
function source() {
  let host = '';
  try {
    host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }
  if (!host || host === location.hostname) return { source: 'direct', ref: '' };
  if (/(^|\.)(vk\.com|vk\.ru|vk\.me|vkontakte\.ru)$/.test(host)) return { source: 'vk', ref: host };
  if (/(^|\.)(yandex\.[a-z]+|ya\.ru)$/.test(host)) return { source: 'yandex', ref: host };
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return { source: 'google', ref: host };
  return { source: 'other', ref: host.slice(0, 100) };
}

// Одно и то же событие дважды подряд (React в разработке запускает
// эффекты дважды) записываем один раз
let last = { key: '', at: 0 };

function send(data) {
  if (skip()) return;
  const key = JSON.stringify(data);
  const now = Date.now();
  if (key === last.key && now - last.at < 1500) return;
  last = { key, at: now };

  const record = { ...data, path: location.pathname.slice(0, 200), visitor: visitorId(), device: device() };
  if (data.kind === 'page' && !read('sessionStorage', 'craft-entry')) {
    write('sessionStorage', 'craft-entry', '1');
    Object.assign(record, { entry: true }, source());
  }
  // Статистика не должна мешать сайту: ошибка — молча мимо
  pb.collection('visits')
    .create(record, { requestKey: null })
    .catch(() => {});
}

/** Открыта страница (зовётся при каждой смене адреса). */
export function trackPage() {
  const params = new URLSearchParams(location.search);
  const section = location.pathname === '/catalog' ? params.get('section') : null;
  const product = location.pathname.match(/^\/izdelie\/([^/]+)/)?.[1];
  send({
    kind: 'page',
    ...(section && section !== 'all' && { section: section.slice(0, 60) }),
    ...(product && { product: decodeURIComponent(product).slice(0, 30) }),
  });
  ymHit();
}

/** Выбран раздел во вкладках каталога. */
export function trackSection(slug) {
  if (!slug || slug === 'all') return;
  send({ kind: 'section', section: slug.slice(0, 60) });
}

/** Нажали «Перейти в ВК»: order — заказ изделия, custom — свой заказ, community — сообщество. */
export function trackVk(target) {
  send({ kind: 'vk', vk: target });
  ymCall('reachGoal', `vk_${target}`);
}

/* ---------- Яндекс.Метрика ---------- */

export const consent = () => read('localStorage', CONSENT_KEY);

let ymLoaded = false;
function ymCall(...args) {
  if (ymLoaded && !skip()) window.ym(Number(YM_ID), ...args);
}

// Страница для Метрики — тоже один раз: при загрузке её отмечают и
// startMetrika, и смена адреса
let lastHit = { url: '', at: 0 };
function ymHit() {
  if (!ymLoaded) return;
  const url = location.pathname + location.search;
  const now = Date.now();
  if (url === lastHit.url && now - lastHit.at < 1500) return;
  lastHit = { url, at: now };
  ymCall('hit', url, { referer: document.referrer });
}

/** Подключить Метрику — только с номером счётчика и после согласия. */
export function startMetrika() {
  if (!YM_ID || ymLoaded || consent() !== 'yes' || isBot()) return;
  ymLoaded = true;
  // Стандартный код счётчика из кабинета Метрики, без <noscript>
  window.ym =
    window.ym ||
    function (...args) {
      (window.ym.a = window.ym.a || []).push(args);
    };
  window.ym.l = Date.now();
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(script);
  // defer — страницы отмечаем сами (trackPage), сайт одностраничный
  window.ym(Number(YM_ID), 'init', { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  ymHit();
}

/** Передумать (страница политики): забыть ответ и перезагрузить — плашка спросит снова, Метрика выгрузится. */
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // хранилище недоступно — ответ и так не запомнен
  }
  location.reload();
}

export function setConsent(yes) {
  write('localStorage', CONSENT_KEY, yes ? 'yes' : 'no');
  if (yes) startMetrika();
}
