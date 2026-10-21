import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { BUDGETS, pickGifts, splitOccasions } from '../lib/giftPicker';
import { formatPrice } from '../lib/format';
import { STOCK } from '../lib/products';
import { TransitionLink } from '../transition/Transition';
import './GiftPicker.css';

/** Столько изделий показываем в ответе — дальше каталог. */
const SHOWN = 6;

/** Мини-карточка изделия в ответе. */
function GiftItem({ item }) {
  return (
    <li>
      <TransitionLink className="gift-picker__item" to={`/izdelie/${item.id}`}>
        {item.small[0] ? <img src={item.small[0]} alt="" loading="lazy" /> : <span className="gift-picker__noimg" />}
        <span>
          <b>{item.title}</b>
          <small>
            {item.price ? formatPrice(item.price) : 'цена по запросу'}
            {item.stock !== 'in_stock' && ` · ${STOCK[item.stock].toLowerCase()}`}
          </small>
        </span>
      </TransitionLink>
    </li>
  );
}

/**
 * Подбор подарка: кому → повод → бюджет → изделия. Вопрос, для которого
 * у изделий нет меток, пропускаем. Логика — lib/giftPicker.js.
 */
export default function GiftPicker({ products, onClose }) {
  const { pathname } = useLocation();
  const { who, why } = useMemo(() => splitOccasions(products), [products]);
  const steps = useMemo(
    () =>
      [
        who.length && { key: 'who', title: 'Кому подарок?', options: who.map((name) => ({ id: name, title: name })) },
        why.length && { key: 'why', title: 'По какому поводу?', options: why.map((name) => ({ id: name, title: name })) },
        { key: 'budget', title: 'Какой бюджет?', options: BUDGETS },
      ].filter(Boolean),
    [who, why],
  );
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const boxRef = useRef(null);
  const done = step >= steps.length;

  // Ушли на изделие или в заказ — окно закрывается само
  const [openedOn] = useState(pathname);
  useEffect(() => {
    if (pathname !== openedOn) onClose();
  }, [pathname, openedOn, onClose]);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Новый шаг — фокус на первый вариант, чтобы листать с клавиатуры
  useEffect(() => {
    boxRef.current?.querySelector('.gift-picker__options button, .gift-picker__item, .gift-picker__order')?.focus();
  }, [step]);

  const answer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setStep((n) => n + 1);
  };

  const result = done ? pickGifts(products, answers) : null;
  const current = steps[step];

  return createPortal(
    <div className="gift-picker" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={boxRef} className="gift-picker__box" role="dialog" aria-modal="true" aria-labelledby="gift-picker-title">
        <button type="button" className="gift-picker__close" aria-label="Закрыть" onClick={onClose}>
          ×
        </button>

        {!done ? (
          <>
            <span className="gift-picker__step">
              Подбор подарка · {step + 1} из {steps.length}
            </span>
            <h2 id="gift-picker-title">{current.title}</h2>
            <div className="gift-picker__options">
              {current.options.map((option) => (
                <button key={option.id} type="button" onClick={() => answer(current.key, option.id)}>
                  {option.title}
                </button>
              ))}
              <button type="button" className="is-any" onClick={() => answer(current.key, '')}>
                Не важно
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="gift-picker__step">Подбор подарка</span>
            <h2 id="gift-picker-title">
              {result.exact.length ? `Подходит: ${result.exact.length}` : 'Точно под ваш запрос пока ничего нет'}
            </h2>
            {!result.exact.length && result.close.length > 0 && <p>Вот что ближе всего:</p>}
            <ul className="gift-picker__list">
              {(result.exact.length ? result.exact : result.close).slice(0, SHOWN).map((item) => (
                <GiftItem key={item.id} item={item} />
              ))}
            </ul>
            <p className="gift-picker__custom">
              Не нашли то самое? Мастер распишет изделие под человека и повод.
            </p>
            <TransitionLink className="gift-picker__order" to="/order">
              Индивидуальный заказ
            </TransitionLink>
          </>
        )}

        {step > 0 && (
          <button type="button" className="gift-picker__back" onClick={() => setStep((n) => n - 1)}>
            ← Назад
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
