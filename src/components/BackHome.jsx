import { TransitionLink } from '../transition/Transition';
import './BackHome.css';

/**
 * Плавает в левом нижнем углу. По умолчанию — на главную сразу к карусели;
 * страница изделия ведёт «В каталог», в раздел этого изделия.
 */
export default function BackHome({ to = '/', state = { toShowcase: true }, children = 'На главную' }) {
  return (
    <TransitionLink className="back-home" to={to} state={state}>
      <span className="back-home__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </svg>
      </span>
      {children}
    </TransitionLink>
  );
}
