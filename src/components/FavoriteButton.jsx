import { toggleFavorite, useFavorites } from '../lib/favorites';
import './FavoriteButton.css';

/** Сердечко «Отложить»: на карточке каталога и на странице изделия. */
export default function FavoriteButton({ product, className = '' }) {
  const saved = useFavorites().includes(product.id);
  return (
    <button
      type="button"
      className={`fav ${saved ? 'is-saved' : ''} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? `Убрать «${product.title}» из отложенных` : `Отложить «${product.title}»`}
      title={saved ? 'Убрать из отложенных' : 'Отложить'}
      onClick={() => toggleFavorite(product.id)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z" />
      </svg>
    </button>
  );
}
