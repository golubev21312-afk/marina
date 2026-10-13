/// <reference path="../pb_data/types.d.ts" />

/**
 * Ошибки, случившиеся у посетителей в браузере (src/lib/errors.js) —
 * чтобы узнать о поломке раньше, чем Марине напишут «сайт не работает».
 * Смотреть — только суперпользователь в /_/ → client_errors.
 * Записывать может любой посетитель (частоту ограничивает общий лимит
 * запросов), читать, менять и удалять через сайт — никто.
 * Хранятся 30 дней (pb_hooks/client_errors_cleanup.pb.js).
 */
migrate(
  (app) => {
    const errors = new Collection({
      type: 'base',
      name: 'client_errors',
      listRule: null,
      viewRule: null,
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'message', type: 'text', required: true, max: 500 },
        { name: 'stack', type: 'text', max: 3000 },
        { name: 'path', type: 'text', max: 200 },
        { name: 'browser', type: 'text', max: 300 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_client_errors_created ON client_errors (created)'],
    });
    app.save(errors);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('client_errors'));
  },
);
