import { THEMES, switchTheme, useTheme } from '../theme/theme';
import './ThemeToggle.css';

/**
 * Кнопка-образец: показывает тему, на которую переключит.
 * Новая тема расходится кругом из самой кнопки.
 */
export default function ThemeToggle() {
  const theme = useTheme();
  const index = THEMES.findIndex((item) => item.id === theme);
  const next = THEMES[(index + 1) % THEMES.length];

  const toggle = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    switchTheme(next.id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      data-next={next.id}
      onClick={toggle}
      aria-label={`Включить тему «${next.title}»`}
    >
      <span className="theme-toggle__swatch" aria-hidden="true" />
      <span className="theme-toggle__label" aria-hidden="true">
        Тема «{next.title}»
      </span>
    </button>
  );
}
