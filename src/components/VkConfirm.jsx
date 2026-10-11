import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trackVk } from '../lib/track';
import './VkConfirm.css';

/**
 * Предупреждение перед переходом в ВК: человек сам решает, уходить ли с сайта.
 * «Перейти» — обычная ссылка, чтобы новую вкладку не заблокировал браузер.
 * Рисуется прямо в body: у меню размытый фон, а он запирает position: fixed
 * внутри плашки.
 */
/** Куда ведёт ссылка и что там делать — зависит от того, откуда человек пришёл. */
const DIALOG = 'Кнопка «Перейти в ВК» откроет сообщения сообщества «Крафт» ВКонтакте в новой вкладке.';
const TEXTS = {
  order: `${DIALOG} Напишите, какое изделие вам понравилось, — можно приложить его фото или название с сайта. Мастер ответит и расскажет о наличии, сроках и цене.`,
  custom: `${DIALOG} Напишите, какой подарок хотите, — при желании приложите фото для примера. Мастер ответит и обсудит с вами детали.`,
  community:
    'Кнопка «Перейти в ВК» откроет страницу сообщества «Крафт» ВКонтакте в новой вкладке. Там — новые работы мастерской, отзывы и новости, а написать мастеру можно кнопкой «Написать сообщение».',
};

export default function VkConfirm({ href, onClose, kind = 'order' }) {
  const goRef = useRef(null);

  useEffect(() => {
    goRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="vk-confirm" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="vk-confirm__box" role="dialog" aria-modal="true" aria-labelledby="vk-confirm-title">
        <h2 id="vk-confirm-title">Переходим во ВКонтакте</h2>
        <p>{TEXTS[kind]}</p>
        <div className="vk-confirm__actions">
          <a
            ref={goRef}
            className="vk-confirm__go"
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackVk(kind);
              onClose();
            }}
          >
            Перейти в ВК
          </a>
          <button type="button" className="vk-confirm__stay" onClick={onClose}>
            Остаться на сайте
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
