import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import facts from '../data/facts.json';
import './SectionNote.css';

/** Факты раздела сменяют друг друга сами; на «Все» — факты всех разделов. */
const ROTATE_MS = 10000;

/**
 * Плашка над вкладками каталога: факт о разделе (из фактов экрана загрузки,
 * тема = название раздела), а если фактов нет — короткое описание раздела.
 * `turn` — сколько раз выбирали вкладки: при каждом выборе факт следующий.
 */
export default function SectionNote({ section, categories, turn }) {
  const isAll = section.id === 'all';
  const [tick, setTick] = useState(0);

  // Отсчёт заново при смене раздела — новый факт висит полные 10 секунд
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, [section.id, turn]);

  const pool = isAll ? facts : facts.filter((fact) => fact.topic === section.title);
  const fact = pool.length > 0 ? pool[(turn + tick) % pool.length] : null;
  // Нет фактов о разделе — описание раздела из админки
  const text = fact?.text ?? section.description;

  if (!text) return null;

  // Приписка заказчика к разделу, например «прогулки по Тагилу, тагильский характер»
  const topic = fact?.topic ?? section.title;
  const subtitle = categories.find((category) => category.title === topic)?.subtitle;

  return (
    <div className="section-note">
      <AnimatePresence mode="wait">
        <motion.figure
          key={`${section.id}-${turn}-${tick}`}
          className="section-note__inner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 0.8, 0.25, 1] }}
        >
          <figcaption>
            {fact ? `${fact.topic} · знаете ли вы` : section.title}
            {subtitle && <span className="section-note__sub">{subtitle}</span>}
          </figcaption>
          <p>{text}</p>
        </motion.figure>
      </AnimatePresence>
    </div>
  );
}
