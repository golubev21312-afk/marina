/// <reference path="../pb_data/types.d.ts" />

/**
 * Ошибки посетителей хранятся 30 дней: раз в час (пока база запущена)
 * удаляем записи client_errors старше. Время в базе — строкой
 * «2025-10-12 03:00:00.000Z», сравниваем строки того же вида.
 */
cronAdd('clientErrorsCleanup', '30 * * * *', () => {
  const border = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().replace('T', ' ');
  $app.db().newQuery('DELETE FROM client_errors WHERE created < {:border}').bind({ border }).execute();
});
