import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { emitMotion, reducedMotion } from '../lib/motion';

/**
 * Сцены сценария. `progress` — положение на шкале сборки матрёшки,
 * `travel` — сколько секунд едем к этой точке, `hold` — сколько стоим потом.
 */
export const SCENES = [
  { id: 'intro', progress: 0, travel: 0.1, hold: 14500 },
  // Экран шагов переехал на страницу заказа (pages/OrderPage.jsx).
  // По пути к карусели матрёшка успевает собраться и раскрыться
  { id: 'showcase', progress: 1, travel: 5, hold: 0 },
];

const STORAGE_KEY = 'craft-scene';
/** Зритель хоть раз досмотрел до карусели — помним между заходами. */
const SEEN_KEY = 'craft-seen';
const LAST = SCENES.length - 1;

/**
 * С какой сцены начать. Перезагрузка вкладки — там, где был.
 * Новый заход того, кто уже видел сценарий, — сразу карусель.
 */
function readSavedScene() {
  try {
    // ?reset в адресе — забыть всё и показать сценарий с начала (для проверки)
    if (new URLSearchParams(window.location.search).has('reset')) {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SEEN_KEY);
      return 0;
    }
    const saved = Number.parseInt(sessionStorage.getItem(STORAGE_KEY), 10);
    if (saved >= 0 && saved < SCENES.length) return saved;
    return localStorage.getItem(SEEN_KEY) ? LAST : 0;
  } catch {
    return 0; // приватный режим — просто начинаем сначала
  }
}

function rememberScene(index) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(index));
    if (index === LAST) localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* не критично */
  }
}

/**
 * Ведёт сценарий: переключает сцены сама, зовёт onProgress каждый кадр.
 * Пока модель не загрузилась (`enabled: false`), ничего не происходит.
 */
export function useStoryTimeline({ enabled, onProgress, startScene, countdownRef }) {
  const [scene, setScene] = useState(-1);

  // Номер сцены держим и в ref: переходы запускаются из таймеров,
  // где читать состояние React поздно
  const sceneRef = useRef(-1);
  const state = useRef({ progress: 0 }).current;
  const holdTimer = useRef(null);
  const tween = useRef(null);
  const countdownTween = useRef(null);
  const started = useRef(false);
  const renderRef = useRef(onProgress);
  const goToRef = useRef(null);

  useEffect(() => {
    renderRef.current = onProgress;
  }, [onProgress]);

  // Полоску отсчёта двигаем напрямую, без React: иначе вся сцена
  // перерисовывалась бы 60 раз в секунду
  const resetCountdown = useCallback(() => {
    countdownTween.current?.kill();
    if (countdownRef?.current) gsap.set(countdownRef.current, { scaleX: 0 });
  }, [countdownRef]);

  const stopAuto = useCallback(() => {
    clearTimeout(holdTimer.current);
    resetCountdown();
  }, [resetCountdown]);

  const goTo = useCallback((index, instant = false) => {
    if (index < 0 || index >= SCENES.length) return;

    const target = SCENES[index];
    // Назад отматываем быстрее — зритель это уже видел
    const back = sceneRef.current > index;
    // Меньше движения: без полёта деталей — карусель сразу. Первый экран — как
    // обычно, без матрёшки: собранная по центру, она стояла прямо под текстом
    const calm = reducedMotion();
    const travel = instant || calm ? 0 : target.travel * (back ? 0.6 : 1);

    tween.current?.kill();
    resetCountdown();
    clearTimeout(holdTimer.current);

    if (!instant) emitMotion();
    sceneRef.current = index;
    setScene(index);
    rememberScene(index);

    tween.current = gsap.to(state, {
      progress: target.progress,
      duration: travel,
      ease: 'sine.inOut',
      onUpdate: () => renderRef.current?.(state.progress),
      onComplete: () => renderRef.current?.(state.progress),
    });

    if (target.hold <= 0) return;

    // Полоска показывает, сколько осталось до следующей сцены
    const total = travel + target.hold / 1000;
    if (countdownRef?.current) {
      countdownTween.current = gsap.fromTo(
        countdownRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: total, ease: 'none' },
      );
    }

    holdTimer.current = setTimeout(() => goToRef.current(index + 1), total * 1000);
  }, [state, resetCountdown, countdownRef]);

  // Таймер зовёт переход через ref — так функция не ссылается на себя же
  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  /** Листает вперёд или назад и выключает автопереход. */
  const step = useCallback((delta) => {
    stopAuto();
    goTo(sceneRef.current + delta);
  }, [goTo, stopAuto]);

  // Сценарий стартует, как только матрёшка готова — с той сцены, где ушли
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    goTo(startScene ?? readSavedScene(), true);
  }, [enabled, goTo, startScene]);

  // Ушли со вкладки — отсчёт останавливаем, иначе вернёмся сразу к финалу
  useEffect(() => {
    const onVisibility = () => document.hidden && stopAuto();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stopAuto]);

  useEffect(() => () => {
    clearTimeout(holdTimer.current);
    tween.current?.kill();
    countdownTween.current?.kill();
  }, []);

  return { scene, goTo, step, stopAuto };
}
