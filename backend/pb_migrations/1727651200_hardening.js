/// <reference path="../pb_data/types.d.ts" />

/**
 * Защита и надёжность:
 * 1. Фото — только JPEG, PNG, WebP. HEIC база принимала, но браузеры
 *    (кроме Safari) его не показывают — товар остался бы без фото.
 *    Айфон при выборе фото на сайте сам отдаёт JPEG.
 * 2. Ограничение частоты запросов — против подбора пароля и спама.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.getByName('photos').mimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    app.save(products);

    const settings = app.settings();
    settings.rateLimits.enabled = true;
    app.save(settings);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.getByName('photos').mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    app.save(products);
    const settings = app.settings();
    settings.rateLimits.enabled = false;
    app.save(settings);
  },
);
