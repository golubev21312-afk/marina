import { useEffect, useState } from 'react';
import { useLocation, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import BackHome from '../components/BackHome';
import Catalog from '../components/Catalog';
import SiteMenu from '../scenario/SiteMenu';
import { useCategories } from '../lib/categories';
import { readCatalogView } from '../lib/catalogView';
import './AboutPage.css';

/**
 * Страница каталога. Раздел — в адресе: /catalog/nevalyashki (ссылку можно
 * дать в ВК); старые ссылки /catalog?section=… тоже открываются.
 * Подборка по поводу — ?povod=учителю.
 */
export default function CatalogPage() {
  const { section: fromPath } = useParams();
  const [params] = useSearchParams();
  const section = fromPath ?? params.get('section') ?? 'all';
  const occasion = params.get('povod') ?? '';
  // Вернулись — туда же, где были: «В каталог» на изделии — всегда; «Назад» или
  // обновление — если в адресе тот же раздел (иначе это новая ссылка, открытая
  // в этой вкладке). Из меню и по ссылкам — каталог с начала
  const location = useLocation();
  const pop = useNavigationType() === 'POP';
  const [saved] = useState(() => {
    const view = readCatalogView();
    if (location.state?.restore) return view;
    return pop && view?.section === section ? view : null;
  });

  // Вкладки сами переписывают адрес (state.tabs) — каталог при этом не пересоздаём;
  // переход из меню в другой раздел — пересоздаём, с этим разделом
  const [catalogKey, setCatalogKey] = useState(location.key);
  if (!location.state?.tabs && catalogKey !== location.key) setCatalogKey(location.key);

  // Заголовок вкладки — с названием раздела
  const { items: categories } = useCategories();
  const title = categories.find((category) => category.slug === section)?.title;
  useEffect(() => {
    document.title = title ? `${title} — каталог мастерской «Крафт»` : 'Каталог — мастерская «Крафт»';
  }, [title]);

  return (
    <div className="page">
      <SiteMenu />
      <div className="page__body appear">
        <Catalog key={catalogKey} initialSection={section} initialOccasion={occasion} saved={saved} />
      </div>
      <BackHome />
    </div>
  );
}
