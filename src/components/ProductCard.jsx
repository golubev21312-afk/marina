import { TransitionLink } from '../transition/Transition';
import { formatPrice } from '../lib/format';
import { STOCK } from '../lib/products';
import FavoriteButton from './FavoriteButton';
import './ProductCard.css';

/**
 * Карточка изделия. Сердечко — рядом со ссылкой, а не внутри неё:
 * кнопка внутри ссылки — ошибка разметки, и нажатие открыло бы изделие.
 */
export default function ProductCard({ product, index = 0 }) {
  return (
    <div className="card-wrap" data-id={product.id} style={{ '--card-index': index }}>
      <TransitionLink
        to={`/izdelie/${product.id}`}
        className={`card ${product.stock === 'sold_out' ? 'is-sold' : ''}`}
      >
        <div className="card__thumb">
          {product.thumbs[0] && <img src={product.thumbs[0]} alt={product.title} loading="lazy" />}
          {product.price && <span className="card__price">{formatPrice(product.price)}</span>}
          <div className="card__badges">
            {product.isNew && <span className="card__new">Новинка</span>}
            {product.stock === 'sold_out' && <span className="card__sold">{STOCK.sold_out}</span>}
            {product.stock === 'to_order' && <span className="card__to-order">{STOCK.to_order}</span>}
          </div>
        </div>
        <div className="card__body">
          <h3>{product.title}</h3>
          <p>{product.description}</p>
          <span className="card__more">
            Подробнее
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </TransitionLink>
      <FavoriteButton product={product} className="fav--card" />
    </div>
  );
}
