import { useEffect } from 'react';
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

  useEffect(() => {
    if (product) document.title = `${product.title} — мастерская «Крафт»`;
  }, [product]);

  return (
    <div className="page">
      <SiteMenu />
      <div className="page__body">
        <Product />
      </div>
      {/* Назад — в каталог, сразу в раздел этого изделия */}
      <BackHome to={section ? `/catalog?section=${section}` : '/catalog'} state={null}>
        В каталог
      </BackHome>
    </div>
  );
}
