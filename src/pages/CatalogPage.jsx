import { useSearchParams } from 'react-router-dom';
import BackHome from '../components/BackHome';
import Catalog from '../components/Catalog';
import SiteMenu from '../scenario/SiteMenu';
import './AboutPage.css';

/** Страница каталога; раздел можно открыть сразу — /catalog?section=… */
export default function CatalogPage() {
  const [params] = useSearchParams();
  const section = params.get('section') ?? 'all';

  return (
    <div className="page">
      <SiteMenu />
      <div className="page__body appear">
        {/* key — из меню можно перейти в другой раздел, не уходя со страницы */}
        <Catalog key={section} initialSection={section} />
      </div>
      <BackHome />
    </div>
  );
}
