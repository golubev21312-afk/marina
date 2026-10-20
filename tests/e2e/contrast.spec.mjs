import { test } from '@playwright/test';
import { adminApi } from './helpers.mjs';

/**
 * Замер контраста текста на живом фоне (п. 17): прячем текст, снимаем экран и под
 * каждой надписью берём худшие 10 % пикселей фона; норма WCAG — 4,5, крупный текст — 3.
 * В обычном прогоне выключен. Запуск (Git Bash):
 *   CONTRAST=1 npx playwright test tests/e2e/contrast.spec.mjs
 * Ещё: THEMES=malachite,kraft  PAGES=/catalog,PRODUCT  CSS='…примерить цвета…'
 *      WAIT=мс  SCROLL=прокруток  SHOT=путь.png (кадр с текстом). Перед «/» в Git Bash — MSYS_NO_PATHCONV=1.
 */
test.skip(!process.env.CONTRAST, 'замер контраста — только по CONTRAST=1');
const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : ['/', '/catalog', '/about', '/order', '/privacy', '/kakaya-to-opechatka', 'PRODUCT'];

let product;
test.beforeAll(async ({ request }) => {
  const api = await adminApi(request);
  const [category] = await api.list('categories', '&sort=sort');
  product = await api.create('products', { title: 'Тестовый ангел', description: 'Расписной ангел из липы.', price: 1200, stock: 'to_order', category: category.id, lead_time: '7–10 дней' });
});
test.afterAll(async ({ request }) => (await adminApi(request)).remove('products', product.id));

for (const theme of (process.env.THEMES ?? 'malachite').split(',')) {
  for (const path of PAGES) {
    test(`контраст ${theme} ${path}`, async ({ page, browser }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const url = path === 'PRODUCT' ? `/izdelie/${product.id}` : path;
      await page.goto(`${url}${url.includes('?') ? '&' : '?'}theme=${theme}`);
      if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS });
      await page.waitForTimeout(Number(process.env.WAIT ?? 4000));
      for (let i = 0; i < Number(process.env.SCROLL ?? 0); i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(3000); }
      const texts = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const el = n.parentElement;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          let op = 1;
          for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
          if (op < 0.15) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const r = range.getBoundingClientRect();
          if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
          const m = cs.color.match(/[\d.]+/g).map(Number);
          if ((m[3] ?? 1) === 0) continue;
          out.push({
            text: n.textContent.trim().slice(0, 40),
            cls: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`,
            color: [m[0], m[1], m[2], (m[3] ?? 1) * op],
            size: parseFloat(cs.fontSize),
            weight: Number(cs.fontWeight),
            rect: [r.left, r.top, r.width, r.height],
          });
        }
        return out;
      });
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
      await page.addStyleTag({ content: '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}' });
      await page.waitForTimeout(300);
      const shot = (await page.screenshot()).toString('base64');
      const blank = await browser.newPage();
      const bad = await blank.evaluate(
        async ({ shot, texts, dpr }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${shot}`;
          await img.decode();
          const c = new OffscreenCanvas(img.width, img.height);
          const x = c.getContext('2d');
          x.drawImage(img, 0, 0);
          const lum = ([r, g, b]) => {
            const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((p, q) => q - p); return (h + 0.05) / (l + 0.05); };
          const res = [];
          for (const t of texts) {
            const [l, tp, w, h] = t.rect.map((v) => Math.round(v * dpr));
            const sx = Math.max(0, l), sy = Math.max(0, tp);
            const sw = Math.min(img.width - sx, w), sh = Math.min(img.height - sy, h);
            if (sw <= 0 || sh <= 0) continue;
            const d = x.getImageData(sx, sy, sw, sh).data;
            const rs = [];
            for (let i = 0; i < d.length; i += 16) {
              const bg = [d[i], d[i + 1], d[i + 2]];
              const a = t.color[3];
              const fg = t.color.slice(0, 3).map((v, k) => v * a + bg[k] * (1 - a));
              rs.push(ratio(fg, bg));
            }
            rs.sort((p, q) => p - q);
            const worst = rs[Math.floor(rs.length * 0.1)];
            const median = rs[Math.floor(rs.length * 0.5)];
            const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
            const need = large ? 3 : 4.5;
            if (worst < need) res.push(`${worst.toFixed(2)} (медиана ${median.toFixed(2)}, нужно ${need}) ${t.size}px ${t.cls} «${t.text}»`);
          }
          return res;
        },
        { shot, texts, dpr: await page.evaluate(() => devicePixelRatio) },
      );
      await blank.close();
      console.log(`\n== ${theme} ${path}: проверено ${texts.length}, ниже нормы ${bad.length}\n${bad.join('\n')}`);
    });
  }
}
