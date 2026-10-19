import { useEffect, useRef, useState } from 'react';

/**
 * Перетаскивание строк списка за ручку ⠿ — мышью и пальцем (pointer
 * events: обычное HTML-перетаскивание на телефоне не работает).
 * Пока тянут, строка переезжает по списку на место под пальцем;
 * отпустили — onDrop(новый порядок записей).
 *   shown     — записи в порядке, который сейчас на экране
 *   handle(id), rowRef(id) — пропсы для ручки и строки
 *   draggingId — какую строку тянут (для подсветки)
 * Движение слушаем на всём окне: строка при переезде заново встаёт
 * в список, и захват указателя на ручке браузер при этом теряет.
 */
export function useDragOrder(items, onDrop) {
  const [drag, setDrag] = useState(null); // { id, order: [id…] }
  const rows = useRef(new Map());
  const latest = useRef({ drag, items, onDrop });
  useEffect(() => {
    latest.current = { drag, items, onDrop };
  });

  const byId = new Map(items.map((item) => [item.id, item]));
  const shown = drag ? drag.order.map((id) => byId.get(id)).filter(Boolean) : items;
  const dragging = drag !== null;

  useEffect(() => {
    if (!dragging) return undefined;

    const move = (event) => {
      const current = latest.current.drag;
      if (!current) return;
      // Место — перед первой строкой, чья середина ниже пальца
      const others = current.order.filter((id) => id !== current.id);
      let index = others.findIndex((id) => {
        const box = rows.current.get(id)?.getBoundingClientRect();
        return box && event.clientY < box.top + box.height / 2;
      });
      if (index === -1) index = others.length;
      const order = [...others];
      order.splice(index, 0, current.id);
      if (order.join() !== current.order.join()) setDrag({ ...current, order });
    };

    const end = () => {
      const { drag: current, items: list, onDrop: drop } = latest.current;
      setDrag(null);
      if (!current || current.order.join() === list.map((item) => item.id).join()) return;
      const lookup = new Map(list.map((item) => [item.id, item]));
      drop(current.order.map((id) => lookup.get(id)).filter(Boolean));
    };

    const cancel = () => setDrag(null);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [dragging]);

  return {
    shown,
    draggingId: drag?.id ?? null,
    handle: (id) => ({
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setDrag({ id, order: items.map((item) => item.id) });
      },
    }),
    rowRef: (id) => (element) => {
      if (element) rows.current.set(id, element);
      else rows.current.delete(id);
    },
  };
}
