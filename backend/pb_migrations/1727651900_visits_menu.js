/// <reference path="../pb_data/types.d.ts" />

/**
 * Статистика: кнопка «Заказать в ВК» в меню сайта считается отдельно
 * (menu) — раньше шла вместе с заказом со страницы изделия (order).
 */
migrate(
  (app) => {
    const visits = app.findCollectionByNameOrId('visits');
    visits.fields.getByName('vk').values = ['order', 'custom', 'community', 'menu'];
    app.save(visits);
  },
  (app) => {
    const visits = app.findCollectionByNameOrId('visits');
    visits.fields.getByName('vk').values = ['order', 'custom', 'community'];
    app.save(visits);
  },
);
