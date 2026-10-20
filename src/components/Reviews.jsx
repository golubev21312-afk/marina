import { useState } from 'react';
import { TransitionLink } from '../transition/Transition';
import { useProducts } from '../lib/products';
import { useReviews } from '../lib/reviews';
import './Reviews.css';

/** Длиннее — сворачиваем, «Читать полностью» раскрывает. */
const LONG = 360;

function ReviewCard({ review, product }) {
  const long = review.text.length > LONG;
  const [open, setOpen] = useState(false);

  return (
    <figure className="review">
      {review.photo && <img className="review__photo" src={review.photo} alt={`Фото от покупателя — ${review.author}`} loading="lazy" />}
      <blockquote className={`review__text ${long && !open ? 'is-clamped' : ''}`}>
        {review.paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </blockquote>
      {long && (
        <button type="button" className="review__more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Читать полностью'}
        </button>
      )}
      <figcaption className="review__by">
        <b>{review.author}</b>
        {review.when && <span>{review.when}</span>}
        {product && (
          <TransitionLink className="review__product" to={`/izdelie/${product.id}`}>
            {product.small[0] && <img src={product.small[0]} alt="" />}
            {product.title}
          </TransitionLink>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Лента отзывов. productId — только об этом изделии (на его странице,
 * без ссылки на него же). Отзывов нет — блока нет совсем.
 */
export default function Reviews({ productId, title = 'Отзывы покупателей' }) {
  const { items } = useReviews();
  const { items: products } = useProducts();
  const shown = items.filter((review) => review.visible && (!productId || review.productId === productId));
  if (!shown.length) return null;

  return (
    <section className="wrap reviews" aria-labelledby={`reviews-${productId || 'all'}`}>
      <h2 id={`reviews-${productId || 'all'}`}>{title}</h2>
      <div className="reviews__list">
        {shown.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            product={productId ? null : products.find((item) => item.id === review.productId)}
          />
        ))}
      </div>
    </section>
  );
}
