import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TransitionContext, useTransitionTo } from './TransitionContext';
import { emitMotion } from '../lib/motion';
import './Transition.css';

/**
 * Переход между страницами: два круга растут снизу и накрывают экран,
 * под ними меняется маршрут, затем круги уходят вверх.
 * Механика — референс frontendjoe, см. content/ui-references.md.
 */
export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const [transition, setTransition] = useState(null);

  // Пока идёт переход, новые клики игнорируем — иначе маршрут сменится дважды
  const transitionTo = useCallback(
    (to, state) => {
      emitMotion();
      setTransition((current) => current ?? { to, state, phase: 'covering' });
    },
    [],
  );

  // Экран закрыт вторым кругом — подменяем страницу; ушёл последний — конец
  const handleSecondEnd = () => {
    if (transition?.phase !== 'covering') return;
    navigate(transition.to, { state: transition.state });
    setTransition({ ...transition, phase: 'revealing' });
  };

  const handleFirstEnd = () => {
    if (transition?.phase === 'revealing') setTransition(null);
  };

  // Страховка: если браузер не прислал «анимация закончилась» (свёрнутая
  // вкладка, экономия энергии) — всё равно меняем страницу и открываем её,
  // иначе человек остался бы перед закрытым экраном
  useEffect(() => {
    if (!transition) return undefined;
    const timer = setTimeout(
      () => {
        if (transition.phase === 'covering') {
          navigate(transition.to, { state: transition.state });
          setTransition({ ...transition, phase: 'revealing' });
        } else {
          setTransition(null);
        }
      },
      transition.phase === 'covering' ? 1500 : 1800,
    );
    return () => clearTimeout(timer);
  }, [transition, navigate]);

  return (
    <TransitionContext.Provider value={transitionTo}>
      <div
        className={transition ? `bubbles ${transition.phase}` : 'bubbles'}
        aria-hidden="true"
      >
        <div className="bubbles__first" onAnimationEnd={handleFirstEnd} />
        <div className="bubbles__second" onAnimationEnd={handleSecondEnd} />
      </div>
      {children}
    </TransitionContext.Provider>
  );
}

/** Ссылка, которая уходит на новый маршрут через анимацию перехода. */
export function TransitionLink({ to, state, children, ...rest }) {
  const transitionTo = useTransitionTo();

  const handleClick = (event) => {
    // Служебные клики (новая вкладка, средняя кнопка) отдаём браузеру как есть
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    transitionTo(to, state);
  };

  return (
    <Link to={to} state={state} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
