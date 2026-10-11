import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import facts from '../data/facts.json';
import './LoadingFacts.css';

/** Сколько висит один факт — успеть прочитать две строки. */
const SHOW_MS = 5500;

/** Экран загрузки: пока грузится модель, листаются факты про изделия. */
export default function LoadingFacts({ progressPct, failed }) {
  // Начинаем со случайного — при повторном заходе факт другой
  const [index, setIndex] = useState(() => Math.floor(Math.random() * facts.length));

  useEffect(() => {
    if (failed) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % facts.length), SHOW_MS);
    return () => clearInterval(timer);
  }, [failed]);

  const fact = facts[index];

  return (
    <div className="scenario__loading">
      {failed ? (
        <div>не удалось загрузить матрёшку — обновите страницу</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            className="fact"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.22, 0.8, 0.25, 1] }}
          >
            <figcaption className="fact__topic">{fact.topic} · знаете ли вы</figcaption>
            <p className="fact__text">{fact.text}</p>
          </motion.figure>
        </AnimatePresence>
      )}

      <div className="scenario__bar" aria-label={`Загрузка ${progressPct}%`}>
        <div className="scenario__bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}
