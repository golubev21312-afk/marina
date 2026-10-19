/// <reference path="../pb_data/types.d.ts" />

/**
 * Корзина товаров хранится 30 дней: раз в час (пока база запущена)
 * стираем насовсем то, что удалили раньше. Через $app.delete — чтобы
 * вместе с записью ушли и фото. Время в базе — строкой
 * «2026-10-19 03:00:00.000Z», сравниваем строки того же вида.
 */
cronAdd('productsTrash', '30 * * * *', () => {
  const border = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().replace('T', ' ');
  $app
    .findRecordsByFilter('products', 'deleted != "" && deleted < {:border}', '', 0, 0, { border })
    .forEach((record) => $app.delete(record));
});
