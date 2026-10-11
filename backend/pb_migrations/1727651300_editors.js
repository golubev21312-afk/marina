/// <reference path="../pb_data/types.d.ts" />

/**
 * Учётки редакторов (Марина): входят в админку /admin и правят только
 * товары и разделы. В служебную панель базы /_/ с ними не войти —
 * она только у суперпользователя (Андрей).
 * Зарегистрироваться самому нельзя: учётку заводит суперпользователь в /_/.
 */
const EDITOR = '@request.auth.collectionName = "editors"';

migrate(
  (app) => {
    const editors = new Collection({
      type: 'auth',
      name: 'editors',
      // Редактор видит и меняет только свою учётку (почта, пароль)
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: null,
      updateRule: 'id = @request.auth.id',
      deleteRule: null,
      passwordAuth: { enabled: true, identityFields: ['email'] },
      fields: [{ name: 'name', type: 'text', max: 60 }],
    });
    app.save(editors);

    ['products', 'categories'].forEach((name) => {
      const collection = app.findCollectionByNameOrId(name);
      collection.createRule = EDITOR;
      collection.updateRule = EDITOR;
      collection.deleteRule = EDITOR;
      app.save(collection);
    });
  },
  (app) => {
    ['products', 'categories'].forEach((name) => {
      const collection = app.findCollectionByNameOrId(name);
      collection.createRule = null;
      collection.updateRule = null;
      collection.deleteRule = null;
      app.save(collection);
    });
    app.delete(app.findCollectionByNameOrId('editors'));
  },
);
