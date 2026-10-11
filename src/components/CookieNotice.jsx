import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { consent, setConsent, startMetrika, YM_ID } from '../lib/track';
import './CookieNotice.css';

/**
 * Плашка о cookie — только когда подключена Яндекс.Метрика (VITE_YM_ID).
 * Метрика загружается лишь после «Согласен»; отказ — сайт работает так же,
 * свой счётчик посещений cookie не использует.
 */
export default function CookieNotice() {
  const { pathname } = useLocation();
  const [answer, setAnswer] = useState(() => (YM_ID ? consent() : 'none'));

  useEffect(() => {
    startMetrika(); // уже согласились раньше — подключаем сразу
  }, []);

  if (!YM_ID || answer || pathname.startsWith('/admin')) return null;

  const reply = (yes) => {
    setConsent(yes);
    setAnswer(yes ? 'yes' : 'no');
  };

  return (
    <div className="cookie-notice" role="region" aria-label="Cookie">
      <p>
        Сайт считает посещения с помощью Яндекс.Метрики — она использует cookie. Можно отказаться: сайт будет
        работать так же.
      </p>
      <div className="cookie-notice__actions">
        <button type="button" className="cookie-notice__yes" onClick={() => reply(true)}>
          Согласен
        </button>
        <button type="button" className="cookie-notice__no" onClick={() => reply(false)}>
          Отказаться
        </button>
      </div>
    </div>
  );
}
