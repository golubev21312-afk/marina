/// <reference path="../pb_data/types.d.ts" />

/**
 * Черновик (п. 13 «Улучшений-2»): товар сохранён, но посетителям не виден,
 * пока Марина не нажмёт «Показать». Как корзина — правило ниже; Марине
 * (editors) видно всё. Превью для ВК черновик тоже не показывает (og_pages).
 */
const VISIBLE = '(deleted = "" && draft = false) || @request.auth.collectionName = "editors"';
const BEFORE = 'deleted = "" || @request.auth.collectionName = "editors"';

migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new BoolField({ name: 'draft' }));
    products.listRule = VISIBLE;
    products.viewRule = VISIBLE;
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.removeByName('draft');
    products.listRule = BEFORE;
    products.viewRule = BEFORE;
    app.save(products);
  },
);
