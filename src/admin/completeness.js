/**
 * Что в карточке товара можно дописать (п. 14) — подсказки, а не запреты:
 * сохранить можно и так. Для формы (по тому, что в ней сейчас) и для списка.
 * { description, price, material, photoCount, stock, leadTime, occasions }
 */
export function missingInCard(card) {
  const missing = [];
  if (!card.description?.trim()) missing.push('описание');
  if (!card.price) missing.push('цену — без неё на сайте «цена по запросу»');
  if (!card.material?.trim()) missing.push('материал — без него на сайте «дерево, ручная роспись»');
  if (card.photoCount < 2) missing.push('ещё фото — лучше 2–3 с разных сторон');
  if (!card.occasions?.length) missing.push('поводы — без них изделие не попадёт в подбор подарка');
  if (card.stock !== 'in_stock' && !card.leadTime?.trim()) missing.push('срок изготовления');
  return missing;
}
