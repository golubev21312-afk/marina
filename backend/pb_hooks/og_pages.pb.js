/// <reference path="../pb_data/types.d.ts" />

/**
 * Превью ссылок для ВК, Telegram и поиска. Они не выполняют JavaScript и
 * видят только HTML — поэтому, когда PocketBase раздаёт сайт (хостинг,
 * --publicDir), он сам вписывает в страницу заголовок, описание и картинку:
 *   /izdelie/<id> — название, описание и первое фото изделия
 *   /, /catalog, /about, /order — общая картинка мастерской
 * Дальше страницу как обычно рисует React. Помощники — в og_lib.js.
 */

routerAdd('GET', '/izdelie/{id}', (e) => {
  const og = require(`${__hooks}/og_lib.js`);
  const html = og.readIndex();
  if (!html) return e.next();
  const base = og.baseUrl(e);

  let record = null;
  try {
    record = $app.findRecordById('products', e.request.pathValue('id'));
  } catch (_) {
    // Изделия нет — отдаём сайт как есть, он сам скажет «Такого изделия нет»
    return e.html(200, html);
  }

  const photos = record.get('photos') || [];
  const image = photos.length
    ? base + '/api/files/' + record.collection().id + '/' + record.id + '/' + photos[0] + '?thumb=600x750'
    : base + og.HOME_IMAGE;
  const price = record.getInt('price');

  return e.html(
    200,
    og.inject(html, {
      type: 'product',
      title: record.getString('title') + ' — мастерская «Крафт»',
      description:
        og.shorten(record.getString('description'), 200) ||
        'Ручная работа, Нижний Тагил' + (price ? ' · ' + price + ' ₽' : '') + '. Заказ — в сообщениях ВКонтакте.',
      image: image,
      url: base + '/izdelie/' + record.id,
    }),
  );
});

// Обработчики в PocketBase изолированы — данные страниц объявлены внутри
for (const pattern of ['/{$}', '/catalog', '/about', '/order']) {
  routerAdd('GET', pattern, (e) => {
    const og = require(`${__hooks}/og_lib.js`);
    const html = og.readIndex();
    if (!html) return e.next();
    const base = og.baseUrl(e);
    const pages = {
      '/': ['Крафт — эксклюзивные подарки ручной работы', ''],
      '/catalog': ['Каталог — мастерская «Крафт»', '/catalog'],
      '/about': ['О мастерской «Крафт»', '/about'],
      '/order': ['Индивидуальный заказ — мастерская «Крафт»', '/order'],
    };
    const [title, path] = pages[e.request.url.path] || pages['/'];
    return e.html(
      200,
      og.inject(html, {
        title: title,
        description: 'Дерево обретает вторую жизнь, а ручная роспись превращает его в уникальный подарок. Нижний Тагил.',
        image: base + og.HOME_IMAGE,
        url: base + path + (e.request.url.rawQuery ? '?' + e.request.url.rawQuery : ''),
      }),
    );
  });
}
