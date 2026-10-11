/// <reference path="../pb_data/types.d.ts" />

/**
 * Ручной порядок товаров: Марина двигает их ↑↓ в админке, каталог
 * показывает в том же порядке. Меньше sort — выше. Новый товар встаёт
 * первым (как раньше, когда список шёл от новых к старым).
 * Уже созданные товары нумеруются в нынешнем порядке — от новых к старым.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new NumberField({ name: 'sort', onlyInt: true }));
    app.save(products);

    app.findRecordsByFilter('products', '', '-created', 0, 0).forEach((record, i) => {
      record.set('sort', (i + 1) * 10);
      app.save(record);
    });
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.removeByName('sort');
    app.save(products);
  },
);
