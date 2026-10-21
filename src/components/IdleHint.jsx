import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../theme/theme';
import { TransitionLink } from '../transition/Transition';
import './IdleHint.css';

/** Столько без движения — и матрёшка выглядывает с подсказкой. */
export const IDLE_MS = 2 * 60 * 1000;
/** Показали за этот визит — больше не показываем, чтобы не надоедать. */
const SHOWN_KEY = 'craft-idle-hint';
/** Что считаем «человек что-то делает». */
const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];

/** Матрёшка своей темы — смотрит влево, на облачко. */
const DOLL = {
  malachite: '/img/decor-romashka-faces-left.webp',
  kraft: '/img/decor-hozyayka-faces-left.webp',
};

function wasShown() {
  try {
    return Boolean(sessionStorage.getItem(SHOWN_KEY));
  } catch {
    return false;
  }
}

function markShown() {
  try {
    sessionStorage.setItem(SHOWN_KEY, '1');
  } catch {
    /* приватный режим — покажем ещё раз, не страшно */
  }
}

/** В каталоге зовём к индивидуальному заказу, на остальных страницах — в каталог. */
function hintFor(pathname) {
  if (pathname === '/catalog' || pathname.startsWith('/catalog/')) {
    return { text: 'Не нашли нужное? Мастер распишет изделие под ваш повод.', to: '/order', label: 'Индивидуальный заказ' };
  }
  return { text: 'Загляните в каталог — там все работы мастерской.', to: '/catalog', label: 'В каталог' };
}

/**
 * Человек две минуты ничего не делает — из правого нижнего угла выглядывает
 * матрёшка и подсказывает, куда заглянуть. Раз за визит; не в админке и не
 * на странице политики. Закрывается крестиком, Esc или переходом.
 */
export default function IdleHint() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const [shownOn, setShownOn] = useState(null); // страница, где выглянула
  const off = pathname.startsWith('/admin') || pathname === '/privacy';
  const shown = shownOn === pathname;

  // Ждём две минуты тишины; любое действие начинает отсчёт заново
  useEffect(() => {
    if (off || shownOn || wasShown()) return undefined;
    let timer;
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(show, IDLE_MS);
    };
    // Вкладка в фоне — подождём, пока человек вернётся
    const show = () => {
      if (document.hidden) return restart();
      markShown();
      setShownOn(pathname);
    };
    restart();
    ACTIVITY.forEach((type) => window.addEventListener(type, restart, { passive: true, capture: true }));
    return () => {
      clearTimeout(timer);
      ACTIVITY.forEach((type) => window.removeEventListener(type, restart, { capture: true }));
    };
  }, [off, shownOn, pathname]);

  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (event) => event.key === 'Escape' && setShownOn('closed');
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown]);

  // Перешли на другую страницу (в том числе по кнопке подсказки) — подсказка уходит
  if (!shown || off) return null;

  const hint = hintFor(pathname);
  return (
    <aside className="idle-hint" role="status" aria-label="Подсказка">
      <div className="idle-hint__bubble">
        <button type="button" className="idle-hint__close" aria-label="Закрыть подсказку" onClick={() => setShownOn('closed')}>
          ×
        </button>
        <p>{hint.text}</p>
        <TransitionLink className="idle-hint__go" to={hint.to}>
          {hint.label}
        </TransitionLink>
      </div>
      <img className="idle-hint__doll" src={DOLL[theme] ?? DOLL.malachite} alt="" aria-hidden="true" />
    </aside>
  );
}
