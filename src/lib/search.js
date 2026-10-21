/**
 * Поиск по каталогу: название, описание, материал, размер, поводы и раздел.
 * «ё» = «е», регистр не важен; слова — в любом порядке, найтись должны все.
 * Окончания отрезаем: «ангелы», «неваляшки», «учителю» находят «ангел»,
 * «неваляшка», «учитель». Без словаря — грубо, но для каталога хватает.
 */
const ENDINGS = ['ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ые', 'ие', 'ой', 'ей', 'ий', 'ый', 'ая', 'яя', 'ов', 'ев', 'ам', 'ям', 'ах', 'ях', 'а', 'я', 'о', 'е', 'и', 'ы', 'у', 'ю', 'ь', 'й'];

export const normalize = (text) => text.toLowerCase().replace(/ё/g, 'е');

/** Основа слова: без окончания, но не короче трёх букв. */
function stem(word) {
  const ending = ENDINGS.find((end) => word.endsWith(end) && word.length - end.length >= 3);
  return ending ? word.slice(0, -ending.length) : word;
}

/** Слова запроса → основы; пустой запрос — пустой список. */
export function parseQuery(query) {
  return normalize(query).split(/[^a-zа-я0-9]+/i).filter(Boolean).map(stem);
}

/**
 * Насколько изделие подходит: 0 — нет; 2 — все слова в названии; 1 — нашлись,
 * но не все в названии. sectionTitle — название раздела изделия.
 */
export function searchScore(item, words, sectionTitle = '') {
  if (!words.length) return 1;
  const title = normalize(item.title);
  const text = normalize(
    [item.title, item.description, item.material, item.size, sectionTitle, ...item.occasions].join(' '),
  );
  if (!words.every((word) => text.includes(word))) return 0;
  return words.every((word) => title.includes(word)) ? 2 : 1;
}
