import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import BackHome from '../components/BackHome';
import SiteMenu from '../scenario/SiteMenu';
import { useProducts } from '../lib/products';
import Product from './Product';
import './AboutPage.css';

/** Страница изделия: /izdelie/:id — с тем же меню, что и остальные страницы. */
export default function ProductPage() {
  const { id } = useParams();
  const { items } = useProducts();
  const product = items.find((item) => item.id === id);
  const section = product?.category;
  const pageRef = useRef(null);

  // Перешли к другому изделию из «Посмотрите ещё» — страница та же,
  // прокрутка осталась бы внизу; возвращаем к началу
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    if (product) document.title = `${product.title} — мастерская «Крафт»`;
  }, [product]);

  return (
    <div className="page" ref={pageRef}>
      <SiteMenu />
      <div className="page__body">
        <Product />
      </div>
      {/* Назад — в каталог: туда, где человек был (lib/catalogView.js), а если в каталоге
          ещё не был (пришёл по ссылке) — в раздел этого изделия */}
      <BackHome to={section ? `/catalog/${section}` : '/catalog'} state={{ restore: true }}>
        В каталог
      </BackHome>
    </div>
  );
}
