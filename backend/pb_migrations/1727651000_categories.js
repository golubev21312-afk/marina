/// <reference path="../pb_data/types.d.ts" />

/**
 * Разделы каталога — в базе, Марина правит их в админке.
 *   slug — латиницей, для адресов (/catalog?section=tagil); задаётся один раз
 *   subtitle — приписка («прогулки по Тагилу, тагильский характер»)
 *   description — текст на плашке над каталогом, если фактов о разделе нет
 *   sort — порядок во вкладках и меню
 * Сразу заполняется восемью разделами заказчика.
 */
const SEED = [
  ['nevalyashki', 'Неваляшки', '', ''],
  ['matryoshki', 'Матрёшки', '', ''],
  ['angels', 'Ангелы-хранители', '', 'Деревянный ангел с ручной росписью — тихий оберег для дома. Его дарят на новоселье, рождение малыша или просто в знак заботы.'],
  ['driftwood', 'Дрифтвуд', '', ''],
  ['keychains', 'Брелоки', '', 'Маленькая расписная вещица, которая всегда с собой — на ключах, сумке или рюкзаке.'],
  ['magnets', 'Магниты', '', 'Расписные магниты из дерева — чтобы тёплое воспоминание жило прямо на холодильнике.'],
  ['tagil', 'Нижний Тагил', 'прогулки по Тагилу, тагильский характер', ''],
  ['kids', 'Детские наборы', '', 'Погремушки, пирамидки и неваляшки из натурального дерева с нежной росписью — для самых маленьких.'],
];

migrate(
  (app) => {
    const categories = new Collection({
      type: 'base',
      name: 'categories',
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'title', type: 'text', required: true, max: 60 },
        { name: 'slug', type: 'text', required: true, max: 60, pattern: '^[a-z0-9-]+$' },
        { name: 'subtitle', type: 'text', max: 120 },
        { name: 'description', type: 'text', max: 600 },
        { name: 'sort', type: 'number', onlyInt: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)'],
    });
    app.save(categories);

    SEED.forEach(([slug, title, subtitle, description], i) => {
      const record = new Record(categories);
      record.set('slug', slug);
      record.set('title', title);
      record.set('subtitle', subtitle);
      record.set('description', description);
      record.set('sort', (i + 1) * 10);
      app.save(record);
    });
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('categories'));
  },
);
