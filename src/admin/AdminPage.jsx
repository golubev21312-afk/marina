import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pb';
import { refreshProducts, STOCK, useProducts } from '../lib/products';
import { formatPrice } from '../lib/format';
import { useCategories } from '../lib/categories';
import CategoriesPanel from './CategoriesPanel';
import { saveOrder, useListAction } from './listActions';
import PasswordPanel from './PasswordPanel';
import { ForgotForm } from './PasswordReset';
import { TOO_FAST } from './failText';
import ShowcasePanel from './ShowcasePanel';
import StatsPanel from './StatsPanel';
import ProductEditor from './ProductEditor';
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
export default function AdminPage() {
  // Суперпользователь, вошедший раньше, тоже сюда пускается — права у него шире
  const [loginNote, setLoginNote] = useState('');
  const [authed, setAuthed] = useState(
    () => pb.authStore.isValid && (pb.authStore.isSuperuser || pb.authStore.record?.collectionName === 'editors'),
  );
  const { status, items } = useProducts();
  const { items: categories } = useCategories();
  const categoryTitle = (id) => categories.find((c) => c.id === id)?.title ?? 'без раздела';
  const [tab, setTab] = useState('products'); // товары | разделы | главная | статистика | пароль
  const [editing, setEditing] = useState(null); // null | 'new' | товар
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState('');
  const { busy, error, run } = useListAction(refreshProducts);

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
    setNotice({ text: created ? 'Товар добавлен — он уже на сайте.' : 'Изменения сохранены.', id: record.id });
    window.scrollTo?.(0, 0);
  };

  const remove = (product) =>
    run('удалить', async () => {
      await pb.collection('products').delete(product.id);
      setDeleting(null);
      await refreshProducts();
      setNotice({ text: `«${product.title}» удалён.` });
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
  const shown = needle
    ? items.filter((p) => norm(p.title).includes(needle) || norm(p.description).includes(needle))
    : items;

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
        ) : tab === 'showcase' ? (
          <ShowcasePanel onNotice={(text) => setNotice({ text })} />
        ) : tab === 'categories' ? (
          <CategoriesPanel onNotice={(text) => setNotice({ text })} />
        ) : editing ? (
          <ProductEditor
            key={editing === 'new' ? 'new' : editing.id}
            product={editing === 'new' ? null : editing}
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
            {needle && <p className="admin-hint">Найдено: {shown.length}. Порядок меняется, когда поиск пуст.</p>}
            {error && <p className="admin-error">{error}</p>}

            {status === 'loading' && <p className="admin-empty">Загружаем…</p>}
            {status === 'ready' && items.length === 0 && (
              <p className="admin-empty">Товаров пока нет. Нажмите «Добавить товар» — это займёт минуту.</p>
            )}

            <ul className="admin-list">
              {shown.map((product, i) => (
                <li key={product.id} className={`admin-item ${needle ? '' : 'admin-item--ordered'}`}>
                  {!needle && (
                    <div className="admin-order">
                      <button type="button" aria-label="Выше" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Ниже"
                        disabled={busy || i === items.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  {product.small[0] ? <img src={product.small[0]} alt="" /> : <span className="admin-item__nophoto" />}
                  <div className="admin-item__info">
                    <strong>{product.title}</strong>
                    <span>
                      {categoryTitle(product.categoryId)} · {product.price ? formatPrice(product.price) : 'цена по запросу'}
                    </span>
                    {product.stock !== 'in_stock' && <em>{STOCK[product.stock].toLowerCase()}</em>}
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
                        <button type="button" className="admin-btn" onClick={() => setEditing(product)}>
                          Изменить
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
          </>
        )}
      </main>
    </div>
  );
}
