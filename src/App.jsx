import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import CookieNotice from './components/CookieNotice';
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
};
const Scenario = lazy(pages.scenario);
const CatalogPage = lazy(pages.catalog);
const AboutPage = lazy(pages.about);
const OrderPage = lazy(pages.order);
const ProductPage = lazy(pages.product);
const AdminPage = lazy(() => import('./admin/AdminPage'));

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

/** Статистика: каждая смена адреса — «открыта страница» (lib/track.js). */
function PageTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    trackPage();
  }, [pathname, search]);
  return null;
}

/** Главная — 3D-сценарий; остальные разделы — отдельные страницы, переход «пузырями». */
export default function App() {
  usePreloadPages();
  return (
    <BrowserRouter>
      <PageTracker />
      <TransitionProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Scenario />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/izdelie/:id" element={<ProductPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Suspense>
        <Lizards />
        <CookieNotice />
      </TransitionProvider>
    </BrowserRouter>
  );
}
