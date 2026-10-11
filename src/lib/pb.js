import PocketBase from 'pocketbase';

/**
 * Клиент базы товаров (PocketBase). Сайт и база живут по одному адресу:
 * в разработке — через прокси Vite (vite.config.js), на хостинге PocketBase
 * сам раздаёт собранный сайт.
 */
export const pb = new PocketBase(window.location.origin);

// Запросы не отменяем автоматически: каталог и меню спрашивают одно и то же
pb.autoCancellation(false);
