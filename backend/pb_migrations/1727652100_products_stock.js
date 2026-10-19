/// <reference path="../pb_data/types.d.ts" />

/**
 * Наличие изделия — три состояния вместо «да/нет»:
 *   in_stock — в наличии, to_order — под заказ (мастер сделает),
 *   sold_out — нет в наличии.
 * Уже созданные товары: available = true → in_stock, false → sold_out.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(
      new SelectField({ name: 'stock', values: ['in_stock', 'to_order', 'sold_out'], maxSelect: 1 }),
    );
    app.save(products);

    app.findAllRecords('products').forEach((record) => {
      record.set('stock', record.getBool('available') ? 'in_stock' : 'sold_out');
      app.save(record);
    });

    products.fields.removeByName('available');
    products.fields.getByName('stock').required = true;
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new BoolField({ name: 'available' }));
    app.save(products);

    app.findAllRecords('products').forEach((record) => {
      record.set('available', record.getString('stock') === 'in_stock');
      app.save(record);
    });

    products.fields.removeByName('stock');
    app.save(products);
  },
);
