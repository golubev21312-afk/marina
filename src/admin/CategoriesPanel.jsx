import { useState } from 'react';
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

/**
 * Разделы каталога: добавить, переименовать, поменять порядок, удалить.
 * Адрес раздела (slug) задаётся один раз при создании — ссылки не ломаются
 * при переименовании. Раздел с товарами удалить нельзя.
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

  // Товары в разделе считаем по базе, а не по списку в браузере: он мог
  // не загрузиться — тогда раздел казался бы пустым, а база молча отказала бы
  const remove = (category) =>
    run('удалить раздел', async () => {
      const { totalItems } = await pb
        .collection('products')
        .getList(1, 1, { filter: pb.filter('category = {:id}', { id: category.id }) });
      if (totalItems) {
        setDeleting(null);
        await refreshProducts();
        setError(`В разделе «${category.title}» ${totalItems} шт. — сначала перенесите их в другой раздел.`);
        return;
      }
      await pb.collection('categories').delete(category.id);
      setDeleting(null);
      await reload();
      onNotice(`Раздел «${category.title}» удалён.`);
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
                  count ? (
                    <>
                      <span className="admin-item__ask">
                        В разделе {count} шт. — сначала перенесите их в другой раздел
                      </span>
                      <button type="button" className="admin-btn" onClick={() => setDeleting(null)}>
                        Понятно
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="admin-item__ask">Удалить раздел?</span>
                      <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={() => remove(category)}>
                        Да
                      </button>
                      <button type="button" className="admin-btn" onClick={() => setDeleting(null)}>
                        Нет
                      </button>
                    </>
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
