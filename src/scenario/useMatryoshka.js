import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { reportError } from '../lib/errors';
import { useTheme } from '../theme/theme';

/**
 * Своя матрёшка у каждой темы.
 *   faceAngle — модели вылеплены вполоборота, доворачиваем лицом к камере
 *   env — отражения окружения: без них металл и глянец выглядят тёмными
 */
const MODELS = {
  kraft: { url: '/matryoshka.glb', faceAngle: 290, env: 0 },
  malachite: { url: '/matryoshka-malachite.glb', faceAngle: 290, env: 0.55 },
};

/**
 * Сколько ждём первую модель. Дольше — считаем, что телефон не тянет
 * или сеть не даёт: сайт идёт дальше без 3D, сразу к карусели.
 */
const LOAD_TIMEOUT_MS = 25000;

/** Высота матрёшки в сцене — под неё подгоняется модель любого размера. */
const DOLL_HEIGHT = 3.4;

/** С этой ширины шаги встают над матрёшкой, как в StepsSlide.css. */
const NARROW = 900;

/**
 * На узком экране верх занят логотипом и шагами, поэтому матрёшка
 * меньше и ниже: доля высоты экрана и где её середина, сверху.
 */
const NARROW_DOLL_SHARE = 0.34;
const NARROW_DOLL_CENTER = 0.72;

/**
 * На широком экране — доля высоты и середина матрёшки. Прежняя жёсткая
 * камера на экранах высотой ~768 (ноутбук, планшет боком) упирала голову
 * матрёшки в меню и закрывала шаги.
 */
const WIDE_DOLL_SHARE = 0.6;
const WIDE_DOLL_CENTER = 0.56;

/** Освобождает видеопамять модели, которую сменили. */
function disposeTree(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => value?.isTexture && value.dispose());
      material.dispose();
    });
  });
}

/**
 * Собирает three.js-сцену с матрёшкой и отдаёт наружу функцию `render(progress)`.
 * Модель берётся по теме; при смене темы меняется на лету — старая стоит,
 * пока грузится новая, экран загрузки второй раз не показывается.
 *
 * failed — 3D не будет: нет WebGL, модель не загрузилась или грузится
 * дольше LOAD_TIMEOUT_MS. Страницы тогда показывают всё без матрёшки.
 *
 * progress — 0..1, насколько матрёшка собрана:
 *   0.00–0.45  детали слетаются, матрёшка собирается
 *   0.45–0.60  стоит целая
 *   0.60–1.00  раскрывается, детали снова разлетаются
 */
