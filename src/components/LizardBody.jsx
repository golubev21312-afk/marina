/**
 * Ящерица вид сверху, со «скелетом»: тело, шея с головой и пять звеньев
 * хвоста вложены друг в друга и поворачиваются каждое в своём суставе —
 * так по телу бежит волна, как у живой ящерицы. Лапы с локтями,
 * пятипалые, ставятся диагональными парами.
 *
 * Координаты: таз в (0, 0), голова смотрит вправо (+x). Анимации — в Lizards.css.
 */

/** Звенья хвоста: длина и полуширина в начале звена (к кончику сужаются). */
const TAIL = [
  { len: 17, w: 5.6 },
  { len: 17, w: 4.3 },
  { len: 17, w: 3.1 },
  { len: 17, w: 2.0 },
  { len: 18, w: 1.1 },
];

const HEAD =
  'M-4 -5.2 C 2 -5.6, 6 -6.6, 12 -6.8 C 19 -6.6, 25 -4.6, 30 -1.6 C 31.3 -0.6, 31.3 0.6, 30 1.6 C 25 4.6, 19 6.6, 12 6.8 C 6 6.6, 2 5.6, -4 5.2 Z';

function TailChain({ index = 0 }) {
  if (index >= TAIL.length) return null;
  const { len, w } = TAIL[index];
  const next = TAIL[index + 1]?.w ?? 0.2;

  return (
    <g className={`lz-tail lz-tail--${index}`}>
      {/* Звено: сужающаяся капсула; кружок в суставе прячет стык */}
      <path
        d={`M0 ${-w} C ${-len * 0.5} ${-w}, ${-len * 0.7} ${-next}, ${-len} ${-next} L ${-len} ${next} C ${-len * 0.7} ${next}, ${-len * 0.5} ${w}, 0 ${w} Z`}
        fill="url(#lz-skin)"
      />
      <circle r={w} fill="url(#lz-skin)" />
      <path
        d={`M0 ${-w} C ${-len * 0.5} ${-w}, ${-len * 0.7} ${-next}, ${-len} ${-next} L ${-len} ${next} C ${-len * 0.7} ${next}, ${-len * 0.5} ${w}, 0 ${w} Z`}
        fill="url(#lz-speckle)"
      />
      <g transform={`translate(${-len} 0)`}>
        <TailChain index={index + 1} />
      </g>
    </g>
  );
}

/**
 * Лапа в своих координатах: крепление в (0, 0), лапа уходит в −y (левая сторона).
 * forward: 1 — передняя (предплечье вперёд), −1 — задняя (голень назад).
 */
function Leg({ forward, className }) {
  const knee = [forward * 1.5, -8.5];
  const foot = [knee[0] + forward * 6.5, knee[1] - 4.5];
  // Пять пальцев веером (угол от +x, «наружу» — это −y). У передних лап
  // пальцы смотрят вперёд-наружу, у задних — назад-наружу; средний длиннее
  const fan = forward > 0 ? [-105, -78, -52, -26, 0] : [-75, -102, -128, -154, -180];
  const toes = fan.map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const l = i === 2 || i === 3 ? 4.2 : 3.2;
    return `M${foot[0]} ${foot[1]} l${(Math.cos(a) * l).toFixed(2)} ${(Math.sin(a) * l).toFixed(2)}`;
  });

  return (
    <g className={className}>
      <path d={`M0 0 L${knee[0]} ${knee[1]}`} className="lz-limb lz-limb--upper" />
      <path d={`M${knee[0]} ${knee[1]} L${foot[0]} ${foot[1]}`} className="lz-limb lz-limb--lower" />
      <path d={toes.join(' ')} className="lz-limb lz-limb--toes" />
    </g>
  );
}

