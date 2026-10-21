import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BrandMark from './BrandMark';
import ThemeToggle from '../components/ThemeToggle';
import VkConfirm from '../components/VkConfirm';
import { TransitionLink } from '../transition/Transition';
import { useProducts } from '../lib/products';
import { useCategories } from '../lib/categories';
import { useFavorites } from '../lib/favorites';
import './SiteMenu.css';

const VK_DIALOG = 'https://vk.me/craftthandmade';

// Контакты — на странице «О мастерской»
const LINKS = [
  { to: '/about', title: 'О мастерской' },
  { to: '/order', title: 'Индивидуальный заказ' },
];

/** Меню над каруселью: разделы сайта, каталог раскрывается списком разделов. */
export default function SiteMenu() {
  // Все разделы сразу, даже пустые: каталог наполняется постепенно.
  // Счётчики — по товарам из базы
  const { items: products } = useProducts();
  const { items: categories } = useCategories();
  // Отложенные — пункт меню появляется, только когда что-то отложено
  const favorites = useFavorites().filter((id) => products.some((product) => product.id === id));
  const sections = categories.map((category) => ({
    ...category,
    count: products.filter((product) => product.category === category.slug).length,
  }));

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const closeConfirm = useCallback(() => setConfirming(false), [setConfirming]);
  const location = useLocation();

  // Переход между разделами каталога не пересоздаёт меню — закрываем сами
  const [seenKey, setSeenKey] = useState(location.key);
  if (seenKey !== location.key) {
    setSeenKey(location.key);
    setCatalogOpen(false);
    setBurgerOpen(false);
  }
  const rootRef = useRef(null);

  // Клик мимо меню и Esc закрывают всё раскрытое
  useEffect(() => {
    if (!catalogOpen && !burgerOpen) return undefined;

    const close = () => {
      setCatalogOpen(false);
      setBurgerOpen(false);
    };
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [catalogOpen, burgerOpen]);

  return (
    <header ref={rootRef} className={`site-menu ${burgerOpen ? 'is-open' : ''}`}>
      <div className="site-menu__brand">
        <BrandMark />
        <span>
          Крафт
          <small>мастерская подарков</small>
        </span>
      </div>

      <nav className="site-menu__nav">
        {/* Наведение раскрывает только мышью: на телефоне касание эмулирует
            наведение, и следующий за ним клик тут же закрывал бы список */}
        <div
          className={`site-menu__drop ${catalogOpen ? 'is-open' : ''}`}
          onPointerEnter={(event) => event.pointerType === 'mouse' && setCatalogOpen(true)}
          onPointerLeave={(event) => event.pointerType === 'mouse' && setCatalogOpen(false)}
        >
          <button
            type="button"
            className="site-menu__link"
            aria-expanded={catalogOpen}
            // Мышью список уже раскрыт наведением — клик его не должен захлопнуть
            onClick={(event) =>
              event.nativeEvent.pointerType === 'mouse'
                ? setCatalogOpen(true)
                : setCatalogOpen((open) => !open)
            }
          >
            Каталог
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <div className="site-menu__panel">
            <TransitionLink className="site-menu__all" to="/catalog">
              Все изделия
              {products.length > 0 && <span>{products.length}</span>}
            </TransitionLink>
            <ul>
              {sections.map((section) => (
                <li key={section.id}>
                  <TransitionLink to={`/catalog/${section.slug}`}>
                    {section.title}
                    {section.count > 0 && <span>{section.count}</span>}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {favorites.length > 0 && (
          <TransitionLink className="site-menu__link site-menu__fav" to="/otlozhennye">
            Отложенные
            <span>{favorites.length}</span>
          </TransitionLink>
        )}

        {LINKS.map((link) =>
          link.to ? (
            <TransitionLink key={link.to} className="site-menu__link" to={link.to}>
              {link.title}
            </TransitionLink>
          ) : (
            <a key={link.href} className="site-menu__link" href={link.href}>
              {link.title}
            </a>
          ),
        )}
      </nav>

      <ThemeToggle />

      <button type="button" className="site-menu__order" onClick={() => setConfirming(true)}>
        Заказать в ВК
      </button>

      {confirming && <VkConfirm href={VK_DIALOG} goal="menu" onClose={closeConfirm} />}

      <button
        type="button"
        className="site-menu__burger"
        aria-label="Меню"
        aria-expanded={burgerOpen}
        onClick={() => setBurgerOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
