/// <reference path="../pb_data/types.d.ts" />

/**
 * Карусель на главной — отдельно от каталога, Марина правит её в админке
 * (вкладка «Главная»).
 *   photo — фото карточки (у нынешних шести — вырезаны на общий фон)
 *   story — история на обороте; каждая строка — отдельный абзац
 *   sort — порядок в карусели, visible — показывать ли на главной
 * Сразу заполняется шестью карточками, которые раньше были прописаны в коде:
 * фото из public/img, истории — дословно из src/data/stories.json.
 * Миграция читает файлы от папки craft/ — оттуда запускается `npm run db`.
 */
const EDITOR = '@request.auth.collectionName = "editors"';

const SEED = [
  ['nevalyashka-doktor', 'Неваляшка «Доктор»'],
  ['nevalyashka-uchitel', 'Неваляшка «Учитель»'],
  ['kot-moryak', 'Кот-Моряк'],
  ['angel-hranitel', 'Ангел-хранитель'],
  ['nevalyashka-deputat', 'Неваляшка-депутат'],
  ['khozyayka-mednoy-gory', 'Хозяйка Медной горы'],
];

migrate(
  (app) => {
    const showcase = new Collection({
      type: 'base',
      name: 'showcase',
      listRule: '',
      viewRule: '',
      createRule: EDITOR,
      updateRule: EDITOR,
      deleteRule: EDITOR,
      fields: [
        { name: 'title', type: 'text', required: true, max: 120 },
        {
          name: 'photo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 15 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          // Карточка карусели и превью в админке
          thumbs: ['600x800', '240x320'],
        },
        { name: 'story', type: 'text', max: 5000 },
        { name: 'sort', type: 'number', onlyInt: true },
        { name: 'visible', type: 'bool' },
      ],
    });
    app.save(showcase);

    const stories = JSON.parse(toString($os.readFile('src/data/stories.json')));
    SEED.forEach(([id, title], i) => {
      const record = new Record(showcase);
      record.set('title', title);
      record.set('photo', $filesystem.fileFromPath(`public/img/${id}.jpg`));
      record.set('story', (stories[id]?.paragraphs ?? []).join('\n'));
      record.set('sort', (i + 1) * 10);
      record.set('visible', true);
      app.save(record);
    });
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('showcase'));
  },
);
