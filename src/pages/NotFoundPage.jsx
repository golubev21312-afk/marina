import BackHome from '../components/BackHome';
import SiteMenu from '../scenario/SiteMenu';
import { TransitionLink } from '../transition/Transition';
import './AboutPage.css';
import './Product.css';

/** Адрес, которого на сайте нет (опечатка, старая ссылка) — вместо пустого экрана. */
export default function NotFoundPage() {
  return (
    <div className="page">
      <SiteMenu />
      <div className="page__body appear">
        <div className="wrap product-missing">
          <h1>Такой страницы нет</h1>
          <p>Возможно, в ссылке опечатка или страницу убрали. Все изделия — в каталоге.</p>
          <TransitionLink className="product-missing__back" to="/catalog">
            Перейти в каталог
          </TransitionLink>
        </div>
      </div>
      <BackHome />
    </div>
  );
}
