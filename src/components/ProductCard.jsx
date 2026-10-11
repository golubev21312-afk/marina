import { TransitionLink } from '../transition/Transition';
import { formatPrice } from '../lib/format';
import './ProductCard.css';

export default function ProductCard({ product, index = 0 }) {
  return (
    <TransitionLink
      to={`/izdelie/${product.id}`}
      className={`card ${product.available ? '' : 'is-sold'}`}
      style={{ '--card-index': index }}
    >
      <div className="card__thumb">
        {product.thumbs[0] && <img src={product.thumbs[0]} alt={product.title} loading="lazy" />}
        {product.price && <span className="card__price">{formatPrice(product.price)}</span>}
        {!product.available && <span className="card__sold">Нет в наличии</span>}
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
  );
}
