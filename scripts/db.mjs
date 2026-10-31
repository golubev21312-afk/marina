/**
 * Запуск базы для разработки: http://127.0.0.1:8090, данные в backend/pb_data.
 * Программа базы своя под каждую систему — pocketbase.exe на Windows,
 * pocketbase на Linux и macOS (как в tests/e2e/server.mjs).
 *
 *   npm run db
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const exe = resolve('backend', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
if (!existsSync(exe)) {
  console.error(`Нет программы базы: ${exe}\nСкачать — см. README, раздел про PocketBase.`);
  process.exit(1);
}

const db = spawn(
  exe,
  ['serve', '--http', '127.0.0.1:8090', '--dir', 'backend/pb_data', '--migrationsDir', 'backend/pb_migrations', '--hooksDir', 'backend/pb_hooks'],
  { stdio: 'inherit' },
);
// Ctrl+C терминал шлёт и базе — ждём, пока она сама закроется
process.on('SIGINT', () => {});
db.on('exit', (code) => process.exit(code ?? 0));
