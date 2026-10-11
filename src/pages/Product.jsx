import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import Gallery from '../components/Gallery';
import VkConfirm from '../components/VkConfirm';
import { TransitionLink } from '../transition/Transition';
import { formatPrice } from '../lib/format';
import { useProducts } from '../lib/products';
import { useCategories } from '../lib/categories';
import './Product.css';

const VK_DIALOG = 'https://vk.me/craftthandmade';

/** Страница изделия из базы: фото, описание, цена, заказ в ВК. */
export default function Product() {
  const { id } = useParams();
  const { status, items } = useProducts();
  const { items: categories } = useCategories();
  const [confirming, setConfirming] = useState(false);
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

  return (
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
        {!product.available && <span className="product__sold-badge">Нет в наличии</span>}
        {product.description && <p className="product__lead">{product.description}</p>}

        <div className="product__price">
          {product.price ? formatPrice(product.price) : 'Цена — по запросу'}
          {!product.available && <span className="product__sold">Можно заказать похожее — мастер сделает на заказ</span>}
        </div>

        <button type="button" className="product__order" onClick={() => setConfirming(true)}>
          Заказать в ВК
        </button>

        <dl className="product__meta">
          <div>
            <dt>Материал</dt>
            <dd>дерево, ручная роспись</dd>
          </div>
          <div>
            <dt>Мастерская</dt>
            <dd>Нижний Тагил</dd>
          </div>
        </dl>
      </div>

      {confirming && <VkConfirm href={VK_DIALOG} onClose={close} />}
    </article>
  );
}
