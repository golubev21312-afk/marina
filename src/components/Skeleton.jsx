import { useEffect, useState } from 'react';
import './Skeleton.css';

/** Загрузка короче — заглушек не показываем: на быстром интернете было бы мелькание. */
const DELAY_MS = 300;

/** true, если загрузка идёт дольше DELAY_MS. */
function useSlow() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return slow;
}

/** Для диктора — обычная фраза; заглушки для него скрыты. */
const Status = ({ children }) => (
  <p className="skeleton__status" role="status">
    {children}
  </p>
);

/** Сетка бледных карточек вместо каталога, пока изделия грузятся. */
export function CardSkeletons({ count = 8 }) {
  const slow = useSlow();
  return (
    <>
      <Status>Загружаем изделия…</Status>
      {slow && (
        <div className="catalog__grid skeleton-grid" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-card__thumb" />
              <div className="skeleton skeleton-card__line" />
              <div className="skeleton skeleton-card__line is-short" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Заглушка страницы изделия: фото слева, название и цена справа. */
export function ProductSkeleton() {
  const slow = useSlow();
  return (
    <>
      <Status>Загружаем изделие…</Status>
      {slow && (
        <div className="wrap product" aria-hidden="true">
          <div className="skeleton skeleton-product__photo" />
          <div>
            <div className="skeleton skeleton-product__title" />
            <div className="skeleton skeleton-card__line" />
            <div className="skeleton skeleton-card__line" />
            <div className="skeleton skeleton-card__line is-short" />
            <div className="skeleton skeleton-product__button" />
          </div>
        </div>
      )}
    </>
  );
}
