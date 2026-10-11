import { useEffect, useRef, useState } from 'react';

/** Сколько миллисекунд на знак: примерно 16 знаков в секунду — темп спокойного чтения. */
const SPEED = 62;

/** Пауза после точки — фраза не слипается со следующей. */
const PAUSE_AFTER_SENTENCE = 300;

/**
 * Печатает строки по очереди, как на машинке.
 *
 * @param lines   массив строк
 * @param enabled печатать или сразу показать всё целиком
 * @returns { typed, done, lineIndex } — сколько знаков набрано в каждой строке
 */
export function useTypewriter(lines, enabled) {
  const [typed, setTyped] = useState(() => lines.map(() => 0));
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Сцену перелистнули назад — начинаем набор заново.
      // Сбрасываем только если было что сбрасывать, иначе лишний рендер.
      setTyped((current) => (current.some(Boolean) ? lines.map(() => 0) : current));
      setDone((current) => (current ? false : current));
      clearTimeout(timer.current);
      return undefined;
    }

    let line = 0;
    let char = 0;
    const counts = lines.map(() => 0);

    const tick = () => {
      if (line >= lines.length) {
        setDone(true);
        return;
      }

      const text = lines[line];
      char += 1;
      counts[line] = char;
      setTyped([...counts]);

      // После точки притормаживаем, между строками — тоже
      const justTyped = text[char - 1];
      let delay = SPEED;
      if (/[.!?]/.test(justTyped)) delay += PAUSE_AFTER_SENTENCE;

      if (char >= text.length) {
        line += 1;
        char = 0;
        delay += 260;
      }

      timer.current = setTimeout(tick, delay);
    };

    timer.current = setTimeout(tick, 380);
    return () => clearTimeout(timer.current);
  }, [enabled, lines]);

  return { typed, done };
}

/** Полное время набора — по нему выставляется длительность сцены. */
export function typingDuration(lines) {
  const chars = lines.join('').length;
  const sentences = lines.join(' ').split(/[.!?]/).length - 1;
  return 380 + chars * SPEED + sentences * PAUSE_AFTER_SENTENCE + lines.length * 260;
}
