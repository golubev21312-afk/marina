import { useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pb';
import { refreshCategories, slugify, useCategories } from '../lib/categories';
import { refreshProducts, useProducts } from '../lib/products';
import { failText } from './failText';
import { saveOrder, useListAction } from './listActions';

/** Форма раздела: название, приписка, описание для плашки над каталогом. */
function CategoryForm({ category, onSave, onCancel }) {
  const [title, setTitle] = useState(category?.title ?? '');
  const [subtitle, setSubtitle] = useState(category?.subtitle ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return setError('Напишите название раздела.');
    setBusy(true);
    setError('');
    try {
      await onSave({ title: title.trim(), subtitle: subtitle.trim(), description: description.trim() });
    } catch (err) {
      setError(failText(err, 'сохранить'));
      setBusy(false);
    }
  };

  return (
    <form className="admin-editor admin-editor--compact" onSubmit={submit}>
      <label className="admin-field">
        <span className="admin-label">Название раздела</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Пасхальное" maxLength={60} />
      </label>
      <label className="admin-field">
        <span className="admin-label">Приписка — необязательно</span>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Короткая фраза рядом с названием на плашке"
          maxLength={120}
        />
      </label>
      <label className="admin-field">
        <span className="admin-label">Описание — необязательно</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Пара предложений о разделе — их видно над каталогом, если о разделе нет фактов"
          maxLength={600}
        />
      </label>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn--main" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
      </div>
    </form>
  );
}

/** Через сколько секунд удаление раздела применяется само, если не нажали «Нет». */
const DELETE_AFTER_SEC = 30;

/**
 * Предупреждение об удалении раздела с отсчётом: «Да» — сразу, «Нет» —
 * отмена, ничего не нажали — через 30 с удаляется. Товары раздела
 * переезжают в раздел, выбранный здесь же.
 */
function DeleteCountdown({ category, others, busy, onConfirm, onCancel }) {
  const [left, setLeft] = useState(DELETE_AFTER_SEC);
  const [target, setTarget] = useState(others[0]?.id ?? '');
  // Сколько товаров переедет — по базе: список в браузере мог не загрузиться
  const [count, setCount] = useState(null);
  // Отсчёт вызывает последнюю версию onConfirm с последним выбранным разделом
  const confirm = useRef(null);
  useEffect(() => {
    confirm.current = () => onConfirm(target);
  });

  useEffect(() => {
    let alive = true;
    pb.collection('products')
      .getList(1, 1, { filter: pb.filter('category = {:id}', { id: category.id }) })
      .then(({ totalItems }) => alive && setCount(totalItems))
      .catch(() => alive && setCount(-1)); // не узнали — выбор раздела всё равно покажем
    return () => {
      alive = false;
    };
  }, [category.id]);

  useEffect(() => {
    const timer = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (left === 0) confirm.current();
  }, [left]);

  return (
    <div className="admin-countdown">
      <span className="admin-item__ask">
        Удалить раздел «{category.title}»?
        {count !== 0 && count !== null && (
          <>
            {' '}
            {count > 0 ? `Его товары (${count} шт.) переедут в раздел` : 'Его товары переедут в раздел'}{' '}
            <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </>
        )}{' '}
        {left > 0 ? `Удалится сам через ${left} с.` : 'Удаляем…'}
      </span>
      <button
        type="button"
        className="admin-btn admin-btn--danger"
        disabled={busy || left <= 0}
        onClick={() => confirm.current()}
      >
        Да
      </button>
      <button type="button" className="admin-btn" disabled={busy || left <= 0} onClick={onCancel}>
        Нет
      </button>
    </div>
  );
}

/**
 * Разделы каталога: добавить, переименовать, поменять порядок, удалить.
 * Адрес раздела (slug) задаётся один раз при создании — ссылки не ломаются
 * при переименовании. Товары удаляемого раздела переезжают в другой;
 * единственный раздел удалить нельзя — товарам некуда деться.
 */
export default function CategoriesPanel({ onNotice }) {
  const { items: categories } = useCategories();
  const { items: products } = useProducts();
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [deleting, setDeleting] = useState(null);

  const edit = (what) => {
    setError('');
    setEditing(what);
  };

  const countOf = (id) => products.filter((p) => p.categoryId === id).length;

  const reload = async () => {
    await refreshCategories();
    await refreshProducts(); // у товаров в ответе — slug раздела
  };
  const { busy, error, setError, run } = useListAction(reload);

  const create = async (data) => {
    const taken = new Set(categories.map((c) => c.slug));
    let slug = slugify(data.title);
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(data.title)}-${n}`;
    const sort = Math.max(0, ...categories.map((c) => c.sort ?? 0)) + 10;
    await pb.collection('categories').create({ ...data, slug, sort });
    await reload();
    setEditing(null);
    onNotice(`Раздел «${data.title}» добавлен — он уже в каталоге и меню.`);
  };

  const update = async (category, data) => {
    await pb.collection('categories').update(category.id, data);
    await reload();
    setEditing(null);
    onNotice('Раздел сохранён.');
  };

  // Товары раздела берём из базы, а не из списка в браузере: он мог
  // не загрузиться — тогда часть товаров не переехала бы и база отказала бы
  const remove = (category, targetId) =>
    run('удалить раздел', async () => {
      setDeleting(null);
      const moving = await pb
        .collection('products')
        .getFullList({ filter: pb.filter('category = {:id}', { id: category.id }), fields: 'id' });
      if (moving.length && !targetId) throw new Error('Не выбран раздел для товаров.');
      for (const { id } of moving) await pb.collection('products').update(id, { category: targetId });
      await pb.collection('categories').delete(category.id);
      await reload();
      const target = categories.find((c) => c.id === targetId);
      onNotice(
        moving.length
          ? `Раздел «${category.title}» удалён, товары (${moving.length} шт.) перенесены в «${target?.title}».`
          : `Раздел «${category.title}» удалён.`,
      );
    });

  const move = (index, delta) =>
    run('поменять порядок', async () => {
      await saveOrder('categories', categories, index, delta);
      await refreshCategories();
    });

  return (
    <>
      {editing === 'new' ? (
        <CategoryForm onSave={create} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="admin-btn admin-btn--main admin-add" onClick={() => edit('new')}>
          + Добавить раздел
        </button>
      )}

      {error && <p className="admin-error">{error}</p>}

      <ul className="admin-list">
        {categories.map((category, i) => {
          const count = countOf(category.id);
          if (editing === category.id) {
            return (
              <li key={category.id}>
                <CategoryForm
                  category={category}
                  onSave={(data) => update(category, data)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            );
          }
          return (
            <li key={category.id} className="admin-item admin-item--category">
              <div className="admin-order">
                <button type="button" aria-label="Выше" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" aria-label="Ниже" disabled={busy || i === categories.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
              </div>
              <div className="admin-item__info">
                <strong>{category.title}</strong>
                {category.subtitle && <span>{category.subtitle}</span>}
                <span>{count ? `товаров: ${count}` : 'пока пусто'}</span>
              </div>
              <div className="admin-item__actions">
                {deleting === category.id ? (
                  categories.length < 2 ? (
                    <>
                      <span className="admin-item__ask">Это единственный раздел — сначала добавьте другой</span>
                      <button type="button" className="admin-btn" onClick={() => setDeleting(null)}>
                        Понятно
                      </button>
                    </>
                  ) : (
                    <DeleteCountdown
                      category={category}
                      others={categories.filter((c) => c.id !== category.id)}
                      busy={busy}
                      onConfirm={(targetId) => remove(category, targetId)}
                      onCancel={() => setDeleting(null)}
                    />
                  )
                ) : (
                  <>
                    <button type="button" className="admin-btn" onClick={() => edit(category.id)}>
                      Изменить
                    </button>
                    <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setDeleting(category.id)}>
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
