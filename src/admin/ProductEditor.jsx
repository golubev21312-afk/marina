import { useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pb';
import { useCategories } from '../lib/categories';
import { STOCK, useProducts } from '../lib/products';
import { shrinkImage } from './shrinkImage';

let localId = 0;

/** Форматы, которые показывают все браузеры (так же разрешено в базе). */
const WEB_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/** Столько фото база принимает у одного товара. */
const MAX_PHOTOS = 10;

/** Подсказка под выбором наличия — что увидит посетитель. */
const STOCK_HINT = {
  in_stock: 'Изделие есть, его можно купить.',
  to_order: 'На карточке будет плашка «Под заказ»: мастер сделает такое же.',
  sold_out: 'Изделие останется в каталоге с пометкой «нет в наличии» — его можно заказать похожим.',
};

/**
 * Форма товара: добавить новый или изменить существующий.
 * Фото — список «уже загруженные + новые»; первое в списке — главное
 * (его видно на карточке каталога).
 */
export default function ProductEditor({ product, onSaved, onCancel }) {
  const [title, setTitle] = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const { items: categories } = useCategories();
  const { items: products } = useProducts();
  const [category, setCategory] = useState(product?.categoryId ?? '');
  const [stock, setStock] = useState(product?.stock ?? 'in_stock');
  const [photos, setPhotos] = useState(() =>
    (product?.files ?? []).map((name, i) => ({ key: `old-${name}`, kind: 'old', name, preview: product.small[i] })),
  );
  // Что уже лежит в базе. Если сохранение прошло наполовину, повтор обновит эту запись,
  // а не создаст товар и не загрузит фото второй раз
  const [saved, setSaved] = useState(product ? { id: product.id, files: product.files } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Превью новых фото — временные ссылки, освобождаем их при выходе из формы
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosRef.current.forEach((p) => p.preview.startsWith('blob:') && URL.revokeObjectURL(p.preview)),
    [],
  );

  const addFiles = async (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    setBusy(true);
    const shrunk = await Promise.all(files.map(shrinkImage));
    // Браузер не смог перевести фото (например, HEIC в Chrome) — не берём, объясняем
    const ready = shrunk.filter((file) => WEB_FORMATS.includes(file.type));
    const room = Math.max(0, MAX_PHOTOS - photosRef.current.length);
    const taken = ready.slice(0, room);
    if (ready.length < shrunk.length) {
      setError('Часть фото в формате, который сайт не покажет (например, HEIC). Сохраните их как JPEG и добавьте снова.');
    } else if (taken.length < ready.length) {
      setError(`У товара может быть не больше ${MAX_PHOTOS} фото — добавлены первые ${taken.length}, остальные не поместились.`);
    } else {
      setError('');
    }
    setPhotos((list) => [
      ...list,
      ...taken.map((file) => ({ key: `new-${++localId}`, kind: 'new', file, preview: URL.createObjectURL(file) })),
    ]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removePhoto = (key) =>
    setPhotos((list) => {
      const gone = list.find((p) => p.key === key);
      if (gone?.preview.startsWith('blob:')) URL.revokeObjectURL(gone.preview);
      return list.filter((p) => p.key !== key);
    });

  const makeMain = (key) =>
    setPhotos((list) => [list.find((p) => p.key === key), ...list.filter((p) => p.key !== key)]);

  const save = async (event) => {
    event.preventDefault();
    setError('');
    if (!title.trim()) return setError('Напишите название товара.');
    if (!category) return setError('Выберите раздел каталога.');
    if (!photos.length) return setError('Добавьте хотя бы одно фото.');
    if (photos.length > MAX_PHOTOS) return setError(`У товара может быть не больше ${MAX_PHOTOS} фото — уберите лишние.`);

    setBusy(true);
    try {
      const data = new FormData();
      data.append('title', title.trim());
      data.append('description', description.trim());
      data.append('price', price ? String(Math.round(Number(price))) : '0');
      data.append('category', category);
      data.append('stock', stock);

      const newOnes = photos.filter((p) => p.kind === 'new');
      let record;
      if (saved) {
        // Удалённые старые фото, затем новые — в конец списка
        const keep = new Set(photos.filter((p) => p.kind === 'old').map((p) => p.name));
        saved.files.filter((name) => !keep.has(name)).forEach((name) => data.append('photos-', name));
        newOnes.forEach((p) => data.append('photos+', p.file));
        record = await pb.collection('products').update(saved.id, data);
      } else {
        newOnes.forEach((p) => data.append('photos', p.file));
        // Новый товар — первым в списке и в каталоге
        data.append('sort', String(Math.min(10, ...products.map((p) => p.sort ?? 10)) - 10));
        record = await pb.collection('products').create(data);
      }

      // Порядок фото как в форме: база кладёт новые в конец — переставляем
      const uploaded = record.photos.slice(record.photos.length - newOnes.length);
      const byKey = new Map(newOnes.map((p, i) => [p.key, uploaded[i]]));
      const order = photos.map((p) => (p.kind === 'old' ? p.name : byKey.get(p.key)));

      // Фото уже в базе: запоминаем это до перестановки, которая может сорваться
      setSaved({ id: record.id, files: record.photos });
      setPhotos((list) =>
        list.map((p) => (p.kind === 'new' ? { key: p.key, kind: 'old', name: byKey.get(p.key), preview: p.preview } : p)),
      );
      if (order.join('|') !== record.photos.join('|')) {
        record = await pb.collection('products').update(record.id, { photos: order });
      }

      onSaved(record, !product);
    } catch (err) {
      console.error(err);
      setError(
        err?.status === 0
          ? 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'
          : 'Не получилось сохранить. Попробуйте ещё раз; если повторится — напишите Андрею.',
      );
      setBusy(false);
    }
  };

  return (
    <form className="admin-editor" onSubmit={save}>
      <h2>{product ? 'Изменить товар' : 'Новый товар'}</h2>

      <div className="admin-field">
        <span className="admin-label">Фото</span>
        <div className="admin-photos">
          {photos.map((photo, i) => (
            <figure key={photo.key} className={`admin-photo ${i === 0 ? 'is-main' : ''}`}>
              <img src={photo.preview} alt="" />
              {i === 0 ? (
                <figcaption>Главное</figcaption>
              ) : (
                <button type="button" className="admin-photo__main" onClick={() => makeMain(photo.key)}>
                  Сделать главным
                </button>
              )}
              <button
                type="button"
                className="admin-photo__remove"
                aria-label="Убрать фото"
                onClick={() => removePhoto(photo.key)}
              >
                ×
              </button>
            </figure>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="admin-photo admin-photo--add">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => addFiles(event.target.files)}
              />
              <span className="admin-photo__plus">+</span>
              <span>Добавить фото</span>
            </label>
          )}
        </div>
        <small className="admin-hint">
          Первое фото — главное, его видно в каталоге. Можно выбрать несколько сразу, всего до {MAX_PHOTOS}.
        </small>
      </div>

      <label className="admin-field">
        <span className="admin-label">Название</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Неваляшка «Учитель»" maxLength={120} />
      </label>

      <label className="admin-field">
        <span className="admin-label">Описание</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Что это за изделие, для кого, чем особенное"
          maxLength={3000}
        />
      </label>

      <div className="admin-row">
        <label className="admin-field">
          <span className="admin-label">Цена, ₽</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Пусто — «цена по запросу»"
          />
        </label>

        <label className="admin-field">
          <span className="admin-label">Раздел</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— выберите —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="admin-field">
        <span className="admin-label">Наличие</span>
        <select value={stock} onChange={(e) => setStock(e.target.value)}>
          {Object.entries(STOCK).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <small className="admin-hint">{STOCK_HINT[stock]}</small>
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
