/// <reference path="../pb_data/types.d.ts" />

/**
 * Отзывы покупателей — Марина переносит их из ВК в админке (вкладка
 * «Отзывы»); на сайте — лента на «О мастерской» и под изделием, о котором
 * отзыв. Покупатели сами на сайте ничего не пишут.
 *   author  — как подписать («Анна», «Ольга, Екатеринбург»)
 *   text    — сам отзыв
 *   when    — когда, словами («сентябрь 2026»), необязательно
 *   product — о каком изделии, необязательно; удалили изделие — отзыв остаётся
 *   photo   — фото от покупателя, необязательно
 *   sort, visible — порядок в ленте и показывать ли
 */
const EDITOR = '@request.auth.collectionName = "editors"';

migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    const reviews = new Collection({
      type: 'base',
      name: 'reviews',
      listRule: '',
      viewRule: '',
      createRule: EDITOR,
      updateRule: EDITOR,
      deleteRule: EDITOR,
      fields: [
        { name: 'author', type: 'text', required: true, max: 80 },
        { name: 'text', type: 'text', required: true, max: 2000 },
        { name: 'when', type: 'text', max: 40 },
        { name: 'product', type: 'relation', collectionId: products.id, maxSelect: 1, cascadeDelete: false },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 15 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['480x480', '160x160'],
        },
        { name: 'sort', type: 'number', onlyInt: true },
        { name: 'visible', type: 'bool' },
        // Новая коллекция сама дат не заводит — а лента сортирует по created
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(reviews);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('reviews'));
  },
);
