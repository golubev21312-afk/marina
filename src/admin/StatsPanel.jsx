import { useCallback, useEffect, useMemo, useState } from 'react';
import { pb } from '../lib/pb';
import { useCategories } from '../lib/categories';
import { useProducts } from '../lib/products';
import { failText } from './failText';

/**
 * Статистика посещений — из коллекции visits (lib/track.js пишет её на сайте).
 * Грузим последние 30 дней одним списком и считаем здесь же: за день,
 * 7 или 30 дней. Время — по часам телефона/компьютера Марины.
 */
const PERIODS = [
  { id: 1, title: 'Сегодня' },
  { id: 7, title: '7 дней' },
  { id: 30, title: '30 дней' },
];

const PAGES = { '/': 'Главная', '/catalog': 'Каталог', '/about': 'О мастерской', '/order': 'Индивидуальный заказ' };
const SOURCES = {
  vk: 'ВКонтакте',
  yandex: 'Яндекс',
  google: 'Google',
  direct: 'Напрямую — по ссылке или из закладок',
  other: 'Другие сайты',
};
const VK = { order: 'Заказать изделие', custom: 'Индивидуальный заказ', community: 'Сообщество мастерской' };

const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysAgo = (n) => {
  const d = dayStart(new Date());
  d.setDate(d.getDate() - n);
  return d;
};
// База отдаёт время как «2026-10-12 08:15:00.000Z»
const toDate = (value) => new Date(value.replace(' ', 'T'));
const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const people = (n) => plural(n, 'человек', 'человека', 'человек');
const views = (n) => plural(n, 'просмотр', 'просмотра', 'просмотров');
const times = (n) => plural(n, 'раз', 'раза', 'раз');

/** Подсчёт по ключу → [{ key, label, count }] по убыванию. */
function countBy(list, keyOf, labelOf = (k) => k) {
  const map = new Map();
  for (const item of list) {
    const key = keyOf(item);
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map].map(([key, count]) => ({ key, label: labelOf(key), count })).sort((a, b) => b.count - a.count);
}

/** Посещения за 30 дней и дата самой первой записи (с какого дня копится статистика). */
async function fetchVisits() {
  const records = await pb.collection('visits').getFullList({
    filter: pb.filter('created >= {:from}', { from: daysAgo(29) }),
    fields: 'kind,path,section,product,vk,visitor,entry,source,ref,device,created',
    sort: 'created',
    batch: 1000,
  });
  const first = await pb.collection('visits').getList(1, 1, { sort: 'created', fields: 'created', skipTotal: true });
  return {
    visits: records.map((r) => ({ ...r, at: toDate(r.created) })),
    since: first.items[0] ? toDate(first.items[0].created) : null,
  };
}

