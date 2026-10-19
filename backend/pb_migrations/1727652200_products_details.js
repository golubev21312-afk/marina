/// <reference path="../pb_data/types.d.ts" />

/**
 * Подробности изделия — заполняет Марина в админке, всё необязательно:
 *   occasions — поводы, для кого («учителю», «на свадьбу»): фильтр в каталоге
 *   lead_time — срок изготовления под заказ («7–10 дней»)
 *   material  — материал (пусто — «дерево, ручная роспись»)
 *   size      — размер («высота 12 см»)
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new JSONField({ name: 'occasions', maxSize: 2000 }));
    products.fields.add(new TextField({ name: 'lead_time', max: 60 }));
    products.fields.add(new TextField({ name: 'material', max: 120 }));
    products.fields.add(new TextField({ name: 'size', max: 60 }));
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    ['occasions', 'lead_time', 'material', 'size'].forEach((name) => products.fields.removeByName(name));
    app.save(products);
  },
);
