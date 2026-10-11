/// <reference path="../pb_data/types.d.ts" />

/**
 * Статистика посещений для Марины (вкладка «Статистика» в админке).
 * Одна запись — одно событие на сайте:
 *   kind    — page (открыта страница) | section (выбран раздел каталога)
 *             | vk (нажали «Перейти в ВК»)
 *   path    — адрес страницы без домена: /, /catalog, /izdelie/…
 *   section — slug раздела каталога, product — id изделия (текстом, не
 *             связью: удалённое изделие не должно мешать удалению)
 *   vk      — куда в ВК: order (заказ изделия) | custom (свой заказ) | community
 *   visitor — случайный id браузера; по нему считаем «сколько человек».
 *             Ни имени, ни IP, ни cookie — личных данных нет
 *   entry   — первая страница захода; у неё source (vk | yandex | google |
 *             direct | other) и ref — сайт, с которого пришли (только домен)
 *   device  — mobile | desktop
 * Записывать может любой посетитель, читать — только редактор
 * (и суперпользователь). Менять и удалять через сайт нельзя.
 */
const EDITOR = '@request.auth.collectionName = "editors"';

migrate(
  (app) => {
    const visits = new Collection({
      type: 'base',
      name: 'visits',
      listRule: EDITOR,
      viewRule: EDITOR,
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['page', 'section', 'vk'] },
        { name: 'path', type: 'text', max: 200 },
        { name: 'section', type: 'text', max: 60 },
        { name: 'product', type: 'text', max: 30 },
        { name: 'vk', type: 'select', maxSelect: 1, values: ['order', 'custom', 'community'] },
        { name: 'visitor', type: 'text', required: true, max: 40 },
        { name: 'entry', type: 'bool' },
        { name: 'source', type: 'select', maxSelect: 1, values: ['vk', 'yandex', 'google', 'direct', 'other'] },
        { name: 'ref', type: 'text', max: 100 },
        { name: 'device', type: 'select', maxSelect: 1, values: ['mobile', 'desktop'] },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_visits_created ON visits (created)'],
    });
    app.save(visits);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('visits'));
  },
);
