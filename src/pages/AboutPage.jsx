import About from '../components/About';
import BackHome from '../components/BackHome';
import SiteMenu from '../scenario/SiteMenu';
import './AboutPage.css';

/** Страница «О мастерской»: то же меню, что над каруселью, и текст заказчика. */
export default function AboutPage() {
  return (
    <div className="page">
      <SiteMenu />
      <div className="page__body appear">
        <About />
      </div>

      <BackHome />
    </div>
  );
}
