import { clearRecent, useRecent } from '../lib/recent';
import ProductCard from './ProductCard';
import './RecentlyViewed.css';

/** Столько последних показываем. */
const SHOWN = 4;

/**
 * «Вы смотрели» под каталогом — последние открытые изделия этого браузера
 * (lib/recent.js). Удалённые и ушедшие в корзину не показываем.
 */
export default function RecentlyViewed({ products }) {
  const ids = useRecent();
  const byId = new Map(products.map((item) => [item.id, item]));
  const items = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, SHOWN);
  if (!items.length) return null;

  return (
    <section className="recent" aria-labelledby="recent-title">
      <div className="recent__head">
        <h2 id="recent-title">Вы смотрели</h2>
        <button type="button" className="recent__clear" onClick={clearRecent}>
          Очистить
        </button>
      </div>
      <div className="recent__grid">
        {items.map((item, i) => (
          <ProductCard key={item.id} product={item} index={i} />
        ))}
      </div>
    </section>
  );
}
