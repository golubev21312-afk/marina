import { useEffect, useRef, useState } from 'react';

/** Адрес, на котором сайт открыт сейчас, — не настоящий: QR вёл бы на этот компьютер. */
const LOCAL = /^(localhost|127\.|192\.168\.|10\.)/;

/**
 * QR-код сайта для визиток, бирок, ярмарки: наклейка — код и подпись под ним.
 * Ведёт на главную того адреса, с которого открыта админка (на хостинге — домен).
 * Библиотеку qrcode грузим только здесь — посетители её не скачивают.
 */
export default function SiteQr({ onClose }) {
  const canvasRef = useRef(null);
  const [png, setPng] = useState('');
  const [error, setError] = useState('');
  const url = `${window.location.origin}/`;
  const local = LOCAL.test(window.location.hostname);

  useEffect(() => {
    let alive = true;
    (async () => {
      const QRCode = (await import('qrcode')).default;
      await document.fonts.ready;
      const canvas = canvasRef.current;
      if (!alive || !canvas) return;
      // Наклейка 600×760: белый фон, код 480 px, под ним название и адрес
      const qr = document.createElement('canvas');
      await QRCode.toCanvas(qr, url, { width: 480, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1d2418', light: '#ffffff' } });
      canvas.width = 600;
      canvas.height = 760;
      const x = canvas.getContext('2d');
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 600, 760);
      x.drawImage(qr, 60, 50);
      x.fillStyle = '#1d2418';
      x.textAlign = 'center';
      x.font = '600 44px Lora, Georgia, serif';
      x.fillText('Крафт', 300, 600);
      x.font = '22px "Golos Text", Arial, sans-serif';
      x.fillText('мастерская подарков ручной работы', 300, 640);
      x.fillStyle = '#5b6150';
      x.font = '20px "Golos Text", Arial, sans-serif';
      x.fillText(url.replace(/^https?:\/\//, '').replace(/\/$/, ''), 300, 690);
      setPng(canvas.toDataURL('image/png'));
    })().catch((err) => {
      console.error(err);
      if (alive) setError('Не получилось сделать QR-код. Обновите страницу и попробуйте ещё раз.');
    });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Печать: на время печати на странице видна только наклейка (Admin.css, @media print)
  const print = () => {
    document.body.classList.add('is-printing-qr');
    const done = () => {
      document.body.classList.remove('is-printing-qr');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  return (
    <div className="site-qr" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="site-qr__box" role="dialog" aria-modal="true" aria-labelledby="site-qr-title">
        <h2 id="site-qr-title">QR-код сайта</h2>
        <p className="admin-hint">Для визиток, бирок, ярмарки: наводят камеру телефона — открывается сайт.</p>
        {local && (
          <p className="admin-error">
            Сейчас сайт открыт на этом компьютере — код ведёт сюда, а не на сайт в интернете. Скачивайте и
            печатайте после выкладки на хостинг: откройте админку по адресу сайта.
          </p>
        )}
        <canvas ref={canvasRef} className="site-qr__label" aria-label={`QR-код: ${url}`} />
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-actions">
          <a className={`admin-btn admin-btn--main ${png ? '' : 'is-disabled'}`} href={png || undefined} download="kraft-qr.png">
            Скачать картинку
          </a>
          <button type="button" className="admin-btn" onClick={print} disabled={!png}>
            Распечатать
          </button>
          <button type="button" className="admin-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