/** Столбики: сколько человек по дням (за сегодня — по часам). */
function VisitorsChart({ bars }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const step = bars.length > 14 ? 5 : bars.length > 8 ? 3 : 1; // подписи — не под каждым столбиком
  return (
    <figure className="stats-chart">
      <figcaption className="admin-label">Сколько человек заходило</figcaption>
      <div className="stats-chart__plot">
        <span className="stats-chart__max">{max}</span>
        <div className="stats-chart__bars">
          {bars.map((bar, i) => (
            <div
              key={bar.key}
              className="stats-chart__col"
              tabIndex={0}
              aria-label={`${bar.full}: ${bar.value} ${people(bar.value)}`}
            >
              <span className="stats-chart__bar" style={{ height: `${(bar.value / max) * 100}%` }} />
              <span className="stats-chart__tip" role="tooltip">
                <b>{bar.value}</b> {people(bar.value)}
                <br />
                {bar.full}
              </span>
              {(i % step === 0 || i === bars.length - 1) && <span className="stats-chart__x">{bar.short}</span>}
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

/** Список «что чаще» с полоской длиной по количеству. */
function TopList({ title, rows, unit, limit = 10 }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="stats-list">
      <h3 className="admin-label">{title}</h3>
      {rows.length === 0 ? (
        <p className="admin-hint">Пока нет данных</p>
      ) : (
        <ol>
          {rows.slice(0, limit).map((row) => (
            <li key={row.key}>
              <span className="stats-list__label">{row.label}</span>
              <span className="stats-list__count">
                {row.count} <small>{unit(row.count)}</small>
              </span>
              <span className="stats-list__bar" style={{ width: `${(row.count / max) * 100}%` }} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function StatsPanel() {
  const { items: categories } = useCategories();
  const { items: products } = useProducts();
  const [visits, setVisits] = useState(null); // null — ещё грузим
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(7);
  const [since, setSince] = useState(null); // дата самой первой записи

  const load = useCallback(
    () =>
      fetchVisits().then(
        (data) => {
          setVisits(data.visits);
          setSince(data.since);
          setError('');
        },
        (err) => {
          setError(failText(err, 'загрузить статистику'));
          setVisits((v) => v ?? []);
        },
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    if (!visits) return null;
    const list = visits.filter((v) => v.at >= daysAgo(period - 1));
    const pages = list.filter((v) => v.kind === 'page');
    const vk = list.filter((v) => v.kind === 'vk');
    const entries = list.filter((v) => v.entry);

    // Устройство человека — по первому его событию за период
    const devices = new Map();
    for (const v of list) if (!devices.has(v.visitor)) devices.set(v.visitor, v.device);

    // Столбики: за сегодня — по часам до текущего, иначе по дням
    const unique = (from, to) => new Set(list.filter((v) => v.at >= from && v.at < to).map((v) => v.visitor)).size;
    const bars =
      period === 1
        ? Array.from({ length: new Date().getHours() + 1 }, (_, h) => {
            const from = new Date(daysAgo(0).getTime() + h * 3600e3);
            return {
              key: h,
              value: unique(from, new Date(from.getTime() + 3600e3)),
              short: `${h}:00`,
              full: `сегодня с ${h}:00 до ${h + 1}:00`,
            };
          })
        : Array.from({ length: period }, (_, i) => {
            const from = daysAgo(period - 1 - i);
            return {
              key: from.getTime(),
              value: unique(from, daysAgo(period - 2 - i)),
              short: from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' }),
              full: from.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }),
            };
          });

    const categoryTitle = (slug) => categories.find((c) => c.slug === slug)?.title ?? `«${slug}» — раздел удалён`;
    const productTitle = (id) => products.find((p) => p.id === id)?.title ?? 'Изделие удалено';
    const otherSites = countBy(
      entries.filter((v) => v.source === 'other'),
      (v) => v.ref,
    )
      .slice(0, 3)
      .map((r) => r.label)
      .join(', ');

    return {
      people: new Set(list.map((v) => v.visitor)).size,
      views: pages.length,
      vk: vk.length,
      vkBy: countBy(vk, (v) => v.vk, (k) => VK[k] ?? k),
      bars,
      sections: countBy(
        list.filter((v) => v.section),
        (v) => v.section,
        categoryTitle,
      ),
      products: countBy(
        pages.filter((v) => v.product),
        (v) => v.product,
        productTitle,
      ),
      pages: countBy(
        pages,
        (v) => (v.path.startsWith('/izdelie/') ? '/izdelie' : v.path),
        (k) => (k === '/izdelie' ? 'Страницы изделий' : (PAGES[k] ?? k)),
      ),
      sources: countBy(
        entries,
        (v) => v.source,
        (k) => (k === 'other' && otherSites ? `${SOURCES.other}: ${otherSites}` : (SOURCES[k] ?? k)),
      ),
      devices: countBy([...devices.values()], (d) => d, (d) => (d === 'mobile' ? 'С телефона' : 'С компьютера')),
    };
  }, [visits, period, categories, products]);

  return (
    <div className="stats">
      <div className="stats-top">
        <div className="stats-periods" role="group" aria-label="Период">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>
              {p.title}
            </button>
          ))}
        </div>
        <button type="button" className="admin-btn" onClick={load}>
          Обновить
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {!stats && <p className="admin-empty">Загружаем…</p>}

      {stats && (
        <>
          <div className="stats-tiles">
            <div className="stats-tile">
              <span className="stats-tile__value">{stats.people}</span>
              <span className="stats-tile__label">{plural(stats.people, 'посетитель', 'посетителя', 'посетителей')}</span>
            </div>
            <div className="stats-tile">
              <span className="stats-tile__value">{stats.views}</span>
              <span className="stats-tile__label">{views(stats.views)} страниц</span>
            </div>
            <div className="stats-tile">
              <span className="stats-tile__value">{stats.vk}</span>
              <span className="stats-tile__label">{times(stats.vk)} перешли в ВК</span>
            </div>
          </div>
          <p className="admin-hint">
            Посетитель — один телефон или компьютер: зашёл с обоих — посчитается дважды. Ваши заходы, пока вы
            вошли в админку, не считаются.
            {since && ` Статистика собирается с ${since.toLocaleDateString('ru-RU')}.`}
          </p>

          <VisitorsChart bars={stats.bars} />

          <div className="stats-grid">
            <TopList title="Разделы каталога" rows={stats.sections} unit={views} />
            <TopList title="Изделия — чаще смотрят" rows={stats.products} unit={views} />
            <TopList title="Зачем переходили в ВК" rows={stats.vkBy} unit={times} />
            <TopList title="Страницы сайта" rows={stats.pages} unit={views} />
            <TopList title="Откуда пришли" rows={stats.sources} unit={times} />
            <TopList title="С чего заходят" rows={stats.devices} unit={people} />
          </div>
        </>
      )}
    </div>
  );
}
