/// <reference path="../pb_data/types.d.ts" />

/**
 * Свои превью фото в WebP (п. 14 «Улучшений»). Превью базы из WebP
 * получаются в PNG и весят вдвое больше JPEG — поэтому уменьшенные копии
 * делает админка и кладёт в previews, по два размера на фото. Как сайт
 * находит превью своего фото — src/lib/photoPreviews.js. Старые записи
 * дополняет scripts/make-previews.mjs.
 */
const PREVIEWS = { products: 20, showcase: 2, reviews: 2 };

migrate(
  (app) => {
    for (const [name, maxSelect] of Object.entries(PREVIEWS)) {
      const collection = app.findCollectionByNameOrId(name);
      collection.fields.add(
        new FileField({
          name: 'previews',
          maxSelect,
          maxSize: 2 * 1024 * 1024,
          mimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
        }),
      );
      app.save(collection);
    }
  },
  (app) => {
    for (const name of Object.keys(PREVIEWS)) {
      const collection = app.findCollectionByNameOrId(name);
      collection.fields.removeByName('previews');
      app.save(collection);
    }
  },
);
