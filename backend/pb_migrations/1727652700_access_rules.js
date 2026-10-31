/// <reference path="../pb_data/types.d.ts" />

/**
 * Доступ к базе (BUG-001, 002, 003 из тестирования):
 * 1. Скрытые отзывы и слайды витрины сервер посетителю не отдаёт — раньше
 *    их отсеивал только браузер, а по /api/... было видно всё. Марине
 *    (editors) видно всё, как с черновиками изделий.
 * 2. Стандартная коллекция PocketBase users сайту не нужна (вход только у
 *    editors), но была открыта: без входа заводился аккаунт с аватаркой —
 *    бесплатное файловое хранилище. Не удаляем (системная), а закрываем
 *    целиком: null — только суперпользователь.
 */
const EDITOR = '@request.auth.collectionName = "editors"';
const VISIBLE = 'visible = true || ' + EDITOR;
const USERS_OWN = 'id = @request.auth.id';

migrate(
  (app) => {
    for (const name of ['reviews', 'showcase']) {
      const c = app.findCollectionByNameOrId(name);
      c.listRule = VISIBLE;
      c.viewRule = VISIBLE;
      app.save(c);
    }

    const users = app.findCollectionByNameOrId('users');
    users.listRule = null;
    users.viewRule = null;
    users.createRule = null;
    users.updateRule = null;
    users.deleteRule = null;
    app.save(users);
  },
  (app) => {
    for (const name of ['reviews', 'showcase']) {
      const c = app.findCollectionByNameOrId(name);
      c.listRule = '';
      c.viewRule = '';
      app.save(c);
    }

    // Правила users по умолчанию в PocketBase
    const users = app.findCollectionByNameOrId('users');
    users.listRule = USERS_OWN;
    users.viewRule = USERS_OWN;
    users.createRule = '';
    users.updateRule = USERS_OWN;
    users.deleteRule = USERS_OWN;
    app.save(users);
  },
);
