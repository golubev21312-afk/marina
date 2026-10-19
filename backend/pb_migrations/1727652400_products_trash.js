/// <reference path="../pb_data/types.d.ts" />

/**
 * Корзина: «Удалить» в админке не стирает товар, а ставит deleted — дату
 * удаления. Посетители такой товар не видят (правило ниже), Марина 30 дней
 * может вернуть его одной кнопкой; потом хук products_trash.pb.js стирает
 * его насовсем вместе с фото.
 */
const VISIBLE = 'deleted = "" || @request.auth.collectionName = "editors"';

migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new DateField({ name: 'deleted' }));
    products.listRule = VISIBLE;
    products.viewRule = VISIBLE;
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    // Откат: то, что лежало в корзине, стираем — иначе оно вернулось бы на сайт
    app.findRecordsByFilter('products', 'deleted != ""', '', 0, 0).forEach((record) => app.delete(record));
    products.fields.removeByName('deleted');
    products.listRule = '';
    products.viewRule = '';
    app.save(products);
  },
);
