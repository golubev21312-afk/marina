import { useCallback, useMemo, useState } from 'react';
import CategoryTabs from './CategoryTabs';
import GiftPicker from './GiftPicker';
import SearchBar from './SearchBar';
import SectionNote from './SectionNote';
import ProductCard from './ProductCard';
import RecentlyViewed from './RecentlyViewed';
import { TransitionLink } from '../transition/Transition';
import { emitMotion } from '../lib/motion';
import { CHEAP_PRICE, useProducts } from '../lib/products';
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

/** Подборка «до 1000 ₽» — не метка Марины, а по цене. */
const CHEAP = 'cheap';

/**
 * Подборки по поводу: метки, которые Марина ставит изделиям, — самые
 * частые первыми; плюс «до 1000 ₽», если такие изделия есть.
 */
function makeOccasions(products) {
  const counts = new Map();
  products.forEach((item) =>
    item.occasions.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)),
  );
  const tags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .map(([name]) => ({ id: name, title: name }));
  const cheap = products.some((item) => item.price && item.price <= CHEAP_PRICE);
  return cheap ? [...tags, { id: CHEAP, title: `до ${CHEAP_PRICE} ₽` }] : tags;
}

/** Сортировка; «как у мастерской» — ручной порядок из админки. */
const SORTS = {
  manual: 'Как у мастерской',
  new: 'Сначала новые',
  cheap: 'Сначала дешевле',
  expensive: 'Сначала дороже',
};

/** Без цены («по запросу») — при сортировке по цене в конце. */
function sortItems(items, sort) {
  const priced = (fn) => (a, b) => (!a.price || !b.price ? Boolean(b.price) - Boolean(a.price) : fn(a.price, b.price));
  const compare = {
    new: (a, b) => b.created.localeCompare(a.created),
    cheap: priced((a, b) => a - b),
    expensive: priced((a, b) => b - a),
  }[sort];
  return compare ? [...items].sort(compare) : items;
}

function fitsOccasion(item, occasion) {
  if (!occasion) return true;
  if (occasion === CHEAP) return Boolean(item.price) && item.price <= CHEAP_PRICE;
  return item.occasions.includes(occasion);
}

export default function Catalog({ initialSection = 'all', initialOccasion = '' }) {
  // Товары — из базы; Марина добавляет их в админке (/admin)
  const { status, items: products } = useProducts();
  const { status: categoriesStatus, items: categories } = useCategories();
  const tabs = useMemo(() => makeTabs(categories, products), [categories, products]);
  const [active, setActive] = useState(initialSection);
  // Раздела из адреса может не быть (удалили) — тогда «Все»
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const [query, setQuery] = useState('');
  const occasions = useMemo(() => makeOccasions(products), [products]);
  const [occasion, setOccasion] = useState(initialOccasion);
  // Метку из адреса могли убрать у всех изделий — тогда без подборки
  const activeOccasion = occasions.some((item) => item.id === occasion) ? occasion : '';
  // Сколько раз выбирали раздел — плашка сверху каждый раз берёт следующий факт
  const [turn, setTurn] = useState(0);
  const [picking, setPicking] = useState(false);
  const [sort, setSort] = useState('manual');
  const closePicker = useCallback(() => setPicking(false), []);

  const pick = (id) => {
    emitMotion();
    if (id !== activeTab.id) trackSection(id);
    setActive(id);
    setTurn((n) => n + 1);
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const found = products.filter((item) => {
      const byCategory = activeTab.id === 'all' || item.category === activeTab.id;
      const byQuery = !needle || item.title.toLowerCase().includes(needle);
      return byCategory && byQuery && fitsOccasion(item, activeOccasion);
    });
    return sortItems(found, sort);
  }, [products, activeTab.id, query, activeOccasion, sort]);

  const searching = query.trim() !== '';
  const loading = status === 'idle' || status === 'loading';

  return (
    <section className="catalog" id="catalog">
      <div className="wrap">
        <div className="catalog__head">
          <span className="kicker">Каталог</span>
          <div className="catalog__tools">
            {products.length > 0 && (
              <button type="button" className="catalog__gift" onClick={() => setPicking(true)}>
                Подобрать подарок
              </button>
            )}
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </div>

        {/* Ждём разделы из базы, иначе по ссылке на раздел плашка успевала
            показать «Все» и застревала на нём. Для каждого раздела — своя */}
        {categoriesStatus === 'ready' ? (
          <SectionNote key={activeTab.id} section={activeTab} categories={categories} turn={turn} />
        ) : (
          <div className="section-note" aria-hidden="true" />
        )}

        <CategoryTabs tabs={tabs} active={activeTab.id} onChange={pick} />

        <div className="catalog__bar">
          {occasions.length > 0 && (
            <div className="occasions" role="group" aria-label="Подборки по поводу">
              <span className="occasions__label">Подарок:</span>
              {occasions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="occasions__chip"
                  aria-pressed={activeOccasion === item.id}
                  onClick={() => {
                    emitMotion();
                    setOccasion((current) => (current === item.id ? '' : item.id));
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}
          {visible.length > 1 && (
            <label className="catalog__sort">
              <span>Сортировка:</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                {Object.entries(SORTS).map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

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
            {activeOccasion && !searching ? (
              <>
                <p className="catalog__soon-title">В этом разделе такого пока нет</p>
                <p>
                  Посмотрите подборку во всех разделах или закажите своё — распишем под человека и
                  повод.
                </p>
              </>
            ) : searching ? (
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
        {/* Во время поиска не путаем с найденным */}
        {status === 'ready' && !searching && <RecentlyViewed products={products} />}
        {/* «Малахит»: матрёшка с ромашками под каталогом; lazy — в другой теме не скачивается */}
        <img className="decor decor--malachite decor-catalog" src="/img/decor-romashka-faces-left.webp" alt="" aria-hidden="true" loading="lazy" />
      </div>
      {picking && <GiftPicker products={products} onClose={closePicker} />}
    </section>
  );
}
