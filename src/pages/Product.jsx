import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FavoriteButton from '../components/FavoriteButton';
import Gallery from '../components/Gallery';
import ProductCard from '../components/ProductCard';
import Reviews from '../components/Reviews';
import VkConfirm from '../components/VkConfirm';
import { TransitionLink } from '../transition/Transition';
import { copyText } from '../lib/clipboard';
import { formatPrice } from '../lib/format';
import { DEFAULT_MATERIAL, STOCK, useProducts } from '../lib/products';
import { useCategories } from '../lib/categories';
import './Product.css';

const VK_DIALOG = 'https://vk.me/craftthandmade';

/** Сколько изделий показывать в «Посмотрите ещё». */
const RELATED_COUNT = 4;

/**
 * Похожие изделия: сначала из того же раздела, не хватает — добираем из
 * остальных. Порядок — как в каталоге, но то, чего нет в наличии, — в конце.
 */
function relatedTo(product, items) {
  const others = items.filter((item) => item.id !== product.id);
  const soldLast = (list) => [
    ...list.filter((item) => item.stock !== 'sold_out'),
    ...list.filter((item) => item.stock === 'sold_out'),
  ];
  const same = soldLast(others.filter((item) => item.category === product.category));
  const rest = soldLast(others.filter((item) => item.category !== product.category));
  return [...same, ...rest].slice(0, RELATED_COUNT);
}

/**
 * «Поделиться»: на телефоне — его меню (ВК, Telegram, WhatsApp…),
 * на компьютере — ссылка в буфер с подсказкой «скопирована».
 */
function ShareButton({ title, url }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const phone = window.matchMedia?.('(pointer: coarse)').matches;
    if (phone && navigator.share) {
      try {
        await navigator.share({ title, text: `${title} — мастерская «Крафт»`, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return; // передумали — ничего не делаем
      }
    }
    setCopied(await copyText(url));
  };

  return (
    <button type="button" className="product__share" onClick={share}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      <span aria-live="polite">{copied ? 'Ссылка скопирована' : 'Поделиться'}</span>
    </button>
  );
}

/** Страница изделия из базы: фото, описание, цена, заказ в ВК. */
export default function Product() {
  const { id } = useParams();
  const { status, items } = useProducts();
  const { items: categories } = useCategories();
  const [confirming, setConfirming] = useState(false);
  // Копирование ссылки — начатое прямо по нажатию «Заказать» (см. VkConfirm)
  const [copying, setCopying] = useState(null);
  const close = useCallback(() => setConfirming(false), []);
  const product = items.find((item) => item.id === id);

  if (!product && (status === 'idle' || status === 'loading')) {
    return <p className="wrap product-loading">Загружаем изделие…</p>;
  }

  // База недоступна — изделие, может, и есть; не говорим «уехало»
  if (!product && status === 'error') {
    return (
      <div className="wrap product-missing">
        <h1>Не получилось загрузить изделие</h1>
        <p>Проверьте интернет и обновите страницу.</p>
        <TransitionLink className="product-missing__back" to="/catalog">
          Вернуться в каталог
        </TransitionLink>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="wrap product-missing">
        <h1>Такого изделия нет</h1>
        <p>Возможно, оно уехало к новому хозяину.</p>
        <TransitionLink className="product-missing__back" to="/catalog">
          Вернуться в каталог
        </TransitionLink>
      </div>
    );
  }

  const category = categories.find((item) => item.slug === product.category);
  const related = relatedTo(product, items);

  // Готовое сообщение мастеру: ВК не умеет открывать диалог с текстом
  const url = `${window.location.origin}/izdelie/${product.id}`;
  const orderText = `Здравствуйте! Хочу заказать «${product.title}»: ${url}`;

  return (
    <>
      <article className="wrap product appear">
        <div className="product__media">
          <Gallery photos={product.photos} title={product.title} />
        </div>

        <div className="product__info appear-late">
          {category && (
            <TransitionLink className="kicker" to={`/catalog?section=${category.slug}`}>
              {category.title}
            </TransitionLink>
          )}
          <h1>{product.title}</h1>
          {product.isNew && <span className="product__new-badge">Новинка</span>}
          {product.stock === 'sold_out' && <span className="product__sold-badge">{STOCK.sold_out}</span>}
          {product.stock === 'to_order' && <span className="product__to-order-badge">{STOCK.to_order}</span>}
          {product.description && <p className="product__lead">{product.description}</p>}

          <div className="product__price">
            {product.price ? formatPrice(product.price) : 'Цена — по запросу'}
            {product.stock === 'sold_out' && (
              <span className="product__sold">
                {product.leadTime
                  ? `Можно заказать похожее — мастер сделает за ${product.leadTime}`
                  : 'Можно заказать похожее — мастер сделает на заказ'}
              </span>
            )}
            {product.stock === 'to_order' && (
              <span className="product__sold">
                {product.leadTime
                  ? `Мастер сделает его для вас за ${product.leadTime}`
                  : 'Мастер сделает его для вас — срок подскажет в ВК'}
              </span>
            )}
          </div>

          <div className="product__actions">
            <button
              type="button"
              className="product__order"
              onClick={() => {
                setCopying(copyText(orderText));
                setConfirming(true);
              }}
            >
              Заказать в ВК
            </button>
            <ShareButton title={product.title} url={url} />
            <FavoriteButton product={product} />
          </div>

          <dl className="product__meta">
            <div>
              <dt>Материал</dt>
              <dd>{product.material || DEFAULT_MATERIAL}</dd>
            </div>
            {product.size && (
              <div>
                <dt>Размер</dt>
                <dd>{product.size}</dd>
              </div>
            )}
            {product.leadTime && product.stock !== 'in_stock' && (
              <div>
                <dt>Срок изготовления</dt>
                <dd>{product.leadTime}</dd>
              </div>
            )}
            <div>
              <dt>Мастерская</dt>
              <dd>Нижний Тагил</dd>
            </div>
          </dl>

          {product.occasions.length > 0 && (
            <div className="product__occasions">
              <span>Подойдёт в подарок:</span>
              {product.occasions.map((name) => (
                <TransitionLink key={name} to={`/catalog?povod=${encodeURIComponent(name)}`}>
                  {name}
                </TransitionLink>
              ))}
            </div>
          )}
        </div>

        {confirming && (
          <VkConfirm href={VK_DIALOG} onClose={close} copy={orderText} copying={copying} />
        )}
      </article>

      <Reviews productId={product.id} title="Отзывы об этом изделии" />

      {related.length > 0 && (
        <section className="wrap related appear-late" aria-labelledby="related-title">
          <h2 id="related-title">Посмотрите ещё</h2>
          <div className="related__grid">
            {related.map((item, i) => (
              <ProductCard key={item.id} product={item} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
