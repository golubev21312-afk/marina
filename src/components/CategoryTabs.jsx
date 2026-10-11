import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './CategoryTabs.css';

/**
 * Фильтр разделов: подсветка-пилюля переезжает к активной вкладке.
 * Референс № 3 / 13 (Navigation Tabs), палитра своя.
 */
export default function CategoryTabs({ tabs, active, onChange }) {
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);

  // Пилюлю позиционируем по реальным размерам кнопки — она зависит от длины слова
  useLayoutEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector('[data-active="true"]');
    if (!list || !current) return;

    const move = () =>
      setPill({
        left: current.offsetLeft,
        width: current.offsetWidth,
      });

    move();

    // Шрифты подгружаются позже вёрстки и сдвигают кнопки
    const observer = new ResizeObserver(move);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, tabs]);

  // Активная вкладка могла уехать за край на узком экране
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [active]);

  return (
    <div className="tabs" ref={listRef} role="tablist">
      {pill && (
        <span
          className="tabs__pill"
          style={{ '--pill-left': `${pill.left}px`, '--pill-width': `${pill.width}px` }}
          aria-hidden="true"
        />
      )}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          data-active={tab.id === active}
          className="tabs__tab"
          onClick={() => onChange(tab.id)}
        >
          {tab.title}
          {tab.count > 0 && <span className="tabs__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
