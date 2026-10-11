import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import LoadingFacts from '../scenario/LoadingFacts';
import SiteMenu from '../scenario/SiteMenu';
import StepsSlide from '../scenario/StepsSlide';
import { useMatryoshka } from '../scenario/useMatryoshka';
import '../scenario/Scenario.css';
import BackHome from '../components/BackHome';
import VkConfirm from '../components/VkConfirm';
import { emitMotion } from '../lib/motion';
import './OrderPage.css';

const VK_DIALOG = 'https://vk.me/craftthandmade';

/** Точка шкалы, где матрёшка стоит собранной (см. useMatryoshka). */
const ASSEMBLED = 0.6;
const ASSEMBLE_SEC = 4.5;

/**
 * Сначала шаги вокруг матрёшки (проступают за ~3,6 с, см. START_DELAY
 * и STAGGER в StepsSlide, плюс время прочитать), потом появляется блок
 * заказа и остаётся насовсем. Шаги дальше проступают сами время от времени.
 */
const FIRST_STEPS_MS = 10000;
const STEPS_PAUSE_MS = 15000;
const STEPS_SHOW_MS = 8000;

/**
 * Индивидуальный заказ: матрёшка собирается, вокруг проступают шаги,
 * затем матрёшка отъезжает в сторону и появляется блок заказа.
 */
export default function OrderPage() {
  const canvasRef = useRef(null);
  const { api, ready, progressPct, failed } = useMatryoshka(canvasRef);
  const [stage, setStage] = useState('steps');
  const [stepsOn, setStepsOn] = useState(true);
  // Номер показа: шаги заново проступают по одному при каждом появлении
  const [round, setRound] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const closeConfirm = useCallback(() => setConfirming(false), []);

  // Сборка матрёшки — один раз, как только модель готова
  useEffect(() => {
    if (!ready) return undefined;
    const state = { progress: 0 };
    const tween = gsap.to(state, {
      progress: ASSEMBLED,
      duration: ASSEMBLE_SEC,
      ease: 'sine.inOut',
      onUpdate: () => api.current.render(state.progress),
    });
    return () => tween.kill();
  }, [ready, api]);

  // Первый показ шагов — и открываем заказ
  useEffect(() => {
    if (!ready || stage !== 'steps') return undefined;
    const timer = setTimeout(() => {
      emitMotion();
      setStage('order');
      setStepsOn(false);
    }, FIRST_STEPS_MS);
    return () => clearTimeout(timer);
  }, [ready, stage]);

  // Дальше шаги то проступают рядом с матрёшкой, то гаснут; заказ остаётся
  useEffect(() => {
    if (stage !== 'order') return undefined;
    const timer = stepsOn
      ? setTimeout(() => setStepsOn(false), STEPS_SHOW_MS)
      : setTimeout(() => {
          emitMotion();
          setRound((n) => n + 1);
          setStepsOn(true);
        }, STEPS_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [stage, stepsOn]);

  return (
    <section className={`scenario order-scene is-${stage} ${stepsOn ? 'steps-on' : ''}`}>
      <canvas ref={canvasRef} className="scenario__canvas order-scene__canvas" />

      {!ready && <LoadingFacts progressPct={progressPct} failed={failed} />}

      <SiteMenu />

      <div className="scenario__slides">
        <StepsSlide key={round} active={ready && stepsOn} />
      </div>

      <aside className="order-card" aria-hidden={stage !== 'order'}>
        <span className="order-card__kicker">Индивидуальный заказ</span>
        <h1>
          Матрёшка, которой <em>нет ни у кого</em>
        </h1>
        <p>
          Расскажите, для кого подарок: профессия, увлечения, любимые цвета, питомец.
          Мы придумаем образ, согласуем его с вами и распишем вручную.
        </p>
        <button type="button" className="order-card__cta" onClick={() => setConfirming(true)}>
          Написать в ВК
        </button>
        <img className="decor decor--malachite decor-order" src="/img/lizard-plaque.webp" alt="" aria-hidden="true" />
      </aside>

      <BackHome />

      {confirming && <VkConfirm kind="custom" href={VK_DIALOG} onClose={closeConfirm} />}
    </section>
  );
}