export default function LizardBody({ royal }) {
  return (
    <svg viewBox="-98 -27 162 54" className="lizard__svg">
      <defs>
        {/* Изумрудная ящерица: тёмные бока, светлая спина */}
        <linearGradient id="lz-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b4a2a" />
          <stop offset="0.3" stopColor="#1f8a4c" />
          <stop offset="0.5" stopColor="#4cc07a" />
          <stop offset="0.7" stopColor="#1f8a4c" />
          <stop offset="1" stopColor="#0b4a2a" />
        </linearGradient>
        {/* Крапинки: чёрные и золотистые, как у настоящей зелёной ящерицы */}
        <pattern id="lz-speckle" width="7" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.1" r="0.55" fill="#04210f" opacity="0.8" />
          <circle cx="4.6" cy="3.9" r="0.45" fill="#d9ec8a" opacity="0.75" />
          <circle cx="2.8" cy="4.6" r="0.35" fill="#04210f" opacity="0.6" />
          <circle cx="6.1" cy="0.9" r="0.3" fill="#04210f" opacity="0.5" />
        </pattern>
        <linearGradient id="lz-crown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbe3a0" />
          <stop offset="0.5" stopColor="#e2b458" />
          <stop offset="1" stopColor="#9c6a22" />
        </linearGradient>
      </defs>

      <g className="lz-body">
        {/* Задние лапы — у таза */}
        <g transform="translate(1 -4.5)">
          <Leg forward={-1} className="lz-leg lz-leg--hl" />
        </g>
        <g transform="translate(1 4.5) scale(1 -1)">
          <Leg forward={-1} className="lz-leg lz-leg--hr" />
        </g>

        <TailChain />

        {/* Передние лапы — у плеч */}
        <g transform="translate(25 -5)">
          <Leg forward={1} className="lz-leg lz-leg--fl" />
        </g>
        <g transform="translate(25 5) scale(1 -1)">
          <Leg forward={1} className="lz-leg lz-leg--fr" />
        </g>

        {/* Туловище: шире к середине, от таза к плечам */}
        <path
          d="M-3 -5.6 C 5 -8.4, 19 -8.6, 29 -6 L 29 6 C 19 8.6, 5 8.4, -3 5.6 Z"
          fill="url(#lz-skin)"
        />
        <path
          d="M-3 -5.6 C 5 -8.4, 19 -8.6, 29 -6 L 29 6 C 19 8.6, 5 8.4, -3 5.6 Z"
          fill="url(#lz-speckle)"
        />
        {/* Светлая полоска вдоль хребта */}
        <path d="M-2 0 L 28 0" stroke="#9fe0b4" strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />

        {/* Шея и голова — отдельный сустав у плеч */}
        <g transform="translate(28 0)">
          <g className="lz-neck">
          <g className="lz-head">
            {/* Голова клином: узкая шея, шире всего на челюстях, округлая морда */}
            <path d={HEAD} fill="url(#lz-skin)" />
            <path d={HEAD} fill="#2fb3a0" opacity="0.2" />
            <path d={HEAD} fill="url(#lz-speckle)" opacity="0.6" />
            {/* Щитки на темени — чуть светлее */}
            <path d="M6 -2.6 L 20 -1.4 L 20 1.4 L 6 2.6 Z" fill="#8fe6c2" opacity="0.16" />
            {/* Глаза по бокам головы, с тонким золотистым ободком; ноздри */}
            <circle cx="16.5" cy="-5.1" r="1.25" fill="#b8913e" />
            <circle cx="16.7" cy="-5.1" r="0.9" fill="#040c08" />
            <circle cx="16.5" cy="5.1" r="1.25" fill="#b8913e" />
            <circle cx="16.7" cy="5.1" r="0.9" fill="#040c08" />
            <circle cx="28.6" cy="-1" r="0.35" fill="#062015" />
            <circle cx="28.6" cy="1" r="0.35" fill="#062015" />

            {royal && (
              <g>
                {/* Корона Хозяйки: обруч с тремя зубцами вперёд и малахитовым камнем */}
                <path
                  d="M3.5 -4.4 L6 -4.4 L11.4 -5.8 L9 -2.1 L14.2 0 L9 2.1 L11.4 5.8 L6 4.4 L3.5 4.4 Q2.3 0 3.5 -4.4 Z"
                  fill="url(#lz-crown)"
                  stroke="#7a5418"
                  strokeWidth="0.45"
                  strokeLinejoin="round"
                />
                <circle cx="6.4" cy="0" r="1.4" fill="#1f9e6a" stroke="#0b4a31" strokeWidth="0.4" />
                <circle cx="6" cy="-0.45" r="0.42" fill="#bff0d6" opacity="0.8" />
              </g>
            )}
          </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
