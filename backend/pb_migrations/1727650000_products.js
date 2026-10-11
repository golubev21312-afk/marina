/// <reference path="../pb_data/types.d.ts" />

/**
 * Коллекция «Товары». Смотреть может любой посетитель сайта,
 * добавлять, менять и удалять — только администратор (Марина).
 * Разделы — те же id, что в src/data/categories.json.
 */
migrate(
  (app) => {
    const products = new Collection({
      type: 'base',
      name: 'products',
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'description', type: 'text', max: 3000 },
        { name: 'price', type: 'number', min: 0, onlyInt: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['nevalyashki', 'matryoshki', 'angels', 'driftwood', 'keychains', 'magnets', 'tagil', 'kids'],
        },
        {
          name: 'photos',
          type: 'file',
          maxSelect: 10,
          maxSize: 15 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
          // Уменьшенные копии: карточка каталога и превью в админке
          thumbs: ['600x750', '240x300'],
        },
        { name: 'available', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(products);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('products'));
  },
);