export function useMatryoshka(canvasRef) {
  const theme = useTheme();
  const modelKey = MODELS[theme] ? theme : 'kraft';

  const [ready, setReady] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [failed, setFailed] = useState(false);

  // Наружу отдаём стабильную ссылку: сцена живёт дольше, чем один рендер
  const api = useRef({ render: () => {} });
  // Сцена создаётся в одном эффекте, а модель меняется в другом
  const sceneRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handle = api.current;

    const parent = canvas.parentElement;

    // React в разработке монтирует компонент дважды. Загрузка модели живёт
    // дольше первого монтирования, и без этого флага детали прилетали
    // в уже уничтоженную сцену — на экране матрёшка оставалась собранной.
    let cancelled = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      35,
      parent.clientWidth / parent.clientHeight,
      0.1,
      100,
    );

    // Без 3D — сразу дальше. Состояние меняем после эффекта, не внутри него
    const giveUp = (reason, error) => {
      if (cancelled) return;
      if (error) reportError(error, reason);
      Promise.resolve().then(() => !cancelled && setFailed(true));
    };

    // Холст прозрачный: фон сцены даёт тема (--stage-bg) — в «Малахите»
    // матрёшка стоит прямо на камне. Нет WebGL (старый телефон, выключено
    // в браузере) — three.js бросает ошибку
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (error) {
      giveUp('нет WebGL', error);
      return () => {
        cancelled = true;
      };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = false;
    controls.minPolarAngle = Math.PI * 0.3;
    controls.maxPolarAngle = Math.PI * 0.54;
    // Развернуть можно чуть-чуть: спиной к зрителю матрёшка не встанет
    controls.minAzimuthAngle = -Math.PI * 0.19;
    controls.maxAzimuthAngle = Math.PI * 0.19;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xfff0d8, 1.15);
    key.position.set(3.2, 6.5, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 14;
    key.shadow.radius = 4;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.3);
    fill.position.set(-4, 3, -3);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const dollRoot = new THREE.Group();
    scene.add(dollRoot);

    // Карта окружения для металла — создаётся, только если понадобится
    let envMap = null;
    const environment = () => {
      if (!envMap) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
      }
      return envMap;
    };

    let parts = null;
    let wrapper = null;
    let lastProgress = 0;
    let currentKey = null;
    let loadToken = 0;

    // Кадр рисуем, только когда что-то сдвинулось: матрёшка, камера или размер.
    // Иначе видеокарта молотит 60 кадров в секунду впустую, а размытые
    // плашки поверх холста (меню, шаги) пересчитывают размытие каждый кадр
    let dirty = true;

    /**
     * Каждой детали — своё направление и вращение разлёта. Разлёт считается
     * от родного положения детали в файле: у разных моделей оно разное.
     */
    function buildParts(root) {
      const collected = [];
      root.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        const materials = Array.isArray(child.material) ? child.material : [child.material];

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const direction = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.abs(Math.cos(phi)) * 0.8 + 0.2,
          Math.sin(phi) * Math.sin(theta),
        ).multiplyScalar(0.75 + Math.random() * 1.05);

        collected.push({
          mesh: child,
          materials,
          basePosition: child.position.clone(),
          baseRotation: child.rotation.clone(),
          fading: null,
          // Своя очередь: детали подлетают не разом, а одна за другой
          lag: Math.random(),
          direction,
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 2.2,
          ),
        });
      });
      return collected;
    }

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    /** Загружает модель темы и подменяет ею текущую. */
    function load(name) {
      if (name === currentKey) return;
      currentKey = name;
      const token = ++loadToken;
      const model = MODELS[name];
      const first = !parts;

      loader.load(
        model.url,
        (gltf) => {
          // Пока грузилась, тему могли сменить ещё раз — эта уже не нужна
          if (cancelled || token !== loadToken) {
            disposeTree(gltf.scene);
            return;
          }
          const raw = gltf.scene;
          const box = new THREE.Box3().setFromObject(raw);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Ставим модель на пол и центрируем, затем масштабируем под нужную высоту
          raw.position.set(-center.x, -box.min.y, -center.z);
          const next = new THREE.Group();
          next.add(raw);
          next.scale.setScalar(DOLL_HEIGHT / Math.max(size.y, 0.0001));

          if (wrapper) {
            dollRoot.remove(wrapper);
            disposeTree(wrapper);
          }
          wrapper = next;
          dollRoot.rotation.y = THREE.MathUtils.degToRad(model.faceAngle);
          dollRoot.add(wrapper);
          scene.environment = model.env ? environment() : null;
          scene.environmentIntensity = model.env || 1;
          parts = buildParts(wrapper);

          // Новая модель встаёт ровно туда, где была старая: собранной,
          // разлетевшейся или посреди сборки
          api.current.render(lastProgress);
          setReady(true);
        },
        (event) => {
          if (cancelled || !first) return;
          if (event.lengthComputable) {
            setProgressPct(Math.round((event.loaded / event.total) * 100));
          }
        },
        (error) => {
          if (cancelled) return;
          console.error('Матрёшка не загрузилась', error);
          if (first) giveUp('матрёшка не загрузилась', error);
        },
      );
    }

    const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
    const ramp = (value, from, to) => clamp01((value - from) / (to - from));
    // Плавный старт и мягкое торможение у места
    const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);

    /**
     * Насколько деталь сейчас «разлетелась», 0..1. Сборка идёт на отрезке
     * шкалы 0–0.45, но у каждой детали своё окно внутри него (по lag):
     * одни прилетают раньше, другие позже. Раскрытие — так же на 0.6–1.
     */
    const SPAN = 0.26; // сколько шкалы летит одна деталь
    function spreadOf(part, progress) {
      const inStart = part.lag * (0.45 - SPAN);
      const assembling = 1 - smooth(ramp(progress, inStart, inStart + SPAN));
      const outStart = 0.6 + part.lag * (0.4 - SPAN);
      const reopening = smooth(ramp(progress, outStart, outStart + SPAN));
      return Math.max(assembling, reopening);
    }

    api.current.render = (progress) => {
      lastProgress = progress;
      if (!parts) return;
      dirty = true;

      parts.forEach((part) => {
        const spread = spreadOf(part, progress);
        // Деталь проявляется на подлёте и тает на отлёте — не висит в воздухе
        const visibility = clamp01(1 - spread / 0.55);
        // Прозрачность включаем, только пока деталь тает: у непрозрачной
        // нет ошибок сортировки на стыках деталей
        const fading = visibility < 0.999;

        part.mesh.position.copy(part.direction).multiplyScalar(spread).add(part.basePosition);
        part.mesh.rotation.set(
          part.baseRotation.x + part.spin.x * spread,
          part.baseRotation.y + part.spin.y * spread,
          part.baseRotation.z + part.spin.z * spread,
        );
        part.mesh.visible = visibility > 0.001;
        part.materials.forEach((material) => {
          material.opacity = visibility;
          if (part.fading !== fading) {
            material.transparent = fading;
            material.needsUpdate = true;
          }
        });
        part.fading = fading;
      });
    };

    /** Камера зависит от ширины: при повороте телефона матрёшка переезжает. */
    function placeCamera(narrow) {
      // Отодвигаем камеру, пока матрёшка не займёт нужную долю высоты,
      // и поднимаем взгляд — тогда матрёшка опускается ниже середины экрана
      const share = narrow ? NARROW_DOLL_SHARE : WIDE_DOLL_SHARE;
      const center = narrow ? NARROW_DOLL_CENTER : WIDE_DOLL_CENTER;
      const viewPerUnit = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const distance = DOLL_HEIGHT / (share * viewPerUnit);
      const lookY = DOLL_HEIGHT / 2 + (center - 0.5) * distance * viewPerUnit;
      // Сверху чуть больше на широком экране — видно донышко и тень, как раньше
      camera.position.set(0, lookY + distance * (narrow ? 0.1 : 0.13), distance);
      controls.target.set(0, lookY, 0);
      controls.update();
    }

    function resize() {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      placeCamera(width <= NARROW);
      dirty = true;
    }
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    function loop() {
      frame = requestAnimationFrame(loop);
      // update() говорит, повернул ли зритель камеру (с учётом инерции)
      const moved = controls.update();
      if (!moved && !dirty) return;
      dirty = false;
      renderer.render(scene, camera);
    }
    loop();

    sceneRef.current = { load };

    // Модель так и не пришла — не держим человека на экране загрузки
    const timeout = setTimeout(() => !parts && giveUp(), LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sceneRef.current = null;
      setReady(false);
      handle.render = () => {};
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      controls.dispose();
      envMap?.dispose();
      disposeTree(scene);
      renderer.dispose();
    };
  }, [canvasRef]);

  // Модель по теме: при первом запуске и при каждой смене темы
  useEffect(() => {
    sceneRef.current?.load(modelKey);
  }, [modelKey]);

  return { api, ready, progressPct, failed };
}
