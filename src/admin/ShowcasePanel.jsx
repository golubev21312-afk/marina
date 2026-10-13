import { useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pb';
import { refreshShowcase, useShowcase } from '../lib/showcase';
import { failText } from './failText';
import { saveOrder, useListAction } from './listActions';
import { shrinkImage } from './shrinkImage';

/** Форматы, которые показывают все браузеры (так же разрешено в базе). */
const WEB_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/** Форма карточки: фото, название, история на обороте, показывать ли. */
function ShowcaseForm({ item, onSave, onCancel }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [story, setStory] = useState(item?.story ?? '');
  const [visible, setVisible] = useState(item?.visible ?? true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(item?.preview ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Превью нового фото — временная ссылка, освобождаем при замене и выходе
  useEffect(() => () => preview.startsWith('blob:') && URL.revokeObjectURL(preview), [preview]);

  const pickFile = async (fileList) => {
    const picked = fileList?.[0];
    if (!picked) return;
    setBusy(true);
    setError('');
    const shrunk = await shrinkImage(picked);
    if (WEB_FORMATS.includes(shrunk.type)) {
      setFile(shrunk);
      setPreview(URL.createObjectURL(shrunk));
    } else {
      setError('Фото в формате, который сайт не покажет (например, HEIC). Сохраните его как JPEG и добавьте снова.');
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!file && !item) return setError('Добавьте фото карточки.');
    if (!title.trim()) return setError('Напишите название.');
    setBusy(true);
    try {
      const data = new FormData();
      data.append('title', title.trim());
      data.append('story', story.trim());
      data.append('visible', String(visible));
      if (file) data.append('photo', file);
      await onSave(data);
    } catch (err) {
      setError(failText(err, 'сохранить'));
      setBusy(false);
    }
  };

  return (
    <form className="admin-editor" onSubmit={submit}>
      <h2>{item ? 'Изменить карточку' : 'Новая карточка на главной'}</h2>

      <div className="admin-field">
        <span className="admin-label">Фото</span>
        <div className="admin-photos">
          {preview && (
            <figure className="admin-photo is-main">
              <img src={preview} alt="" />
            </figure>
          )}
          <label className="admin-photo admin-photo--add">
            <input ref={inputRef} type="file" accept="image/*" onChange={(event) => pickFile(event.target.files)} />
            <span className="admin-photo__plus">+</span>
            <span>{preview ? 'Заменить фото' : 'Добавить фото'}</span>
          </label>
        </div>
        <small className="admin-hint">
          Вертикальное фото 3 : 4. Карточки смотрятся ровно, если фон у всех одинаковый — как у нынешних.
        </small>
      </div>

      <label className="admin-field">
        <span className="admin-label">Название</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Неваляшка «Учитель»" maxLength={120} />
      </label>

      <label className="admin-field">
        <span className="admin-label">История — на обороте карточки</span>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={10}
          placeholder="Каждая строка — отдельный абзац"
          maxLength={5000}
        />
        <small className="admin-hint">Каждая строка — отдельный абзац. Чем короче история, тем крупнее шрифт.</small>
      </label>

      <div className="admin-field">
        <label className="admin-toggle">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          <span className="admin-toggle__track" aria-hidden="true" />
          {visible ? 'Показывать на главной' : 'Скрыта'}
        </label>
        <small className="admin-hint">
          {visible ? 'Карточка есть в карусели.' : 'Карточка сохранится здесь, но на главной её не будет.'}
        </small>
      </div>

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
 * Карусель на главной: карточки с фото и историей на обороте.
 * Добавить, изменить, порядок ↑↓, скрыть/показать, удалить.
 */
export default function ShowcasePanel({ onNotice }) {
  const { status, items } = useShowcase();
  const [editing, setEditing] = useState(null); // null | 'new' | карточка
  const [deleting, setDeleting] = useState(null);
  const { busy, error, run } = useListAction(refreshShowcase);

  const create = async (data) => {
    data.append('sort', String(Math.max(0, ...items.map((i) => i.sort ?? 0)) + 10));
    await pb.collection('showcase').create(data);
    await refreshShowcase();
    setEditing(null);
    onNotice('Карточка добавлена — она уже на главной.');
  };

  const update = async (item, data) => {
    await pb.collection('showcase').update(item.id, data);
    await refreshShowcase();
    setEditing(null);
    onNotice('Карточка сохранена.');
  };

  const remove = (item) =>
    run('удалить', async () => {
      await pb.collection('showcase').delete(item.id);
      setDeleting(null);
      await refreshShowcase();
      onNotice(`Карточка «${item.title}» удалена.`);
    });

  const toggleVisible = (item) =>
    run('сохранить', async () => {
      await pb.collection('showcase').update(item.id, { visible: !item.visible });
      await refreshShowcase();
      onNotice(item.visible ? 'Карточка скрыта с главной.' : 'Карточка снова на главной.');
    });

  const move = (index, delta) =>
    run('поменять порядок', async () => {
      await saveOrder('showcase', items, index, delta);
      await refreshShowcase();
    });

  if (editing) {
    return (
      <ShowcaseForm
        key={editing === 'new' ? 'new' : editing.id}
        item={editing === 'new' ? null : editing}
        onSave={(data) => (editing === 'new' ? create(data) : update(editing, data))}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const shown = items.filter((i) => i.visible).length;

  return (
    <>
      <button type="button" className="admin-btn admin-btn--main admin-add" onClick={() => setEditing('new')}>
        + Добавить карточку
      </button>
      <p className="admin-hint">
        Карусель на главной странице: фото спереди, история на обороте. На главной сейчас — {shown} шт.
      </p>

      {error && <p className="admin-error">{error}</p>}
      {status === 'loading' && <p className="admin-empty">Загружаем…</p>}
      {status === 'error' && <p className="admin-empty">Не получилось загрузить карточки. Обновите страницу.</p>}
      {status === 'ready' && items.length === 0 && (
        <p className="admin-empty">Карточек нет — на главной карусель пустая. Нажмите «Добавить карточку».</p>
      )}

      <ul className="admin-list">
        {items.map((item, i) => (
          <li key={item.id} className={`admin-item admin-item--showcase ${item.visible ? '' : 'is-hidden'}`}>
            <div className="admin-order">
              <button type="button" aria-label="Выше" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" aria-label="Ниже" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)}>
                ↓
              </button>
            </div>
            <img src={item.preview} alt="" />
            <div className="admin-item__info">
              <strong>{item.title}</strong>
              <span>{item.paragraphs.length ? `история: ${item.paragraphs.length} абз.` : 'без истории'}</span>
              {!item.visible && <em>скрыта с главной</em>}
            </div>
            <div className="admin-item__actions">
              {deleting === item.id ? (
                <>
                  <span className="admin-item__ask">Удалить карточку?</span>
                  <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={() => remove(item)}>
                    Да
                  </button>
                  <button type="button" className="admin-btn" disabled={busy} onClick={() => setDeleting(null)}>
                    Нет
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="admin-btn" disabled={busy} onClick={() => setEditing(item)}>
                    Изменить
                  </button>
                  <button type="button" className="admin-btn" disabled={busy} onClick={() => toggleVisible(item)}>
                    {item.visible ? 'Скрыть' : 'Показать'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    disabled={busy}
                    onClick={() => setDeleting(item.id)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
