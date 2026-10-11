/// <reference path="../pb_data/types.d.ts" />

/**
 * Товар ссылается на раздел из коллекции categories, а не на жёсткое слово:
 * раздел можно переименовать — товары останутся на месте.
 * Уже созданные товары переносятся по старому значению (оно = slug раздела).
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    const categories = app.findCollectionByNameOrId('categories');

    products.fields.add(
      new RelationField({
        name: 'category_ref',
        collectionId: categories.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    );
    app.save(products);

    app.findAllRecords('products').forEach((record) => {
      const slug = record.getString('category');
      if (!slug) return;
      const category = app.findFirstRecordByData('categories', 'slug', slug);
      record.set('category_ref', category.id);
      app.save(record);
    });

    products.fields.removeByName('category');
    const ref = products.fields.getByName('category_ref');
    ref.name = 'category';
    ref.required = true;
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.removeByName('category');
    products.fields.add(
      new SelectField({
        name: 'category',
        maxSelect: 1,
        values: ['nevalyashki', 'matryoshki', 'angels', 'driftwood', 'keychains', 'magnets', 'tagil', 'kids'],
      }),
    );
    app.save(products);
  },
);
