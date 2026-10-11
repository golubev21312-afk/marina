import { useCallback, useEffect, useRef, useState } from 'react';
import { MOTION_EVENT } from '../lib/motion';
import { useTheme } from '../theme/theme';
import LizardBody from './LizardBody';
import './Lizards.css';

/** Не чаще одной ящерки за это время — иначе превращается в нашествие. */
const COOLDOWN_MS = 4000;
/** Откликается почти на каждую анимацию. */
const CHANCE = 0.85;
/** И сама заглядывает, даже когда на экране тихо: раз в 20–30 секунд. */
const IDLE_MIN_MS = 20000;
const IDLE_MAX_MS = 30000;
/** Каждая четвёртая — в короне, как у Хозяйки Медной горы. */
const ROYAL_CHANCE = 0.25;
/** Скорость бега, пикселей в секунду. */
const SPEED = 620;

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * Путь через весь экран: из-за одного края к другому, кривой Безье —
 * ящерка никогда не бежит по линейке.
 */
function makeRun() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pad = 140;
  const side = Math.floor(Math.random() * 4);

  let start;
  let end;
  if (side === 0) {
    start = [-pad, rand(0.15, 0.85) * h];
    end = [w + pad, rand(0.15, 0.85) * h];
  } else if (side === 1) {
    start = [w + pad, rand(0.15, 0.85) * h];
    end = [-pad, rand(0.15, 0.85) * h];
  } else if (side === 2) {
    start = [rand(0.1, 0.9) * w, h + pad];
    end = [rand(0.1, 0.9) * w, -pad];
  } else {
    start = [rand(0.1, 0.9) * w, -pad];
    end = [rand(0.1, 0.9) * w, h + pad];
  }

  // Контрольные точки — с разбросом поперёк пути: получается петля или волна
  const lerp = (t) => [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
  const wobble = Math.min(w, h) * 0.35;
  const c1 = lerp(0.33).map((v) => v + rand(-wobble, wobble));
  const c2 = lerp(0.66).map((v) => v + rand(-wobble, wobble));

  const length = Math.hypot(end[0] - start[0], end[1] - start[1]) * 1.25;
  const moving = (length / SPEED) * 1000;
  // Две остановки: ящерка замирает посреди шага и крутит головой
  const pauses = [rand(550, 950), rand(400, 800)];

  return {
    path: `M ${start} C ${c1} ${c2} ${end}`.replace(/,/g, ' '),
    moving,
    pauses,
    duration: moving + pauses[0] + pauses[1],
    scale: rand(0.8, 1.1),
    royal: Math.random() < ROYAL_CHANCE,
  };
}

/** Одна ящерка: бежит рывками по своему пути и исчезает. */
function Lizard({ run, onDone }) {
  const ref = useRef(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Рывок — пауза — рывок — пауза — рывок. Путь делим на три перебежки,
    // время каждой — по длине, паузы — своей длины
    const legs = [0.36, 0.34, 0.3];
    const [p1, p2] = run.pauses;
    const t1 = run.moving * legs[0];
    const t2 = t1 + p1;
    const t3 = t2 + run.moving * legs[1];
    const t4 = t3 + p2;
    const share = (ms) => ms / run.duration;
    const dash = 'cubic-bezier(0.35, 0, 0.25, 1)';

    const animation = el.animate(
      [
        { offsetDistance: '0%', offset: 0, easing: dash },
        { offsetDistance: '36%', offset: share(t1), easing: 'linear' },
        { offsetDistance: '36%', offset: share(t2), easing: dash },
        { offsetDistance: '70%', offset: share(t3), easing: 'linear' },
        { offsetDistance: '70%', offset: share(t4), easing: dash },
        { offsetDistance: '100%', offset: 1 },
      ],
      { duration: run.duration, fill: 'forwards' },
    );

    // На паузах тело замирает посреди шага, а голова оглядывается
    const timers = [
      setTimeout(() => setStill(true), t1),
      setTimeout(() => setStill(false), t2),
      setTimeout(() => setStill(true), t3),
      setTimeout(() => setStill(false), t4),
    ];
    animation.onfinish = onDone;

    return () => {
      timers.forEach(clearTimeout);
      animation.cancel();
    };
  }, [run, onDone]);

  return (
    <div
      ref={ref}
      className={`lizard ${still ? 'is-still' : ''}`}
      style={{ offsetPath: `path('${run.path}')`, '--lizard-scale': run.scale }}
      aria-hidden="true"
    >
      <LizardBody royal={run.royal} />
    </div>
  );
}

/**
 * Ящерки темы «Малахит»: изредка перебегают экран, когда на нём что-то
 * происходит — смена страницы, сцены, карточки. Во всех остальных
 * темах и при «меньше движения» их нет совсем.
 */
export default function Lizards() {
  const theme = useTheme();
  const [runs, setRuns] = useState([]);
  const lastRef = useRef(0);

  const spawn = useCallback((force = false) => {
    const now = Date.now();
    if (!force && (now - lastRef.current < COOLDOWN_MS || Math.random() > CHANCE)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    lastRef.current = now;
    setRuns((list) => [...list, { id: now, ...makeRun() }]);
  }, []);

  useEffect(() => {
    if (theme !== 'malachite') return undefined;
    const onMotion = () => spawn();
    window.addEventListener(MOTION_EVENT, onMotion);
    // Тему только что включили — первая ящерка встречает гостя
    const hello = setTimeout(() => spawn(true), 1100);

    // Тишина — ящерка всё равно иногда пробегает
    let idle;
    const scheduleIdle = () => {
      idle = setTimeout(() => {
        spawn(true);
        scheduleIdle();
      }, rand(IDLE_MIN_MS, IDLE_MAX_MS));
    };
    scheduleIdle();

    return () => {
      window.removeEventListener(MOTION_EVENT, onMotion);
      clearTimeout(hello);
      clearTimeout(idle);
    };
  }, [theme, spawn]);

  const remove = useCallback((id) => setRuns((list) => list.filter((run) => run.id !== id)), []);

  if (theme !== 'malachite') return null;

  return runs.map((run) => <LizardSlot key={run.id} run={run} onRemove={remove} />);
}

/** Держит стабильный колбэк для каждой ящерки — иначе анимация перезапускалась бы. */
function LizardSlot({ run, onRemove }) {
  const done = useCallback(() => onRemove(run.id), [onRemove, run.id]);
  return <Lizard run={run} onDone={done} />;
}
