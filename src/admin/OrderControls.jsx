/** Кнопки порядка: ↑, ручка ⠿ для перетаскивания, ↓. */
export default function OrderControls({ index, count, busy, onMove, handle }) {
  return (
    <div className="admin-order">
      <button type="button" aria-label="Выше" disabled={busy || index === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      {handle && (
        <span className="admin-drag" title="Перетащите, чтобы поменять порядок" aria-hidden="true" {...handle}>
          ⠿
        </span>
      )}
      <button type="button" aria-label="Ниже" disabled={busy || index === count - 1} onClick={() => onMove(1)}>
        ↓
      </button>
    </div>
  );
}
