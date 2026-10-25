import { STOCK } from '../lib/products';
import { makeXlsx } from './xlsx';

/**
 * Список товаров в Excel — для учёта (п. 18): название, раздел, цена,
 * наличие. Все товары админки (без корзины, с черновиками), в её порядке.
 * Цена — числом, чтобы Excel мог посчитать сумму; без цены — пустая ячейка.
 */
export function downloadProductsExcel(items, categoryTitle) {
  const columns = [
    { title: 'Название', width: 42 },
    { title: 'Раздел', width: 24 },
    { title: 'Цена', width: 12, money: true },
    { title: 'Наличие', width: 16 },
  ];
  const rows = items.map((item) => [item.title, categoryTitle(item.categoryId), item.price, STOCK[item.stock]]);
  const blob = makeXlsx('Товары', columns, rows);

  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `kraft-tovary-${date}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  // Сразу отзывать нельзя — браузер ещё не начал скачивание
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}
