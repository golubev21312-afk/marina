/**
 * Переводит тексты заказчика из content/stories-source.txt в src/data/stories.json.
 * Текст в исходнике лежит ровно так, как его прислали, — здесь мы только
 * разбираем его по заголовкам вида «1.Неваляшка-доктор» и режем на абзацы.
 *
 *   npm run stories
 */
import fs from 'node:fs';

const SOURCE = 'content/stories-source.txt';
const OUTPUT = 'src/data/stories.json';

/** Порядок в файле совпадает с нумерацией заказчика. */
const IDS = [
  'nevalyashka-doktor',
  'nevalyashka-uchitel',
  'kot-moryak',
  'angel-hranitel',
  'nevalyashka-deputat',
  'khozyayka-mednoy-gory',
];

const raw = fs.readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');

// split отдаёт: [до первого заголовка, номер, заголовок, текст, номер, заголовок, текст, …]
const chunks = raw.split(/^\s*(\d+)\.\s*(.+)$/m);
const stories = {};

for (let i = 1; i < chunks.length; i += 3) {
  const order = Number(chunks[i]);
  const id = IDS[order - 1];
  if (!id) {
    console.warn(`пункт ${order} не сопоставлен ни с одним изделием — пропущен`);
    continue;
  }

  stories[id] = {
    heading: chunks[i + 1].trim(),
    paragraphs: chunks[i + 2]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

fs.writeFileSync(OUTPUT, JSON.stringify(stories, null, 2) + '\n');

Object.entries(stories).forEach(([id, story]) => {
  console.log(`  ${id.padEnd(22)} абзацев: ${story.paragraphs.length}`);
});
console.log(`${SOURCE} → ${OUTPUT}`);
