/**
 * Сервер для автотестов: собирает сайт и поднимает PocketBase на чистой
 * временной базе — как на хостинге (PocketBase сам раздаёт сайт и хуки).
 * Настоящую базу (backend/pb_data) не трогает. Запускает его Playwright
 * (playwright.config.js → webServer) и сам же гасит после тестов.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ADMIN, EDITOR, PORT } from './accounts.mjs';

const exe = resolve('backend', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const base = `http://127.0.0.1:${PORT}`;
// Прошлые временные базы: на Windows Playwright гасит сервер принудительно
// и уборка в конце не успевает — чистим при следующем запуске
for (const name of readdirSync(tmpdir())) {
  if (name.startsWith('kraft-e2e-')) rmSync(join(tmpdir(), name), { recursive: true, force: true });
}
const dir = mkdtempSync(join(tmpdir(), 'kraft-e2e-'));

const run = (cmd, args) => {
  // Через оболочку — только npx (на Windows это .cmd), программу базы — напрямую
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: cmd === 'npx' && process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} — ошибка`);
};

run('npx', ['vite', 'build', '--logLevel', 'warn']);
run(exe, ['superuser', 'upsert', ADMIN.email, ADMIN.password, '--dir', dir]);

const server = spawn(
  exe,
  ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', dir, '--migrationsDir', 'backend/pb_migrations', '--hooksDir', 'backend/pb_hooks', '--publicDir', 'dist'],
  { stdio: 'inherit' },
);

const stop = () => {
  server.kill();
  setTimeout(() => {
    rmSync(dir, { recursive: true, force: true });
    process.exit(0);
  }, 500);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code ?? 0);
});

// Ждём базу и заводим учётку редактора (как Марина)
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${base}/api/health`)).ok) break;
  } catch {
    // ещё не поднялась
  }
  await new Promise((r) => setTimeout(r, 200));
}
const auth = await (
  await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN.email, password: ADMIN.password }),
  })
).json();
await fetch(`${base}/api/collections/editors/records`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: auth.token },
  body: JSON.stringify({ email: EDITOR.email, password: EDITOR.password, passwordConfirm: EDITOR.password }),
});
// Сигнал Playwright «всё готово» — только после того, как заведён редактор
createServer((req, res) => res.end('ok')).listen(PORT + 1, '127.0.0.1');
console.log(`Тестовый сайт: ${base}`);
