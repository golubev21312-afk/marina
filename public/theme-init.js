/* Тема ставится до первой отрисовки, иначе мигнёт светлая. Ключ — как в src/theme/theme.js.
   Отдельным файлом, а не в index.html: политика безопасности (CSP, pb_hooks/security.pb.js)
   запрещает встроенные скрипты. Подключён без type="module" — выполняется сразу. */
(function () {
  // Сначала — тема по умолчанию: даже если хранилище недоступно
  document.documentElement.dataset.theme = 'malachite';
  try {
    // ?theme=malachite в адресе — открыть сразу в нужной теме (и запомнить)
    var fromUrl = new URLSearchParams(location.search).get('theme');
    if (fromUrl) localStorage.setItem('craft-theme', fromUrl);
    // По умолчанию — «Малахит»; «Белая» (kraft) — если человек её выбрал
    var theme = localStorage.getItem('craft-theme') === 'kraft' ? 'kraft' : 'malachite';
    document.documentElement.dataset.theme = theme;
    if (theme === 'kraft') {
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f1e7d4');
    }
  } catch {
    // Хранилище недоступно (приватный режим) — остаётся тема по умолчанию
  }
})();
