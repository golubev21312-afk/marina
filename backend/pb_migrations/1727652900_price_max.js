/// <reference path="../pb_data/types.d.ts" />

/**
 * Потолок цены — 1 000 000 ₽ (BUG-008 из тестирования). Без него опечатка
 * с лишними нулями сохранялась, и бейдж цены растягивался на всю карточку.
 * Такое же ограничение — в форме админки (ProductEditor, MAX_PRICE).
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.getByName('price').max = 1000000;
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.getByName('price').max = null;
    app.save(products);
  },
);
