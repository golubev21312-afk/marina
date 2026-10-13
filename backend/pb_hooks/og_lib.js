/// <reference path="../pb_data/types.d.ts" />

/**
 * Помощники для og_pages.pb.js (этот файл сам хуком не запускается —
 * у него нет «.pb» в имени, его подключают через require).
 */

// Собранный сайт: на хостинге — pb_public рядом с pb_hooks,
// при проверке на компьютере — craft/dist (запуск с --publicDir dist)
const INDEX_PATHS = [__hooks + '/../pb_public/index.html', __hooks + '/../../dist/index.html'];

const HOME_IMAGE = '/img/khozyayka-mednoy-gory.jpg';

function readIndex() {
  for (const path of INDEX_PATHS) {
    try {
      return toString($os.readFile(path));
    } catch (_) {
      // нет файла — пробуем следующий
    }
  }
  return null;
}

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Адрес сайта, с которого пришёл запрос: https://домен */
function baseUrl(e) {
  const proto = e.isTLS() ? 'https' : e.request.header.get('X-Forwarded-Proto') || 'http';
  return proto + '://' + e.request.host;
}

/**
 * Вписать в HTML заголовок, описание и картинку для ВК, Telegram и поиска.
 * Старые og-теги и description заменяются, недостающие — добавляются.
 */
function inject(html, meta) {
  const title = escape(meta.title);
  const description = escape(meta.description);
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + title + '</title>');
  html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/, '');
  html = html.replace(/<meta\s+property="og:(type|title|description|image|url)"[\s\S]*?\/>/g, '');
  const tags = [
    '<meta name="description" content="' + description + '" />',
    '<meta property="og:type" content="' + (meta.type || 'website') + '" />',
    '<meta property="og:title" content="' + title + '" />',
    '<meta property="og:description" content="' + description + '" />',
    '<meta property="og:image" content="' + escape(meta.image) + '" />',
    '<meta property="og:url" content="' + escape(meta.url) + '" />',
  ].join('\n    ');
  return html.replace('</head>', '    ' + tags + '\n  </head>');
}

/** Описание: первые ~200 символов текста, по границе слова. */
function shorten(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(' ', max) > 0 ? clean.lastIndexOf(' ', max) : max) + '…';
}

module.exports = { readIndex, baseUrl, inject, shorten, HOME_IMAGE };
