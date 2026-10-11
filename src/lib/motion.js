/**
 * Сигнал «на экране началась анимация»: смена страницы, сцены, карточки.
 * На него откликаются ящерки темы «Малахит» (components/Lizards.jsx).
 */
export const MOTION_EVENT = 'craft:motion';

export function emitMotion() {
  window.dispatchEvent(new Event(MOTION_EVENT));
}
