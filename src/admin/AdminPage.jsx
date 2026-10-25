import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pb';
import { refreshProducts, STOCK, useAdminProducts } from '../lib/products';
import { missingInCard } from './completeness';
import SiteQr from './SiteQr';
import { downloadProductsExcel } from './productsExcel';
import { formatPrice } from '../lib/format';
import { useCategories } from '../lib/categories';
import CategoriesPanel from './CategoriesPanel';
import { saveList, saveOrder, useListAction } from './listActions';
import OrderControls from './OrderControls';
import { useDragOrder } from './useDragOrder';
import PasswordPanel from './PasswordPanel';
import { ForgotForm } from './PasswordReset';
import { TOO_FAST } from './failText';
import ShowcasePanel from './ShowcasePanel';
import ReviewsPanel from './ReviewsPanel';
import StatsPanel from './StatsPanel';
import ProductEditor from './ProductEditor';
import ProductTrash from './ProductTrash';
import './Admin.css';

/**
 * Вход: почта и пароль редактора (коллекция editors — права только на товары
 * и разделы). Браузер запоминает вход.
 */
function Login({ onDone, note }) {
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await pb.collection('editors').authWithPassword(email.trim(), password);
      onDone();
    } catch (err) {
      setError(
        err?.status === 0 ? 'Нет связи с сервером.' : err?.status === 429 ? TOO_FAST : 'Неверная почта или пароль.',
      );
      setBusy(false);
    }
  };

  if (forgot) return <ForgotForm onBack={() => setForgot(false)} />;

  return (
    <form className="admin-login" onSubmit={submit}>
      <h1>Мастерская «Крафт»</h1>
      <p>Вход для добавления товаров</p>
      {note && <p className="admin-hint">{note}</p>}
      <label className="admin-field">
        <span className="admin-label">Почта</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="admin-field">
        <span className="admin-label">Пароль</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="admin-error">{error}</p>}
      <button type="submit" className="admin-btn admin-btn--main" disabled={busy}>
        {busy ? 'Входим…' : 'Войти'}
      </button>
      <button type="button" className="admin-back admin-linkbtn" onClick={() => setForgot(true)}>
        Забыли пароль?
      </button>
      <Link className="admin-back" to="/">
        ← На сайт
      </Link>
    </form>
  );
}

/**
 * Админка /admin: Марина добавляет, меняет и удаляет товары.
 * Всё сохраняется в базу и сразу появляется в каталоге.
 */
/** «дописать: N» у товара в списке; что именно — в подсказке при наведении. */
const missingOf = (product) =>
  missingInCard({
    description: product.description,
    price: product.price,
    material: product.material,
    photoCount: product.files.length,
    stock: product.stock,
    leadTime: product.leadTime,
    occasions: product.occasions,
  });

function MissingNote({ product }) {
  const missing = missingOf(product);
  if (!missing.length) return null;
  return (
    <small className="admin-item__missing" title={`Можно дописать: ${missing.join('; ')}`}>
      дописать: {missing.length}
    </small>
  );
}

