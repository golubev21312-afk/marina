/// <reference path="../pb_data/types.d.ts" />

/**
 * Автоматические копии базы (вместе с фото) — встроенные бэкапы PocketBase.
 * Каждые 3 часа, пока база запущена; хранятся 16 последних (~40 МБ при
 * нынешнем размере). Лежат в pb_data/backups, видны и восстанавливаются
 * в служебной панели /_/ → Settings → Backups.
 * Время по UTC: 00:00, 03:00, … (по Тагилу — 05:00, 08:00, …).
 */
migrate(
  (app) => {
    const settings = app.settings();
    settings.backups.cron = '0 */3 * * *';
    settings.backups.cronMaxKeep = 16;
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.backups.cron = '';
    settings.backups.cronMaxKeep = 3;
    app.save(settings);
  },
);
