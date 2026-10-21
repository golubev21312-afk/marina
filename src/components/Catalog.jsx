import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CategoryTabs from './CategoryTabs';
import GiftPicker from './GiftPicker';
import SearchBar from './SearchBar';
import SectionNote from './SectionNote';
import ProductCard from './ProductCard';
import RecentlyViewed from './RecentlyViewed';
import { CardSkeletons } from './Skeleton';
import { TransitionLink } from '../transition/Transition';
import { emitMotion } from '../lib/motion';
import { CHEAP_PRICE, useProducts } from '../lib/products';
import { useCategories } from '../lib/categories';
import { trackSection } from '../lib/track';
import { saveCatalogView } from '../lib/catalogView';
import { parseQuery, searchScore } from '../lib/search';
import './Catalog.css';

/**
 * Все разделы видны сразу, даже пустые: каталог наполняется постепенно.
 * id вкладки — slug раздела (он же в адресе: /catalog/slug)
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

/**
 * saved — где человек был в каталоге (lib/catalogView.js): вернулся из изделия —
 * тот же раздел, подборка, поиск, сортировка и место прокрутки.
 */
export default function Catalog({ initialSection = 'all', initialOccasion = '', saved = null }) {
  // Товары — из базы; Марина добавляет их в админке (/admin)
  const { status, items: products } = useProducts();
  const { status: categoriesStatus, items: categories } = useCategories();
  const tabs = useMemo(() => makeTabs(categories, products), [categories, products]);
  const [active, setActive] = useState(saved?.section ?? initialSection);
  // Раздела из адреса может не быть (удалили) — тогда «Все»
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const [query, setQuery] = useState(saved?.query ?? '');
  const occasions = useMemo(() => makeOccasions(products), [products]);
  const [occasion, setOccasion] = useState(saved?.occasion ?? initialOccasion);
  // Метку из адреса могли убрать у всех изделий — тогда без подборки
  const activeOccasion = occasions.some((item) => item.id === occasion) ? occasion : '';
  // Сколько раз выбирали раздел — плашка сверху каждый раз берёт следующий факт
  const [turn, setTurn] = useState(saved?.turn ?? 0);
  const [picking, setPicking] = useState(false);
  const [sort, setSort] = useState(saved?.sort ?? 'manual');
  const closePicker = useCallback(() => setPicking(false), []);

  const pick = (id) => {
    emitMotion();
    if (id !== activeTab.id) trackSection(id);
    setActive(id);
    setTurn((n) => n + 1);
  };

  const visible = useMemo(() => {
    // Поиск — lib/search.js: название, описание, материал, поводы, раздел
    const words = parseQuery(query);
    const sectionTitle = new Map(categories.map((category) => [category.slug, category.title]));
    const scored = products
      .filter((item) => activeTab.id === 'all' || item.category === activeTab.id)
      .filter((item) => fitsOccasion(item, activeOccasion))
      .map((item) => ({ item, score: searchScore(item, words, sectionTitle.get(item.category)) }))
      .filter((entry) => entry.score > 0);
    // Ищут, а порядок «как у мастерской» — найденное в названии выше
    if (words.length && sort === 'manual') scored.sort((a, b) => b.score - a.score);
    return sortItems(
      scored.map((entry) => entry.item),
      sort,
    );
  }, [products, categories, activeTab.id, query, activeOccasion, sort]);

  // Адрес — как на экране: /catalog/раздел?povod=… — ссылку можно скопировать и отправить.
  // Заменяем, а не добавляем в историю: «Назад» уводит из каталога, а не по вкладкам.
  // Ждём разделы: до них вкладка всегда «Все», и адрес мелькнул бы на /catalog
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (categoriesStatus !== 'ready') return;
    const path = activeTab.id === 'all' ? '/catalog' : `/catalog/${activeTab.id}`;
    const query = activeOccasion ? `?povod=${encodeURIComponent(activeOccasion)}` : '';
    if (decodeURI(path + query) !== decodeURI(pathname + search)) {
      navigate(path + query, { replace: true, state: { tabs: true } });
    }
  }, [categoriesStatus, activeTab.id, activeOccasion, pathname, search, navigate]);

  // Запоминаем, где человек в каталоге, — для возврата из изделия
  const sectionRef = useRef(null);
  useEffect(() => {
    saveCatalogView({ section: activeTab.id, occasion: activeOccasion, query, sort, turn });
  }, [activeTab.id, activeOccasion, query, sort, turn]);

  // Прокручивается не окно, а страница (.page). Помним не пиксели, а первую видимую
  // карточку и её отступ от верха: плашка с фактом над каталогом бывает разной
  // высоты, и по пикселям карточки бы съехали
  const ready = status === 'ready';
  useEffect(() => {
    const page = sectionRef.current?.closest('.page');
    if (!page || !ready) return undefined;
    const cards = () => sectionRef.current?.querySelectorAll('.catalog__grid .card-wrap') ?? [];
    // Место карточки на странице — по раскладке, без анимаций: страница и карточки
    // въезжают со сдвигом, и по экранным координатам место выходило бы не то
    const layoutTop = (el) => {
      let y = 0;
      for (let node = el; node && node !== page; node = node.offsetParent) y += node.offsetTop;
      return y;
    };

    const anchor = () => {
      const card = [...cards()].find((el) => layoutTop(el) + el.offsetHeight > page.scrollTop + 80);
      return card ? { anchor: card.dataset.id, anchorTop: layoutTop(card) - page.scrollTop } : { anchor: null };
    };
    let pending = 0;
    const onScroll = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => saveCatalogView({ scroll: page.scrollTop, ...anchor() }));
    };

    // Вернулись — та же карточка на том же месте. Страница может дорасти позже
    // (догружается что-то выше или ниже): каждый раз, как меняется её высота,
    // ставим карточку обратно — 3 секунды или пока человек сам не начал листать
    let stop = !saved?.scroll;
    const until = Date.now() + 3000;
    const restore = () => {
      if (stop || Date.now() > until) return;
      const card = saved.anchor && [...cards()].find((el) => el.dataset.id === saved.anchor);
      page.scrollTop = card ? layoutTop(card) - saved.anchorTop : saved.scroll;
    };
    const grows = new ResizeObserver(restore);
    if (saved?.scroll) {
      restore();
      grows.observe(page.firstElementChild ?? page);
      [...page.children].forEach((child) => grows.observe(child));
    } else saveCatalogView({ scroll: 0, anchor: null });
    const userScrolls = () => (stop = true);

    page.addEventListener('scroll', onScroll, { passive: true });
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
      page.addEventListener(type, userScrolls, { passive: true });
    }
    return () => {
      grows.disconnect();
      cancelAnimationFrame(pending);
      page.removeEventListener('scroll', onScroll);
      for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
        page.removeEventListener(type, userScrolls);
      }
    };
  }, [ready, saved]);

  const searching = query.trim() !== '';
  const loading = status === 'idle' || status === 'loading';

  return (
    <section ref={sectionRef} className="catalog" id="catalog">
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

        {loading && <CardSkeletons />}
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
