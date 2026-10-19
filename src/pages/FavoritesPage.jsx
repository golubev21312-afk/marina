import { useCallback, useState } from 'react';
import BackHome from '../components/BackHome';
import ProductCard from '../components/ProductCard';
import VkConfirm from '../components/VkConfirm';
import SiteMenu from '../scenario/SiteMenu';
import { TransitionLink } from '../transition/Transition';
import { copyText } from '../lib/clipboard';
import { clearFavorites, useFavorites } from '../lib/favorites';
import { useProducts } from '../lib/products';
import './AboutPage.css';
import './Product.css';
import './FavoritesPage.css';

const VK_DIALOG = 'https://vk.me/craftthandmade';

/**
 * Отложенные изделия: список и «Отправить мастеру» — одно сообщение
 * со всеми названиями и ссылками (ВК не умеет вставить его сам —
 * кладём в буфер, как при заказе одного изделия).
 */
export default function FavoritesPage() {
  const ids = useFavorites();
  const { status, items } = useProducts();
  // Порядок — как отложили (новые сверху); удалённых из базы нет
  const saved = ids.map((id) => items.find((item) => item.id === id)).filter(Boolean);
  const [confirming, setConfirming] = useState(false);
  const [copying, setCopying] = useState(null);
  const close = useCallback(() => setConfirming(false), []);

  const message = [
    'Здравствуйте! Мне понравились:',
    ...saved.map((item, i) => `${i + 1}. «${item.title}» — ${window.location.origin}/izdelie/${item.id}`),
  ].join('\n');

  return (
    <div className="page">
      <SiteMenu />
      <div className="page__body appear">
        <section className="wrap favorites">
          <h1>Отложенные</h1>

          {saved.length > 0 ? (
            <>
              <p className="favorites__lead">
                Отправьте список мастеру — он расскажет о наличии, сроках и цене. Список хранится только в этом
                браузере.
              </p>
              <div className="favorites__actions">
                <button
                  type="button"
                  className="product__order"
                  onClick={() => {
                    setCopying(copyText(message));
                    setConfirming(true);
                  }}
                >
                  Отправить мастеру в ВК
                </button>
                <button type="button" className="favorites__clear" onClick={clearFavorites}>
                  Очистить список
                </button>
              </div>
              <div className="related__grid">
                {saved.map((item, i) => (
                  <ProductCard key={item.id} product={item} index={i} />
                ))}
              </div>
            </>
          ) : status === 'idle' || status === 'loading' ? (
            <p className="favorites__lead">Загружаем…</p>
          ) : (
            <div className="favorites__empty">
              <p>
                Здесь пока пусто. Нажимайте на сердечко у изделий, которые понравились, — они соберутся здесь, и
                весь список можно будет отправить мастеру одним сообщением.
              </p>
              <TransitionLink className="product-missing__back" to="/catalog">
                Перейти в каталог
              </TransitionLink>
            </div>
          )}
        </section>
      </div>
      <BackHome />

      {confirming && <VkConfirm href={VK_DIALOG} onClose={close} copy={message} copying={copying} />}
    </div>
  );
}
