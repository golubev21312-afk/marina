import { useState } from 'react';
import './Gallery.css';

/**
 * Фотографии изделия веером: активная по центру, соседние отклонены в 3D.
 * Референс № 1 / 2. С одним фото вырождается в обычную картинку.
 */
export default function Gallery({ photos, title }) {
  const [active, setActive] = useState(0);

  if (photos.length === 1) {
    return (
      <div className="gallery gallery--single">
        <img src={photos[0]} alt={title} />
      </div>
    );
  }

  const step = (delta) => setActive((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="gallery">
      <div className="gallery__stage">
        {photos.map((photo, i) => {
          // Кратчайшее расстояние до активного кадра по кругу
          const raw = i - active;
          const half = photos.length / 2;
          const offset = raw > half ? raw - photos.length : raw < -half ? raw + photos.length : raw;

          return (
            <button
              key={photo}
              type="button"
              className="gallery__slide"
              style={{ '--offset': offset, zIndex: photos.length - Math.abs(offset) }}
              onClick={() => setActive(i)}
              aria-label={`${title} — фото ${i + 1}`}
              aria-current={i === active}
            >
              <img src={photo} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            </button>
          );
        })}
      </div>

      <div className="gallery__controls">
        <button type="button" onClick={() => step(-1)} aria-label="Предыдущее фото">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="gallery__dots">
          {photos.map((photo, i) => (
            <button
              key={photo}
              type="button"
              className={i === active ? 'is-active' : ''}
              onClick={() => setActive(i)}
              aria-label={`Фото ${i + 1}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => step(1)} aria-label="Следующее фото">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
