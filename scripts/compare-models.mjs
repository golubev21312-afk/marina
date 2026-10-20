/**
 * Сравнение 3D-моделей рендером: перед заменой модели на сжатую версию.
 * Рендерит каждую модель (three.js + RoomEnvironment в Chrome, программная
 * графика) с 4 сторон, лицо крупно ×3,5 и середину ×2; печатает долю
 * пикселей, отличающихся от ПЕРВОЙ модели больше чем на 8/255. Картинки — в outDir.
 * Лицо матрёшек смотрит на камеру под 90°.
 *
 *   node scripts/compare-models.mjs . <outDir> public/matryoshka.glb <новая>.glb [...]
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const [,, craft, out, ...models] = process.argv;
const files = { '/three/': path.join(craft, 'node_modules/three/') };
const page_ = `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(800, 800); document.body.appendChild(r.domElement);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x808080);
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
const l = new THREE.DirectionalLight(0xffffff, 2); l.position.set(2, 3, 4); scene.add(l);
const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
window.shots = async (url) => {
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const g = (await loader.loadAsync(url)).scene; scene.add(g);
  const box = new THREE.Box3().setFromObject(g); const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3());
  const res = [];
  for (const [deg, zoom, dy] of [[0,1,0],[90,1,0],[180,1,0],[270,1,0],[90,3.5,0.28],[90,2,-0.05]]) {
    const a = THREE.MathUtils.degToRad(deg); const d = s.y * 2.2 / zoom;
    const ty = c.y + s.y * dy;
    cam.position.set(c.x + Math.sin(a) * d, ty, c.z + Math.cos(a) * d); cam.lookAt(c.x, ty, c.z);
    r.render(scene, cam); res.push(r.domElement.toDataURL('image/png'));
  }
  scene.remove(g); return res;
};
window.ready = true;
</script>`;
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { s.setHeader('content-type', 'text/html'); return s.end(page_); }
  let f = u.startsWith('/three/') ? path.join(files['/three/'], u.slice(7)) : u.startsWith('/m/') ? models[+u.slice(3)] : null;
  if (!f || !fs.existsSync(f)) { s.statusCode = 404; return s.end(); }
  s.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); fs.createReadStream(f).pipe(s);
}).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 820, height: 820 } }); p.setDefaultTimeout(600000);
p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForFunction(() => window.ready);
fs.mkdirSync(out, { recursive: true });
const all = [];
for (let i = 0; i < models.length; i++) {
  const shots = await p.evaluate((u) => window.shots(u), `/m/${i}`);
  all.push(shots);
  shots.forEach((d, k) => fs.writeFileSync(path.join(out, `${path.basename(models[i], '.glb')}_${k}.png`), Buffer.from(d.split(',')[1], 'base64')));
}
// отличия от первого: доля пикселей, где разница > 8 из 255 (в любом канале)
for (let i = 1; i < models.length; i++) {
  const diffs = await p.evaluate(async ([A, B]) => {
    const px = async (d) => { const im = new Image(); im.src = d; await im.decode(); const c = new OffscreenCanvas(im.width, im.height); const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
    const out = [];
    for (let k = 0; k < A.length; k++) { const a = await px(A[k]), b = await px(B[k]); let n = 0; for (let j = 0; j < a.length; j += 4) if (Math.max(Math.abs(a[j]-b[j]), Math.abs(a[j+1]-b[j+1]), Math.abs(a[j+2]-b[j+2])) > 8) n++; out.push((100 * n / (a.length / 4)).toFixed(2) + '%'); }
    return out;
  }, [all[0], all[i]]);
  console.log(path.basename(models[i]), '0/90/180/270/лицо/середина:', diffs.join(' '));
}
await b.close(); srv.close();
