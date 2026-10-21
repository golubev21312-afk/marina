/**
 * Где человек был в каталоге: раздел, подборка, поиск, сортировка, прокрутка.
 * Только на этот визит и эту вкладку (sessionStorage). Восстанавливаем, когда
 * возвращаются из изделия — кнопкой «В каталог» или «Назад» браузера (CatalogPage).
 */
const KEY = 'craft-catalog';

export function readCatalogView() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function saveCatalogView(patch) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readCatalogView(), ...patch }));
  } catch {
    /* приватный режим — вернёмся в начало каталога, не страшно */
  }
}
