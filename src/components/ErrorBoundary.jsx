import { Component } from 'react';
import { reportError } from '../lib/errors';
import '../pages/Product.css';

/**
 * Если страница упала при отрисовке — вместо белого экрана просим обновить,
 * а ошибку отправляем в журнал (client_errors). App сбрасывает её при
 * переходе на другой адрес (key = адрес).
 */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Сайт обновили, пока вкладка была открыта: старых файлов страниц уже нет.
    // Перезагружаемся сами — один раз за минуту, чтобы не зациклиться
    if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(error?.message)) {
      let last = 0;
      try {
        last = Number(sessionStorage.getItem('craft-reloaded')) || 0;
      } catch {
        // хранилище недоступно — просто не перезагружаемся сами
        last = Date.now();
      }
      if (Date.now() - last > 60000) {
        try {
          sessionStorage.setItem('craft-reloaded', String(Date.now()));
          location.reload();
          return;
        } catch {
          // не вышло запомнить — не рискуем зациклиться
        }
      }
    }
    reportError(error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="wrap product-missing">
        <h1>Что-то пошло не так</h1>
        <p>Обновите страницу — обычно это помогает. Если не помогло, загляните позже.</p>
        <div className="error-actions">
          <button type="button" className="product-missing__back error-reload" onClick={() => location.reload()}>
            Обновить страницу
          </button>
          {/* Обычная ссылка, не переход внутри сайта: страница загрузится заново */}
          <a className="product-missing__back" href="/">
            На главную
          </a>
        </div>
      </div>
    );
  }
}
