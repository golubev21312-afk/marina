import { useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pb';
import { useProducts } from '../lib/products';
import { refreshReviews, useReviews } from '../lib/reviews';
import { failText } from './failText';
import { saveList, saveOrder, useListAction } from './listActions';
import OrderControls from './OrderControls';
import { useDragOrder } from './useDragOrder';
import { shrinkImage } from './shrinkImage';

/** Форматы, которые показывают все браузеры (так же разрешено в базе). */
const WEB_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/** Форма отзыва: кто, текст, когда, о каком изделии, фото, показывать ли. */
function ReviewForm({ item, onSave, onCancel }) {
  const { items: products } = useProducts();
  const [author, setAuthor] = useState(item?.author ?? '');
  const [text, setText] = useState(item?.text ?? '');
  const [when, setWhen] = useState(item?.when ?? '');
  const [product, setProduct] = useState(item?.productId ?? '');
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

  const removePhoto = () => {
    setFile(null);
    setPreview('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!author.trim()) return setError('Напишите, как подписать отзыв — например, имя покупателя.');
    if (!text.trim()) return setError('Вставьте текст отзыва.');
    setBusy(true);
    try {
      const data = new FormData();
      data.append('author', author.trim());
      data.append('text', text.trim());
      data.append('when', when.trim());
      data.append('product', product);
      data.append('visible', String(visible));
      if (file) data.append('photo', file);
      else if (!preview && item?.photoName) data.append('photo-', item.photoName);
      await onSave(data);
    } catch (err) {
      setError(failText(err, 'сохранить'));
      setBusy(false);
    }
  };

  const sorted = [...products].sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  return (
    <form className="admin-editor" onSubmit={submit}>
      <h2>{item ? 'Изменить отзыв' : 'Новый отзыв'}</h2>

      <div className="admin-row">
        <label className="admin-field">
          <span className="admin-label">Кто написал</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Например, Анна" maxLength={80} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Когда — необязательно</span>
          <input
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            placeholder="Например, сентябрь 2026"
            maxLength={40}
          />
        </label>
      </div>

      <label className="admin-field">
        <span className="admin-label">Текст отзыва</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Вставьте отзыв из ВК как есть"
          maxLength={2000}
        />
        <small className="admin-hint">
          Каждая строка — отдельный абзац. Длинный отзыв на сайте свернётся — его можно раскрыть.
        </small>
      </label>

      <label className="admin-field">
        <span className="admin-label">О каком изделии — необязательно</span>
        <select value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">— не про конкретное изделие —</option>
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <small className="admin-hint">Отзыв появится и на странице этого изделия.</small>
      </label>

      <div className="admin-field">
        <span className="admin-label">Фото от покупателя — необязательно</span>
        <div className="admin-photos">
          {preview && (
            <figure className="admin-photo is-main">
              <img src={preview} alt="" />
              <button type="button" className="admin-photo__remove" aria-label="Убрать фото" onClick={removePhoto}>
                ×
              </button>
            </figure>
          )}
          <label className="admin-photo admin-photo--add">
            <input ref={inputRef} type="file" accept="image/*" onChange={(event) => pickFile(event.target.files)} />
            <span className="admin-photo__plus">+</span>
            <span>{preview ? 'Заменить фото' : 'Добавить фото'}</span>
          </label>
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-toggle">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          <span className="admin-toggle__track" aria-hidden="true" />
          {visible ? 'Показывать на сайте' : 'Скрыт'}
        </label>
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
 * Отзывы покупателей: Марина переносит их из ВК. На сайте — лента на
 * «О мастерской» и под изделием. Добавить, изменить, порядок ↑↓,
 * скрыть/показать, удалить.
 */
export default function ReviewsPanel({ onNotice }) {
  const { status, items } = useReviews();
  const { items: products } = useProducts();
  const [editing, setEditing] = useState(null); // null | 'new' | отзыв
  const [deleting, setDeleting] = useState(null);
  const { busy, error, run } = useListAction(refreshReviews);

  // Новый отзыв — первым в ленте
  const create = async (data) => {
    data.append('sort', String(Math.min(10, ...items.map((i) => i.sort ?? 10)) - 10));
    await pb.collection('reviews').create(data);
    await refreshReviews();
    setEditing(null);
    onNotice('Отзыв добавлен — он уже на сайте.');
  };

  const update = async (item, data) => {
    await pb.collection('reviews').update(item.id, data);
    await refreshReviews();
    setEditing(null);
    onNotice('Отзыв сохранён.');
  };

  const remove = (item) =>
    run('удалить', async () => {
      await pb.collection('reviews').delete(item.id);
      setDeleting(null);
      await refreshReviews();
      onNotice(`Отзыв «${item.author}» удалён.`);
    });

  const toggleVisible = (item) =>
    run('сохранить', async () => {
      await pb.collection('reviews').update(item.id, { visible: !item.visible });
      await refreshReviews();
      onNotice(item.visible ? 'Отзыв скрыт с сайта.' : 'Отзыв снова на сайте.');
    });

  const move = (index, delta) =>
    run('поменять порядок', async () => {
      await saveOrder('reviews', items, index, delta);
      await refreshReviews();
    });

  const drag = useDragOrder(items, (order) =>
    run('поменять порядок', async () => {
      await saveList('reviews', order);
      await refreshReviews();
    }),
  );

  if (editing) {
    return (
      <ReviewForm
        key={editing === 'new' ? 'new' : editing.id}
        item={editing === 'new' ? null : editing}
        onSave={(data) => (editing === 'new' ? create(data) : update(editing, data))}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <button type="button" className="admin-btn admin-btn--main admin-add" onClick={() => setEditing('new')}>
        + Добавить отзыв
      </button>
      <p className="admin-hint">
        Отзывы из ВК — лента на странице «О мастерской» и под изделием, о котором отзыв. Пока отзывов нет, блока на
        сайте не видно.
      </p>

      {error && <p className="admin-error">{error}</p>}
      {status === 'loading' && <p className="admin-empty">Загружаем…</p>}
      {status === 'error' && <p className="admin-empty">Не получилось загрузить отзывы. Обновите страницу.</p>}
      {status === 'ready' && items.length === 0 && (
        <p className="admin-empty">Отзывов пока нет. Нажмите «Добавить отзыв» и вставьте текст из ВК.</p>
      )}

      <ul className="admin-list">
        {drag.shown.map((item, i) => {
          const product = products.find((p) => p.id === item.productId);
          return (
            <li
              key={item.id}
              ref={drag.rowRef(item.id)}
              className={`admin-item admin-item--review ${item.visible ? '' : 'is-hidden'} ${drag.draggingId === item.id ? 'is-dragging' : ''}`}
            >
              <OrderControls
                index={i}
                count={items.length}
                busy={busy}
                onMove={(delta) => move(i, delta)}
                handle={busy ? {} : drag.handle(item.id)}
              />
              {item.preview ? <img src={item.preview} alt="" /> : <span className="admin-item__nophoto" />}
              <div className="admin-item__info">
                <strong>{item.author}</strong>
                <span>{item.text.length > 90 ? `${item.text.slice(0, 90)}…` : item.text}</span>
                {product && <span>о «{product.title}»</span>}
                {!item.visible && <em>скрыт с сайта</em>}
              </div>
              <div className="admin-item__actions">
                {deleting === item.id ? (
                  <>
                    <span className="admin-item__ask">Удалить отзыв?</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={busy}
                      onClick={() => remove(item)}
                    >
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
          );
        })}
      </ul>
    </>
  );
}
