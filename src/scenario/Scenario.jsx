import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import IntroSlide from './IntroSlide';
import LoadingFacts from './LoadingFacts';
import Showcase from './Showcase';
import { useMatryoshka } from './useMatryoshka';
import { SCENES, useStoryTimeline } from './useStoryTimeline';
import './Scenario.css';

/** Начиная с этой точки шкалы матрёшка уже раскрылась и можно показать карусель. */
const SHOWCASE_FROM = 0.7;

/** Факт на загрузке показываем всегда — даже если модель уже в кэше. Время на прочтение. */
const MIN_FACT_MS = 5000;

export default function Scenario() {
  const canvasRef = useRef(null);
  const { api, ready, progressPct, failed } = useMatryoshka(canvasRef);
  const [showcaseShown, setShowcaseShown] = useState(false);
  // Вернулись со страницы сайта — сразу к карусели, без факта: модель уже в кэше
  const toShowcase = useLocation().state?.toShowcase === true;
  const [factRead, setFactRead] = useState(toShowcase);

  useEffect(() => {
    if (toShowcase) return undefined;
    const timer = setTimeout(() => setFactRead(true), MIN_FACT_MS);
    return () => clearTimeout(timer);
  }, [toShowcase]);

  const started = ready && factRead;

  // Кадры рисует three.js, React дёргаем только на смене состояния
  const handleProgress = useCallback((progress) => {
    api.current.render(progress);
    setShowcaseShown(progress > SHOWCASE_FROM);
  }, [api]);

  const countdownRef = useRef(null);
  const { scene, goTo, step, stopAuto } = useStoryTimeline({
    countdownRef,
    enabled: started,
    onProgress: handleProgress,
    startScene: toShowcase ? SCENES.length - 1 : undefined,
  });

  return (
    <section className="scenario">
      <canvas ref={canvasRef} className="scenario__canvas" />

      {!started && <LoadingFacts progressPct={progressPct} failed={failed} />}

      {/* Полоска отсчёта до следующей сцены */}
      <div ref={countdownRef} className="scenario__countdown" />

      {/* Украшения первого экрана. «Белая»: две разные матрёшки по краям,
          смотрят к центру. «Малахит»: Хозяйка Медной горы слева, ящерка справа */}
      <div className={`decor-intro ${scene === 0 ? 'is-on' : ''}`} aria-hidden="true">
        <img className="decor decor--kraft decor-intro__mat decor-intro__mat--left" src="/img/decor-matryoshka.webp" alt="" />
        <img className="decor decor--kraft decor-intro__mat decor-intro__mat--right" src="/img/decor-hozyayka-faces-left.webp" alt="" />
        <img className="decor decor--malachite decor-intro__mat decor-intro__mat--left" src="/img/decor-hozyayka-faces-right.webp" alt="" />
        <img className="decor decor--malachite decor-intro__lizard" src="/img/lizard-plaque.webp" alt="" />
      </div>

      <div className="scenario__slides">
        <IntroSlide active={scene === 0} />
      </div>

      <Showcase shown={showcaseShown} />

      <div className="scenario__controls">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={scene <= 0}
          aria-label="Предыдущая сцена"
        >
          <svg viewBox="0 0 24 24">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        <div className="scenario__dots">
          {SCENES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={i === scene ? 'is-active' : ''}
              onClick={() => {
                stopAuto();
                goTo(i);
              }}
              aria-label={`Сцена ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={scene >= SCENES.length - 1}
          aria-label="Следующая сцена"
        >
          <svg viewBox="0 0 24 24">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
