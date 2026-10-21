import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Lightbox.css';

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;
/** Свайп короче — не листаем: это дрожь пальца, а не жест. */
const SWIPE_PX = 60;
const DOUBLE_TAP_MS = 300;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Фото на весь экран: листание (кнопки, ← →, свайп), приближение (двойное
 * нажатие, колёсико, щипок двумя пальцами), приближенное — двигается.
 * Закрывается ×, Esc или нажатием на фон. photos — ссылки на большие фото.
 */
export default function Lightbox({ photos, start = 0, title, onClose }) {
  const [index, setIndex] = useState(start);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef(null);
  const closeRef = useRef(null);
  const gesture = useRef({ pointers: new Map(), lastTap: 0 });
  const count = photos.length;

  const go = useCallback(
    (delta) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
      setView({ scale: 1, x: 0, y: 0 });
    },
    [count],
  );

  /** Сдвиг приближенного фото — не дальше его краёв. */
  const fit = useCallback((scale, x, y) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || scale <= 1) return { scale: 1, x: 0, y: 0 };
    const maxX = (rect.width * (scale - 1)) / 2;
    const maxY = (rect.height * (scale - 1)) / 2;
    return { scale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }, []);

  /** Приблизить к точке на экране (двойное нажатие, колёсико). */
  const zoomAt = useCallback(
    (scale, clientX, clientY, from) => {
      const rect = stageRef.current.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;
      // Точка под пальцем остаётся на месте
      const k = scale / from.scale;
      return fit(scale, px - (px - from.x) * k, py - (py - from.y) * k);
    },
    [fit],
  );

  // Клавиатура, запрет прокрутки страницы под окном, фокус — на «Закрыть» и обратно
  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [go, onClose]);

  // Соседние фото — заранее, чтобы листалось без ожидания
  useEffect(() => {
    [index + 1, index - 1].forEach((i) => {
      new Image().src = photos[(i + count) % count];
    });
  }, [index, photos, count]);

  // Колёсико — приближение; слушаем сами: React вешает wheel пассивным, и страница бы прокручивалась
  useEffect(() => {
    const stage = stageRef.current;
    const onWheel = (event) => {
      event.preventDefault();
      setView((v) => zoomAt(clamp(v.scale * Math.exp(-event.deltaY * 0.002), 1, MAX_ZOOM), event.clientX, event.clientY, v));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (event) => {
    const g = gesture.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...g.pointers.values()];
    g.start = { view, points, time: Date.now(), target: event.target };
    g.moved = false;
    setDragging(true);
  };

  const onPointerMove = (event) => {
    const g = gesture.current;
    if (!g.pointers.has(event.pointerId)) return;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...g.pointers.values()];
    const { view: from, points: was } = g.start;

    if (points.length >= 2 && was.length >= 2) {
      // Щипок: масштаб — по расстоянию между пальцами, центр — между ними
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const scale = clamp(from.scale * (dist(points[0], points[1]) / dist(was[0], was[1])), 1, MAX_ZOOM);
      const cx = (points[0].x + points[1].x) / 2;
      const cy = (points[0].y + points[1].y) / 2;
      g.moved = true;
      setView(zoomAt(scale, cx, cy, from));
      return;
    }

    const dx = event.clientX - was[0].x;
    const dy = event.clientY - was[0].y;
    if (Math.hypot(dx, dy) > 6) g.moved = true;
    // Приближено — двигаем фото; нет — фото едет за пальцем, отпустили — листаем
    setView(from.scale > 1 ? fit(from.scale, from.x + dx, from.y + dy) : { scale: 1, x: dx, y: 0 });
  };

  const onPointerUp = (event) => {
    const g = gesture.current;
    if (!g.pointers.has(event.pointerId)) return;
    const point = g.pointers.get(event.pointerId);
    g.pointers.delete(event.pointerId);
    if (g.pointers.size > 0) {
      // Один палец из двух убрали — дальше двигаем оставшимся
      g.start = { view, points: [...g.pointers.values()], time: Date.now() };
      return;
    }
    setDragging(false);
    const { view: from, points: was, target } = g.start;

    if (!g.moved) {
      // Двойное нажатие — приблизить к этой точке или вернуть как было
      const now = Date.now();
      if (now - g.lastTap < DOUBLE_TAP_MS) {
        g.lastTap = 0;
        setView(from.scale > 1 ? { scale: 1, x: 0, y: 0 } : zoomAt(TAP_ZOOM, point.x, point.y, from));
        return;
      }
      g.lastTap = now;
      // Одно нажатие мимо фото — закрыть
      if (target === stageRef.current && from.scale === 1) onClose();
      return;
    }

    if (from.scale === 1) {
      const dx = point.x - was[0].x;
      if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
      else setView({ scale: 1, x: 0, y: 0 });
    }
  };

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title} — фото на весь экран`}>
      <div
        ref={stageRef}
        className={`lightbox__stage ${view.scale > 1 ? 'is-zoomed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          key={photos[index]}
          src={photos[index]}
          alt={`${title} — фото ${index + 1}`}
          draggable={false}
          className={dragging ? 'is-dragging' : ''}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>

      <button ref={closeRef} type="button" className="lightbox__close" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      {count > 1 && (
        <>
          <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label="Предыдущее фото" onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className="lightbox__nav lightbox__nav--next" aria-label="Следующее фото" onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}
      <p className="lightbox__bar" aria-live="polite">
        {count > 1 && <span>{`${index + 1} из ${count}`}</span>}
        <span className="lightbox__hint">
          {view.scale > 1 ? 'Двойное нажатие — как было' : 'Двойное нажатие — приблизить'}
        </span>
      </p>
    </div>,
    document.body,
  );
}
