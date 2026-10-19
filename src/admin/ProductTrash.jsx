import { useState } from 'react';
import { pb } from '../lib/pb';
import { refreshProducts, useAllProducts } from '../lib/products';
import { useListAction } from './listActions';

/** Столько дней товар лежит в корзине (стирает хук products_trash.pb.js). */
const KEEP_DAYS = 30;

/** Сколько дней осталось до того, как товар сотрётся насовсем. */
function daysLeft(deleted) {
  const at = new Date(deleted.replace(' ', 'T')).getTime();
  return Math.max(0, Math.ceil(KEEP_DAYS - (Date.now() - at) / (24 * 3600 * 1000)));
}

/**
 * Корзина под списком товаров: удалённое за последние 30 дней.
 * «Вернуть» — снова на сайте на прежнем месте; «Удалить насовсем» — сразу.
 * Пустая корзина не показывается.
 */
export default function ProductTrash({ onNotice }) {
  const { items } = useAllProducts();
  const trash = items.filter((item) => item.deleted).sort((a, b) => b.deleted.localeCompare(a.deleted));
  const [erasing, setErasing] = useState(null);
  const { busy, error, run } = useListAction(refreshProducts);

  if (!trash.length) return null;

  const restore = (product) =>
    run('вернуть', async () => {
      await pb.collection('products').update(product.id, { deleted: '' });
      await refreshProducts();
      onNotice({ text: `«${product.title}» снова на сайте.`, id: product.id });
    });

  const erase = (product) =>
    run('удалить', async () => {
      await pb.collection('products').delete(product.id);
      setErasing(null);
      await refreshProducts();
      onNotice({ text: `«${product.title}» удалён насовсем.` });
    });

  return (
    <details className="admin-trash">
      <summary>
        Корзина · {trash.length}
        <small>удалённое хранится {KEEP_DAYS} дней, потом стирается само</small>
      </summary>
      {error && <p className="admin-error">{error}</p>}
      <ul className="admin-list">
        {trash.map((product) => {
          const left = daysLeft(product.deleted);
          return (
            <li key={product.id} className="admin-item admin-item--trash">
              {product.small[0] ? <img src={product.small[0]} alt="" /> : <span className="admin-item__nophoto" />}
              <div className="admin-item__info">
                <strong>{product.title}</strong>
                <span>{left > 0 ? `сотрётся через ${left} дн.` : 'сотрётся в ближайший час'}</span>
              </div>
              <div className="admin-item__actions">
                {erasing === product.id ? (
                  <>
                    <span className="admin-item__ask">Удалить насовсем? Вернуть будет нельзя.</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={busy}
                      onClick={() => erase(product)}
                    >
                      Да
                    </button>
                    <button type="button" className="admin-btn" onClick={() => setErasing(null)}>
                      Нет
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="admin-btn" disabled={busy} onClick={() => restore(product)}>
                      Вернуть
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      disabled={busy}
                      onClick={() => setErasing(product.id)}
                    >
                      Удалить насовсем
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
