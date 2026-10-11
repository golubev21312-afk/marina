import { useSyncExternalStore } from 'react';

/** Темы сайта. Порядок — порядок переключения по кругу. */
export const THEMES = [
  { id: 'malachite', title: 'Малахит' },
  { id: 'kraft', title: 'Белая' },
];

/** Тема для нового посетителя. Тот же выбор — в скрипте index.html. */
export const DEFAULT_THEME = 'malachite';

// Тот же ключ читает скрипт в index.html — он ставит тему до первой отрисовки
const STORAGE_KEY = 'craft-theme';
const EVENT = 'craft:theme';

export function currentTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function apply(id) {
  const root = document.documentElement;
  root.dataset.theme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* приватный режим — тема просто не запомнится */
  }
  // Цвет панели браузера на телефоне — под тему
  const color = getComputedStyle(root).getPropertyValue('--theme-color').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Меняет тему. Новая тема расходится кругом от точки нажатия
 * (View Transitions API); где его нет или просят меньше движения — сразу.
 */
export function switchTheme(id, origin) {
  if (id === currentTheme()) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) {
    apply(id);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  // Радиус до самого дальнего угла — круг накрывает весь экран
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(() => apply(id));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 850,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

/** Текущая тема для компонентов; перерисовывает их при смене. */
export function useTheme() {
  return useSyncExternalStore(subscribe, currentTheme, () => DEFAULT_THEME);
}
