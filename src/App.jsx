import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import CookieNotice from './components/CookieNotice';
import ErrorBoundary from './components/ErrorBoundary';
import IdleHint from './components/IdleHint';
import Lizards from './components/Lizards';
import { trackPage } from './lib/track';
import { TransitionProvider } from './transition/Transition';

/**
 * Страницы грузятся отдельными файлами: 3D (three.js) — только на главной
 * и в заказе, админку посетители не скачивают вовсе.
 */
const pages = {
  scenario: () => import('./scenario/Scenario'),
  catalog: () => import('./pages/CatalogPage'),
  about: () => import('./pages/AboutPage'),
  order: () => import('./pages/OrderPage'),
  product: () => import('./pages/ProductPage'),
  privacy: () => import('./pages/PrivacyPage'),
  favorites: () => import('./pages/FavoritesPage'),
};
const Scenario = lazy(pages.scenario);
const CatalogPage = lazy(pages.catalog);
const AboutPage = lazy(pages.about);
const OrderPage = lazy(pages.order);
const ProductPage = lazy(pages.product);
const PrivacyPage = lazy(pages.privacy);
const FavoritesPage = lazy(pages.favorites);
const AdminPage = lazy(() => import('./admin/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PasswordResetPage = lazy(() => import('./admin/PasswordReset'));

/**
 * Когда браузер освободится, заранее подгружаем остальные страницы сайта —
 * переход «пузырями» не ждёт загрузки. Админку не трогаем.
 */
function usePreloadPages() {
  useEffect(() => {
    const preload = () => Object.values(pages).forEach((load) => load().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(preload, 2000);
    return () => clearTimeout(timer);
  }, []);
}

const TITLES = {
  '/': 'Крафт — эксклюзивные подарки ручной работы',
  '/catalog': 'Каталог — мастерская «Крафт»',
  '/about': 'О мастерской «Крафт»',
  '/order': 'Индивидуальный заказ — мастерская «Крафт»',
  '/privacy': 'Политика обработки персональных данных — «Крафт»',
  '/otlozhennye': 'Отложенные изделия — мастерская «Крафт»',
};

/**
 * Каждая смена адреса: статистика (lib/track.js) и заголовок вкладки —
 * иначе после захода по ссылке на изделие во вкладке так и висело бы его название.
 */
function PageTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    trackPage();
  }, [pathname, search]);
  useEffect(() => {
    if (!pathname.startsWith('/izdelie/')) document.title = TITLES[pathname] ?? 'Мастерская «Крафт»';
  }, [pathname]);
  return null;
}

/** Упала страница — запасной экран; на другом адресе пробуем заново. */
function Guarded({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

/** Главная — 3D-сценарий; остальные разделы — отдельные страницы, переход «пузырями». */
export default function App() {
  usePreloadPages();
  // reducedMotion="user": при «Уменьшить движение» в системе появления
  // (факты, слайды, шаги) только проступают, без сдвигов
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <PageTracker />
        <TransitionProvider>
          <Guarded>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Scenario />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/order" element={<OrderPage />} />
                <Route path="/izdelie/:id" element={<ProductPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/otlozhennye" element={<FavoritesPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/reset/:token" element={<PasswordResetPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Guarded>
          <Lizards />
          <IdleHint />
          <CookieNotice />
        </TransitionProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
