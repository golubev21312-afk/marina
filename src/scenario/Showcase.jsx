import { useState } from 'react';
import FlipCard from './FlipCard';
import SiteMenu from './SiteMenu';
import { useShowcaseItems } from '../lib/showcase';
import { emitMotion } from '../lib/motion';
import './Showcase.css';

/** Финальная сцена: карусель изделий с историями на обороте. */
export default function Showcase({ shown, photos, theme }) {
  const ITEMS = useShowcaseItems();
  const [picked, setActive] = useState(0);
  const [flipped, setFlipped] = useState(null);
  // Карточек могло стать меньше (Марина убрала из админки) — не выходим за край
  const active = ITEMS.length ? picked % ITEMS.length : 0;

  const move = (delta) => {
    if (!ITEMS.length) return;
    emitMotion();
    setFlipped(null);
    setActive((current) => (current + delta + ITEMS.length) % ITEMS.length);
  };

  const pick = (index) => {
    emitMotion();
    if (index !== active) {
      setFlipped(null);
      setActive(index);
      return;
    }
    // Повторный клик по центральной карточке переворачивает её
    setFlipped((current) => (current === index ? null : index));
  };

  const reading = flipped !== null;
  const half = ITEMS.length / 2;

  return (
    <div className={`showcase ${shown ? 'is-shown' : ''} ${reading ? 'is-reading' : ''}`}>
      <SiteMenu />
      <h2>Каждая фигурка — ручная работа</h2>
      <p className="showcase__hint">
        <span className="showcase__hint-lead">У каждой фигурки — своя история</span>
        <span className="showcase__hint-call">
          <span className="showcase__tap" aria-hidden="true" />
          коснитесь карточки, и она её расскажет
        </span>
      </p>

      <div className="carousel">
        <div className="carousel__stage">
          {ITEMS.map((item, i) => {
            // Ближайший путь до активной карточки по кругу — лента замкнута
            const raw = i - active;
            const offset = raw > half ? raw - ITEMS.length : raw < -half ? raw + ITEMS.length : raw;

            return (
              <FlipCard
                key={item.id}
                item={item}
                offset={offset}
                layer={ITEMS.length - Math.abs(offset)}
                flipped={flipped === i}
                photo={photos}
                onSelect={() => pick(i)}
              />
            );
          })}
        </div>

        <div className="carousel__nav">
          <button type="button" onClick={() => move(-1)} aria-label="Предыдущее изделие">
            <svg viewBox="0 0 24 24">
              <path d="M14.5 5.5L8 12l6.5 6.5" />
            </svg>
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Следующее изделие">
            <svg viewBox="0 0 24 24">
              <path d="M9.5 5.5L16 12l-6.5 6.5" />
            </svg>
          </button>
        </div>
      </div>

      <p className="showcase__note">Актуальные цены — в каталоге</p>

      {theme === 'malachite' && (
        <img className="decor decor--malachite decor-show" src="/img/lizard-plaque.webp" alt="" aria-hidden="true" />
      )}
    </div>
  );
}
