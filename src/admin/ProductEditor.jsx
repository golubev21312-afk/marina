import { useEffect, useRef, useState } from 'react';
import { pb } from '../lib/pb';
import { useCategories } from '../lib/categories';
import { PREVIEW_SIZES, previewsOf } from '../lib/photoPreviews';
import { DEFAULT_MATERIAL, STOCK, useProducts } from '../lib/products';
import ProductCard from '../components/ProductCard';
import { preparePhoto, WEB_TYPES } from './shrinkImage';

let localId = 0;

/** Новое фото в форме: файл, его превью и временная ссылка для показа. */
const newPhoto = ({ file, previews }) => ({
  key: `new-${++localId}`,
  kind: 'new',
  file,
  previews,
  preview: URL.createObjectURL(file),
});

/** Столько фото база принимает у одного товара. */
const MAX_PHOTOS = 10;

/** Поводы-подсказки, пока своих мало: Марина нажимает — метка добавляется. */
const STARTER_OCCASIONS = ['учителю', 'врачу', 'ребёнку', 'маме', 'коллеге', 'на свадьбу', 'на Новый год'];

/** Поводы: метки-«пилюли» с ×, поле для своей и подсказки одним нажатием. */
function OccasionsField({ value, onChange, known }) {
  const [draft, setDraft] = useState('');
  const has = (name) => value.some((item) => item.toLowerCase() === name.toLowerCase());
  const add = (raw) => {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (name && !has(name)) onChange([...value, name]);
    setDraft('');
  };
  const suggestions = [...new Set([...known, ...STARTER_OCCASIONS])].filter((name) => !has(name)).slice(0, 12);

  return (
    <div className="admin-field">
      <span className="admin-label">Кому подойдёт в подарок — необязательно</span>
      {value.length > 0 && (
        <div className="admin-tags">
          {value.map((name) => (
            <span key={name} className="admin-tag">
              {name}
              <button
                type="button"
                aria-label={`Убрать «${name}»`}
                onClick={() => onChange(value.filter((item) => item !== name))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder="Например, учителю — и Enter"
        maxLength={40}
      />
      {suggestions.length > 0 && (
        <div className="admin-tags admin-tags--suggest">
          {suggestions.map((name) => (
            <button key={name} type="button" className="admin-tag admin-tag--add" onClick={() => add(name)}>
              + {name}
            </button>
          ))}
        </div>
      )}
      <small className="admin-hint">В каталоге по этим словам появятся подборки «Подарок: учителю…».</small>
    </div>
  );
}

/** Подсказка под выбором наличия — что увидит посетитель. */
const STOCK_HINT = {
  in_stock: 'Изделие есть, его можно купить.',
  to_order: 'На карточке будет плашка «Под заказ»: мастер сделает такое же.',
  sold_out: 'Изделие останется в каталоге с пометкой «нет в наличии» — его можно заказать похожим.',
};

/**
 * Форма товара: добавить новый, изменить существующий или завести копию
 * (copyFrom — похожее изделие: те же поля и фото, сохраняется новым товаром).
 * Фото — список «уже загруженные + новые»; первое в списке — главное
 * (его видно на карточке каталога).
 */
export default function ProductEditor({ product, copyFrom, onSaved, onCancel }) {
  const base = product ?? copyFrom;
  const [title, setTitle] = useState(copyFrom ? `${copyFrom.title} — копия` : (product?.title ?? ''));
  const [description, setDescription] = useState(base?.description ?? '');
  const [price, setPrice] = useState(base?.price ? String(base.price) : '');
  const { items: categories } = useCategories();
  const { items: products } = useProducts();
  const [category, setCategory] = useState(base?.categoryId ?? '');
  const [stock, setStock] = useState(base?.stock ?? 'in_stock');
  const [occasions, setOccasions] = useState(base?.occasions ?? []);
  const [leadTime, setLeadTime] = useState(base?.leadTime ?? '');
  const [material, setMaterial] = useState(base?.material ?? '');
  const [size, setSize] = useState(base?.size ?? '');
  // Поводы других изделий — в подсказки, чтобы метки писались одинаково
  const knownOccasions = [...new Set(products.flatMap((item) => item.occasions))];
  const [photos, setPhotos] = useState(() =>
    (product?.files ?? []).map((name, i) => ({ key: `old-${name}`, kind: 'old', name, preview: product.small[i] })),
  );
  // Что уже лежит в базе. Если сохранение прошло наполовину, повтор обновит эту запись,
  // а не создаст товар и не загрузит фото второй раз
  const [saved, setSaved] = useState(product ? { id: product.id, files: product.files, previews: product.previewFiles } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  // Копия: фото исходного изделия скачиваем и загрузим заново, как новые
  const [copyingPhotos, setCopyingPhotos] = useState(Boolean(copyFrom?.photos.length));

  useEffect(() => {
    if (!copyFrom?.photos.length) return undefined;
    let alive = true;
    Promise.all(
      copyFrom.photos.map(async (url, i) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`фото ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], copyFrom.files[i], { type: blob.type });
        return newPhoto(await preparePhoto(file, PREVIEW_SIZES.products));
      }),
    )
      .then((copied) => alive && setPhotos(copied))
      .catch(() => alive && setError('Фото не скопировались — добавьте их заново.'))
      .finally(() => alive && setCopyingPhotos(false));
    return () => {
      alive = false;
    };
  }, [copyFrom]);

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
    const shrunk = await Promise.all(files.map((file) => preparePhoto(file, PREVIEW_SIZES.products)));
    // Браузер не смог перевести фото (например, HEIC в Chrome) — не берём, объясняем
    const ready = shrunk.filter((photo) => WEB_TYPES.includes(photo.file.type));
    const room = Math.max(0, MAX_PHOTOS - photosRef.current.length);
    const taken = ready.slice(0, room);
    if (ready.length < shrunk.length) {
      setError('Часть фото в формате, который сайт не покажет (например, HEIC). Сохраните их как JPEG и добавьте снова.');
    } else if (taken.length < ready.length) {
      setError(`У товара может быть не больше ${MAX_PHOTOS} фото — добавлены первые ${taken.length}, остальные не поместились.`);
    } else {
      setError('');
    }
    setPhotos((list) => [...list, ...taken.map(newPhoto)]);
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
    if (copyingPhotos) return setError('Подождите — фото ещё копируются.');
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
      data.append('occasions', JSON.stringify(occasions));
      data.append('lead_time', leadTime.trim());
      data.append('material', material.trim());
      data.append('size', size.trim());

      const newOnes = photos.filter((p) => p.kind === 'new');
      let record;
      if (saved) {
        // Удалённые старые фото, затем новые — в конец списка
        const keep = new Set(photos.filter((p) => p.kind === 'old').map((p) => p.name));
        saved.files
          .filter((name) => !keep.has(name))
          .forEach((name) => {
            data.append('photos-', name);
            previewsOf(saved.previews, name).forEach((preview) => data.append('previews-', preview));
          });
        newOnes.forEach((p) => {
          data.append('photos+', p.file);
          p.previews.forEach((preview) => data.append('previews+', preview));
        });
        record = await pb.collection('products').update(saved.id, data);
      } else {
        newOnes.forEach((p) => {
          data.append('photos', p.file);
          p.previews.forEach((preview) => data.append('previews', preview));
        });
        // Новый товар — первым в списке и в каталоге
        data.append('sort', String(Math.min(10, ...products.map((p) => p.sort ?? 10)) - 10));
        record = await pb.collection('products').create(data);
      }

      // Порядок фото как в форме: база кладёт новые в конец — переставляем
      const uploaded = record.photos.slice(record.photos.length - newOnes.length);
      const byKey = new Map(newOnes.map((p, i) => [p.key, uploaded[i]]));
      const order = photos.map((p) => (p.kind === 'old' ? p.name : byKey.get(p.key)));

      // Фото уже в базе: запоминаем это до перестановки, которая может сорваться
      setSaved({ id: record.id, files: record.photos, previews: record.previews ?? [] });
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
      <h2>{product ? 'Изменить товар' : copyFrom ? 'Копия товара' : 'Новый товар'}</h2>
      {copyFrom && (
        <p className="admin-hint">
          Поля и фото взяты из «{copyFrom.title}». Поменяйте, что отличается, и сохраните — появится новый
          товар, исходный останется как был.
        </p>
      )}

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

      {stock !== 'in_stock' && (
        <label className="admin-field">
          <span className="admin-label">Срок изготовления — необязательно</span>
          <input
            value={leadTime}
            onChange={(e) => setLeadTime(e.target.value)}
            placeholder="Например, 7–10 дней"
            maxLength={60}
          />
          <small className="admin-hint">Посетитель увидит: «Мастер сделает его для вас за 7–10 дней».</small>
        </label>
      )}

      <div className="admin-row">
        <label className="admin-field">
          <span className="admin-label">Материал — необязательно</span>
          <input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder={`Пусто — «${DEFAULT_MATERIAL}»`}
            maxLength={120}
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Размер — необязательно</span>
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Например, высота 12 см" maxLength={60} />
        </label>
      </div>

      <OccasionsField value={occasions} onChange={setOccasions} known={knownOccasions} />

      {/* Предпросмотр: та же карточка, что в каталоге, по тому, что сейчас в форме.
          inert — по ней не перейти и не «отложить» */}
      <div className="admin-field">
        <span className="admin-label">Так изделие будет выглядеть в каталоге</span>
        <div className="admin-preview" inert>
          <ProductCard
            product={{
              id: 'preview',
              title: title.trim() || 'Название изделия',
              description: description.trim(),
              price: price ? Math.round(Number(price)) : null,
              stock,
              thumbs: photos[0] ? [photos[0].preview] : [],
            }}
          />
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn--main" disabled={busy || copyingPhotos}>
          {busy ? 'Сохраняем…' : copyingPhotos ? 'Копируем фото…' : 'Сохранить'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
      </div>
    </form>
  );
}
