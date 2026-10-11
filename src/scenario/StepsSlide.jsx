import { motion } from 'motion/react';
import './StepsSlide.css';

/** Как рождается изделие — текст заказчика, десять шагов. */
const STEPS = [
  'Берём округлую форму',
  'Выбираем цветовую гамму',
  'Подбираем outfit',
  'Выбираем причёску',
  'Добавляем цвет глаз',
  'Наносим румянец на щёки',
  'Прорисовываем ручки',
  'Украшаем наряд',
  'Вкладываем в руки её символ',
  'Собираем всё вместе',
];

/**
 * Подписи ждут, пока матрёшка почти соберётся, и только потом проступают,
 * иначе между сборкой и текстом получается пустая пауза.
 */
const START_DELAY = 2.6;
const STAGGER = 0.12;

/** Проступает из дымки: размытое пятно собирается в чёткую подпись. */
function Step({ text, index, side, active }) {
  return (
    <motion.li
      initial={{ opacity: 0, filter: 'blur(6px)', y: 16, scale: 0.94 }}
      animate={
        active
          ? { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }
          : { opacity: 0, filter: 'blur(6px)', y: 16, scale: 0.94 }
      }
      transition={{
        duration: 0.85,
        delay: active ? START_DELAY + index * STAGGER : 0,
        ease: [0.22, 0.8, 0.25, 1],
      }}
      className={side === 'left' ? 'steps__item steps__item--left' : 'steps__item'}
    >
      <span className="steps__num">{index + 1}</span>
      <span className="steps__text">{text}</span>
    </motion.li>
  );
}

export default function StepsSlide({ active }) {
  return (
    <div className={`slide slide--steps ${active ? 'is-active' : ''}`}>
      <ol className="steps steps--left">
        {STEPS.slice(0, 5).map((text, i) => (
          <Step key={text} text={text} index={i} side="left" active={active} />
        ))}
      </ol>

      <ol className="steps steps--right">
        {STEPS.slice(5).map((text, i) => (
          <Step key={text} text={text} index={i + 5} side="right" active={active} />
        ))}
      </ol>
    </div>
  );
}
