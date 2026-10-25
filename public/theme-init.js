/* Тема ставится до первой отрисовки, иначе мигнёт не та. Ключ — как в src/theme/theme.js.
   Отдельным файлом, а не в index.html: политика безопасности (CSP, pb_hooks/security.pb.js)
   запрещает встроенные скрипты. Подключён без type="module" — выполняется сразу. */
(function () {
  // Не выбирал сам — как у устройства: светлое — «Белая» (kraft), тёмное или
  // не сообщает — «Малахит». То же правило — systemTheme() в src/theme/theme.js
  var theme =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'kraft' : 'malachite';
  try {
    // ?theme=malachite в адресе — открыть сразу в нужной теме (и запомнить)
    var fromUrl = new URLSearchParams(location.search).get('theme');
    if (fromUrl) localStorage.setItem('craft-theme', fromUrl);
    // Выбор человека кнопкой главнее устройства
    var saved = localStorage.getItem('craft-theme');
    if (saved === 'kraft' || saved === 'malachite') theme = saved;
  } catch {
    // Хранилище недоступно (приватный режим) — тема как у устройства
  }
  document.documentElement.dataset.theme = theme;
  if (theme === 'kraft') {
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f1e7d4');
  }
})();
