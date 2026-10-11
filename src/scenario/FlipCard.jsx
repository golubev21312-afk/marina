/**
 * Карточка изделия: спереди фото, на обороте история.
 * Позицию в веере задаёт `offset` — ноль у активной, дальше по кругу.
 */
export default function FlipCard({ item, offset, layer, flipped, onSelect }) {
  const distance = Math.abs(offset);
  const storyLength = item.paragraphs.join(' ').length;

  return (
    <button
      type="button"
      className={`prod-card ${flipped ? 'is-flipped' : ''}`}
      data-active={distance === 0}
      tabIndex={distance > 2 ? -1 : 0}
      onClick={onSelect}
      style={{
        '--offset': offset,
        '--depth': distance,
        '--scale': Math.max(1 - distance * 0.11, 0.55),
        '--fade': distance > 2 ? 0 : 1 - distance * 0.28,
        '--layer': layer,
        pointerEvents: distance > 2 ? 'none' : 'auto',
      }}
    >
      <span className="prod-card__inner">
        <span className="face face--front">
          <span className="thumb">
            <img src={item.photo} alt="" loading="lazy" />
          </span>
          <span className="body">
            <span className="name">{item.title}</span>
          </span>
        </span>

        <span className="face face--back">
          <span className="name">{item.title}</span>
          {/* Кегль зависит от объёма истории — так она влезает без прокрутки */}
          <span className="story" style={{ '--len': storyLength }}>
            {item.paragraphs.map((para, i) => (
              <span className="para" key={i}>
                {para}
              </span>
            ))}
          </span>
        </span>
      </span>
    </button>
  );
}
