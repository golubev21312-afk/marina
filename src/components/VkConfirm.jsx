import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { copyText } from '../lib/clipboard';
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

/**
 * goal — как считать в статистике, если не так, как kind (кнопка в меню — 'menu').
 * copy — текст про изделие со ссылкой: ВК не умеет открывать диалог с готовым
 * сообщением, поэтому кладём его в буфер — человеку остаётся вставить.
 * copying — копирование, начатое прямо по нажатию «Заказать» (copyText):
 * браузеры надёжно пускают в буфер только в момент нажатия.
 */
export default function VkConfirm({ href, onClose, kind = 'order', goal = kind, copy, copying }) {
  const goRef = useRef(null);
  // idle — ещё не копировали, done — в буфере, failed — браузер не дал
  const [copied, setCopied] = useState('idle');
  const doCopy = async () => setCopied((await copyText(copy)) ? 'done' : 'failed');

  // Ждём копирование, начатое по нажатию «Заказать». Не вышло —
  // повторим по «Перейти в ВК» или кнопкой «Скопировать ссылку»
  useEffect(() => {
    if (!copy) return undefined;
    let alive = true;
    (copying ?? copyText(copy)).then((ok) => alive && setCopied(ok ? 'done' : 'failed'));
    return () => {
      alive = false;
    };
  }, [copy, copying]);

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
        {copy && (
          <div className={`vk-confirm__copy is-${copied}`}>
            {copied === 'done' ? (
              <span role="status">✓ Ссылка на изделие скопирована — вставьте её в сообщение мастеру.</span>
            ) : (
              <>
                <span>Скопируйте ссылку на изделие, чтобы вставить её в сообщение:</span>
                <button type="button" onClick={doCopy}>
                  Скопировать ссылку
                </button>
                {copied === 'failed' && <input readOnly value={copy} aria-label="Ссылка на изделие" onFocus={(e) => e.target.select()} />}
              </>
            )}
          </div>
        )}
        <div className="vk-confirm__actions">
          <a
            ref={goRef}
            className="vk-confirm__go"
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackVk(goal);
              if (copy && copied !== 'done') copyText(copy);
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