export default function AdminPage() {
  // Суперпользователь, вошедший раньше, тоже сюда пускается — права у него шире
  const [loginNote, setLoginNote] = useState('');
  const [authed, setAuthed] = useState(
    () => pb.authStore.isValid && (pb.authStore.isSuperuser || pb.authStore.record?.collectionName === 'editors'),
  );
  const { status, items } = useAdminProducts();
  const { items: categories } = useCategories();
  const categoryTitle = (id) => categories.find((c) => c.id === id)?.title ?? 'без раздела';
  const [tab, setTab] = useState('products'); // товары | разделы | главная | отзывы | статистика | пароль
  const [editing, setEditing] = useState(null); // null | 'new' | товар | { copyOf: товар }
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  // Фильтры списка: раздел и состояние (наличие, черновики, «не дописаны»)
  const [sectionFilter, setSectionFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  // Отмеченные галочками — для действий над несколькими товарами сразу
  const [picked, setPicked] = useState([]);
  const [bulkTrash, setBulkTrash] = useState(false);
  const { busy, error, run } = useListAction(refreshProducts);
  // Перетаскивание товаров — до раннего выхода: хуки вызываются всегда
  const drag = useDragOrder(items, (order) =>
    run('поменять порядок', async () => {
      await saveList('products', order);
      await refreshProducts();
    }),
  );

  if (!authed) return <div className="page admin"><Login note={loginNote} onDone={() => setAuthed(true)} /></div>;

  const logout = () => {
    pb.authStore.clear();
    setLoginNote('');
    setTab('products');
    setAuthed(false);
  };

  const passwordChanged = (stillIn) => {
    setTab('products');
    if (stillIn) return setNotice({ text: 'Пароль изменён. В следующий раз входите с новым.' });
    setLoginNote('Пароль изменён. Войдите с новым паролем.');
    setAuthed(false);
  };

  const saved = async (record, created) => {
    await refreshProducts();
    setEditing(null);
    const text = record.draft
      ? 'Черновик сохранён — на сайте его пока нет. Готово — нажмите «Показать».'
      : created
        ? 'Товар добавлен — он уже на сайте.'
        : 'Изменения сохранены.';
    setNotice({ text, id: record.id });
    window.scrollTo?.(0, 0);
  };

  const remove = (product) =>
    run('удалить', async () => {
      // Не стираем, а в корзину: 30 дней можно вернуть (см. ProductTrash)
      await pb.collection('products').update(product.id, { deleted: new Date().toISOString() });
      setDeleting(null);
      await refreshProducts();
      setNotice({ text: `«${product.title}» в корзине — вернуть можно 30 дней (внизу списка).` });
    });

  const publish = (product) =>
    run('показать', async () => {
      await pb.collection('products').update(product.id, { draft: false });
      await refreshProducts();
      setNotice({ text: `«${product.title}» теперь на сайте.`, id: product.id });
    });

  const setStock = (product, stock) =>
    run('сохранить', async () => {
      await pb.collection('products').update(product.id, { stock });
      await refreshProducts();
      setNotice({ text: `«${product.title}»: ${STOCK[stock].toLowerCase()}.` });
    });

  const move = (index, delta) =>
    run('поменять порядок', async () => {
      await saveOrder('products', items, index, delta);
      await refreshProducts();
    });

  // Поиск по названию и описанию; «ё» и «е» — одно и то же
  const norm = (text) => text.toLowerCase().replace(/ё/g, 'е');
  const needle = norm(query.trim());
  const fitsState = (p) =>
    stateFilter === 'draft'
      ? p.draft
      : stateFilter === 'missing'
        ? missingOf(p).length > 0
        : p.stock === stateFilter;
  const filtering = Boolean(needle || sectionFilter || stateFilter);
  const shown = items.filter(
    (p) =>
      (!needle || norm(p.title).includes(needle) || norm(p.description).includes(needle)) &&
      (!sectionFilter || p.categoryId === sectionFilter) &&
      (!stateFilter || fitsState(p)),
  );

  // Удалённые и пропавшие из списка — из отмеченных выпадают сами
  const pickedLive = picked.filter((id) => items.some((p) => p.id === id));
  const togglePick = (id) =>
    setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));

  /** Одно изменение — всем отмеченным; label — что сделали, для сообщения. */
  const bulk = (change, label) =>
    run('сохранить', async () => {
      for (const id of pickedLive) await pb.collection('products').update(id, change);
      await refreshProducts();
      setNotice({ text: `Готово: ${pickedLive.length} шт. — ${label}.` });
      setPicked([]);
      setBulkTrash(false);
    });

  return (
    <div className="page admin">
      <header className="admin-top">
        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'products'}
            onClick={() => {
              setTab('products');
              setNotice(null);
            }}
          >
            Товары{items.length ? ` · ${items.length}` : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'categories'}
            onClick={() => {
              setTab('categories');
              setEditing(null);
              setNotice(null);
            }}
          >
            Разделы{categories.length ? ` · ${categories.length}` : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'showcase'}
            onClick={() => {
              setTab('showcase');
              setEditing(null);
              setNotice(null);
            }}
          >
            Главная
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reviews'}
            onClick={() => {
              setTab('reviews');
              setEditing(null);
              setNotice(null);
            }}
          >
            Отзывы
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'stats'}
            onClick={() => {
              setTab('stats');
              setEditing(null);
              setNotice(null);
            }}
          >
            Статистика
          </button>
        </div>
        <nav>
          <Link to="/catalog">Открыть каталог</Link>
          <button type="button" onClick={() => setQrOpen(true)}>
            QR-код сайта
          </button>
          <button type="button" disabled={items.length === 0} onClick={() => downloadProductsExcel(items, categoryTitle)}>
            Товары в Excel
          </button>
          {pb.authStore.record?.collectionName === 'editors' && (
            <button
              type="button"
              onClick={() => {
                setTab('password');
                setEditing(null);
                setNotice(null);
              }}
            >
              Сменить пароль
            </button>
          )}
          <button type="button" onClick={logout}>
            Выйти
          </button>
        </nav>
      </header>

      {qrOpen && <SiteQr onClose={() => setQrOpen(false)} />}
      <main className="admin-main">
        {notice && (
          <div className="admin-notice" role="status">
            <span>{notice.text}</span>
            {notice.id && <Link to={`/izdelie/${notice.id}`}>Посмотреть на сайте</Link>}
            <button type="button" aria-label="Закрыть" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        )}

        {tab === 'password' ? (
          <PasswordPanel onDone={passwordChanged} onCancel={() => setTab('products')} />
        ) : tab === 'stats' ? (
          <StatsPanel />
        ) : tab === 'reviews' ? (
          <ReviewsPanel onNotice={(text) => setNotice({ text })} />
        ) : tab === 'showcase' ? (
          <ShowcasePanel onNotice={(text) => setNotice({ text })} />
        ) : tab === 'categories' ? (
          <CategoriesPanel onNotice={(text) => setNotice({ text })} />
        ) : editing ? (
          <ProductEditor
            key={editing === 'new' ? 'new' : editing.copyOf ? `copy-${editing.copyOf.id}` : editing.id}
            product={editing === 'new' || editing.copyOf ? null : editing}
            copyFrom={editing.copyOf}
            onSaved={saved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <button type="button" className="admin-btn admin-btn--main admin-add" onClick={() => setEditing('new')}>
              + Добавить товар
            </button>

            {items.length > 0 && (
              <label className="admin-search">
                <input
                  type="search"
                  aria-label="Найти товар"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Найти среди ${items.length} шт. — по названию или описанию`}
                />
              </label>
            )}
            {items.length > 0 && (
              <div className="admin-filters">
                <select aria-label="Раздел" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                  <option value="">Все разделы</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <select aria-label="Какие товары" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="">Все товары</option>
                  {Object.entries(STOCK).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                  <option value="draft">Черновики</option>
                  <option value="missing">Не дописаны</option>
                </select>
                {(sectionFilter || stateFilter) && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    onClick={() => {
                      setSectionFilter('');
                      setStateFilter('');
                    }}
                  >
                    Сбросить
                  </button>
                )}
              </div>
            )}
            {filtering && (
              <p className="admin-hint">Найдено: {shown.length}. Порядок меняется, когда поиск и фильтры пусты.</p>
            )}
            {error && <p className="admin-error">{error}</p>}

            {status === 'loading' && <p className="admin-empty">Загружаем…</p>}
            {status === 'ready' && items.length === 0 && (
              <p className="admin-empty">Товаров пока нет. Нажмите «Добавить товар» — это займёт минуту.</p>
            )}

            {pickedLive.length > 0 && (
              <div className="admin-bulk" role="region" aria-label="Действия с отмеченными">
                <strong>Отмечено: {pickedLive.length}</strong>
                <select
                  aria-label="Наличие для отмеченных"
                  value=""
                  disabled={busy}
                  onChange={(e) => bulk({ stock: e.target.value }, STOCK[e.target.value].toLowerCase())}
                >
                  <option value="">Наличие…</option>
                  {Object.entries(STOCK).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Раздел для отмеченных"
                  value=""
                  disabled={busy}
                  onChange={(e) => bulk({ category: e.target.value }, `в разделе «${categoryTitle(e.target.value)}»`)}
                >
                  <option value="">Перенести в раздел…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {bulkTrash ? (
                  <>
                    <span className="admin-item__ask">В корзину?</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={busy}
                      onClick={() => bulk({ deleted: new Date().toISOString() }, 'в корзине, вернуть можно 30 дней')}
                    >
                      Да
                    </button>
                    <button type="button" className="admin-btn" onClick={() => setBulkTrash(false)}>
                      Нет
                    </button>
                  </>
                ) : (
                  <button type="button" className="admin-btn admin-btn--ghost" disabled={busy} onClick={() => setBulkTrash(true)}>
                    В корзину
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setPicked(pickedLive.length === shown.length ? [] : shown.map((p) => p.id))}
                >
                  {pickedLive.length === shown.length ? 'Снять все' : 'Отметить все'}
                </button>
              </div>
            )}

            <ul className="admin-list">
              {(filtering ? shown : drag.shown).map((product, i) => (
                <li
                  key={product.id}
                  ref={drag.rowRef(product.id)}
                  className={`admin-item ${filtering ? '' : 'admin-item--ordered'} ${drag.draggingId === product.id ? 'is-dragging' : ''}`}
                >
                  {!filtering && (
                    <OrderControls
                      index={i}
                      count={items.length}
                      busy={busy}
                      onMove={(delta) => move(i, delta)}
                      handle={busy ? {} : drag.handle(product.id)}
                    />
                  )}
                  {product.small[0] ? <img src={product.small[0]} alt="" /> : <span className="admin-item__nophoto" />}
                  <div className="admin-item__info">
                    <label className="admin-pick">
                      <input
                        type="checkbox"
                        checked={pickedLive.includes(product.id)}
                        onChange={() => togglePick(product.id)}
                        aria-label={`Отметить «${product.title}»`}
                      />
                      <strong>{product.title}</strong>
                    </label>
                    <span>
                      {categoryTitle(product.categoryId)} · {product.price ? formatPrice(product.price) : 'цена по запросу'}
                    </span>
                    {product.draft && <em className="admin-item__draft">черновик — на сайте не виден</em>}
                    {product.stock !== 'in_stock' && <em>{STOCK[product.stock].toLowerCase()}</em>}
                    <MissingNote product={product} />
                  </div>
                  <div className="admin-item__actions">
                    {deleting === product.id ? (
                      <>
                        <span className="admin-item__ask">Удалить?</span>
                        <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={() => remove(product)}>
                          Да
                        </button>
                        <button type="button" className="admin-btn" onClick={() => setDeleting(null)}>
                          Нет
                        </button>
                      </>
                    ) : (
                      <>
                        {product.draft && (
                          <button type="button" className="admin-btn admin-btn--main" disabled={busy} onClick={() => publish(product)}>
                            Показать
                          </button>
                        )}
                        <button type="button" className="admin-btn" onClick={() => setEditing(product)}>
                          Изменить
                        </button>
                        <button type="button" className="admin-btn" onClick={() => setEditing({ copyOf: product })}>
                          Копировать
                        </button>
                        <select
                          className="admin-stock"
                          aria-label="Наличие"
                          value={product.stock}
                          disabled={busy}
                          onChange={(e) => setStock(product, e.target.value)}
                        >
                          {Object.entries(STOCK).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setDeleting(product.id)}>
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {!filtering && <ProductTrash onNotice={setNotice} />}
          </>
        )}
      </main>
    </div>
  );
}
