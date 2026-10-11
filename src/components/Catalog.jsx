import { useMemo, useState } from 'react';
import CategoryTabs from './CategoryTabs';
import SearchBar from './SearchBar';
import SectionNote from './SectionNote';
import ProductCard from './ProductCard';
import { TransitionLink } from '../transition/Transition';
import { emitMotion } from '../lib/motion';
import { useProducts } from '../lib/products';
import { useCategories } from '../lib/categories';
import { trackSection } from '../lib/track';
import './Catalog.css';

/**
 * Все разделы видны сразу, даже пустые: каталог наполняется постепенно.
 * id вкладки — slug раздела (он же в адресе: /catalog?section=…)
 */
function makeTabs(categories, products) {
  return [
    { id: 'all', title: 'Все', count: products.length },
    ...categories.map((category) => ({
      ...category,
      id: category.slug,
      count: products.filter((item) => item.category === category.slug).length,
    })),
  ];
}

export default function Catalog({ initialSection = 'all' }) {
  // Товары — из базы; Марина добавляет их в админке (/admin)
  const { status, items: products } = useProducts();
  const { status: categoriesStatus, items: categories } = useCategories();
  const tabs = useMemo(() => makeTabs(categories, products), [categories, products]);
  const [active, setActive] = useState(initialSection);
  // Раздела из адреса может не быть (удалили) — тогда «Все»
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const [query, setQuery] = useState('');
  // Сколько раз выбирали раздел — плашка сверху каждый раз берёт следующий факт
  const [turn, setTurn] = useState(0);

  const pick = (id) => {
    emitMotion();
    trackSection(id);
    setActive(id);
    setTurn((n) => n + 1);
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((item) => {
      const byCategory = activeTab.id === 'all' || item.category === activeTab.id;
      const byQuery = !needle || item.title.toLowerCase().includes(needle);
      return byCategory && byQuery;
    });
  }, [products, activeTab.id, query]);

  const searching = query.trim() !== '';
  const loading = status === 'idle' || status === 'loading';

  return (
    <section className="catalog" id="catalog">
      <div className="wrap">
        <div className="catalog__head">
          <span className="kicker">Каталог</span>
          <SearchBar value={query} onChange={setQuery} />
        </div>

        {/* Ждём разделы из базы, иначе по ссылке на раздел плашка успевала
            показать «Все» и застревала на нём. Для каждого раздела — своя */}
        {categoriesStatus === 'ready' ? (
          <SectionNote key={activeTab.id} section={activeTab} categories={categories} turn={turn} />
        ) : (
          <div className="section-note" aria-hidden="true" />
        )}

        <CategoryTabs tabs={tabs} active={activeTab.id} onChange={pick} />

        {loading && <p className="catalog__loading">Загружаем изделия…</p>}
        {status === 'error' && (
          <p className="catalog__loading">
            Не получилось загрузить изделия — проверьте интернет и обновите страницу.
          </p>
        )}

        {visible.length > 0 && (
          <div className="catalog__grid">
            {visible.map((item, i) => (
              <ProductCard key={item.id} product={item} index={i} />
            ))}
          </div>
        )}

        {status === 'ready' && visible.length === 0 && (
          <div className="catalog__soon">
            {searching ? (
              <>
                <p className="catalog__soon-title">«{query.trim()}» пока не нашлось</p>
                <p>
                  Каталог только наполняется — возможно, такое изделие скоро появится.
                  А можно заказать его у мастера: распишем под человека и повод.
                </p>
              </>
            ) : (
              <>
                <p className="catalog__soon-title">Раздел скоро наполнится</p>
                <p>
                  Мастерская как раз готовит изделия для этого раздела. А пока можно заказать
                  своё — распишем под человека и повод.
                </p>
              </>
            )}
            <TransitionLink className="catalog__soon-link" to="/order">
              Индивидуальный заказ
            </TransitionLink>
          </div>
        )}
        <img className="decor decor--malachite decor-catalog" src="/img/lizard-plaque.webp" alt="" aria-hidden="true" />
      </div>
    </section>
  );
}
