/**
 * Сигнал «на экране началась анимация»: смена страницы, сцены, карточки.
 * На него откликаются ящерки темы «Малахит» (components/Lizards.jsx).
 */
export const MOTION_EVENT = 'craft:motion';

export function emitMotion() {
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/**
 * Человек попросил в системе «Уменьшить движение»: матрёшка не слетается
 * по деталям, а сразу стоит собранной; сцены сменяются без полёта.
 */
export function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
