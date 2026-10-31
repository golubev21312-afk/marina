/// <reference path="../pb_data/types.d.ts" />

/**
 * Обязательный текст — не из одних пробелов (BUG-006 из тестирования).
 * required в PocketBase пропускает «     », и через API в каталог попадала
 * карточка без названия. Форма админки пробелы обрезает сама, но правило
 * должно держать сервер. Только то, что видно посетителю.
 */
const FIELDS = {
  products: ['title'],
  categories: ['title'],
  showcase: ['title'],
  reviews: ['author', 'text'],
};
const NOT_BLANK = '\\S';

migrate(
  (app) => {
    for (const [name, fields] of Object.entries(FIELDS)) {
      const c = app.findCollectionByNameOrId(name);
      for (const field of fields) c.fields.getByName(field).pattern = NOT_BLANK;
      app.save(c);
    }
  },
  (app) => {
    for (const [name, fields] of Object.entries(FIELDS)) {
      const c = app.findCollectionByNameOrId(name);
      for (const field of fields) c.fields.getByName(field).pattern = '';
      app.save(c);
    }
  },
);
