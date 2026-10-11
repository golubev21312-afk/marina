import { AnimatePresence, motion } from 'motion/react';
import BrandMark from './BrandMark';
import { useTypewriter } from './useTypewriter';

/** Печатаются только заметные строки — остальное проявляется само, чтобы не ждать. */
const TYPED_LINES = [
  'Крафт',
  'когда подарок должен быть особенным',
  'Мастерская «Крафт» — эксклюзивные подарки ручной работы',
];

const PARAGRAPHS = [
  'Это место, где дерево обретает вторую жизнь, а ручная роспись превращает его в уникальный подарок.',
  'Мы специализируемся на создании авторских изделий из дерева. Шлифуем, расписываем вручную — без конвейера и штампов. Каждая вещь хранит тепло рук мастера и энергию живого материала.',
];

/** Курсор виден, только пока строку набирают. */
function Typed({ text, count, className, tag: Tag = 'div' }) {
  const active = count > 0 && count < text.length;
  return (
    <Tag className={className}>
      {text.slice(0, count)}
      {active && <span className="caret" aria-hidden="true" />}
    </Tag>
  );
}

/** Титульный экран: знак и текст о мастерской. */
export default function IntroSlide({ active }) {
  const { typed, done } = useTypewriter(TYPED_LINES, active);

  return (
    <div className={`slide ${active ? 'is-active' : ''}`}>
      <BrandMark />

      <Typed tag="h1" text={TYPED_LINES[0]} count={typed[0]} />
      <Typed className="slide__sub" text={TYPED_LINES[1]} count={typed[1]} />
      <Typed tag="h2" text={TYPED_LINES[2]} count={typed[2]} />

      {/* Абзацы не печатаем — их долго читать по буквам */}
      <AnimatePresence>
        {done && (
          <motion.div
            className="slide__body"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 0.8, 0.25, 1] }}
          >
            {PARAGRAPHS.map((text, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.16, ease: [0.22, 0.8, 0.25, 1] }}
              >
                {text}
              </motion.p>
            ))}

            <motion.div
              className="slide__closing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Деревянные чудеса, расписанные вручную.
              <br />
              Твоя уникальная история.
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
