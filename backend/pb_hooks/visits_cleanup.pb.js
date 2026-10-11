/// <reference path="../pb_data/types.d.ts" />

/**
 * Статистика посещений хранится год: раз в час (пока база запущена)
 * удаляем записи visits старше 365 дней. По полю created есть индекс —
 * запрос быстрый. Время в базе — строкой «2025-10-12 03:00:00.000Z»,
 * поэтому сравниваем строки того же вида.
 */
cronAdd('visitsCleanup', '0 * * * *', () => {
  const border = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().replace('T', ' ');
  $app.db().newQuery('DELETE FROM visits WHERE created < {:border}').bind({ border }).execute();
});
