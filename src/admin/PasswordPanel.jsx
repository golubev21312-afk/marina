import { useState } from 'react';
import { pb } from '../lib/pb';
import { failText } from './failText';

const MIN = 8; // как в базе: пароль учётки editors — не короче 8 символов

/**
 * Смена своего пароля редактором (Марина в служебную панель /_/ не заходит).
 * База просит старый пароль; после смены прежний вход сбрасывается —
 * сразу входим заново с новым, чтобы не выкинуло из админки.
 */
export default function PasswordPanel({ onDone, onCancel }) {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { id, email, collectionName } = pb.authStore.record;

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < MIN) return setError(`Новый пароль — не короче ${MIN} символов.`);
    if (password !== repeat) return setError('Новый пароль и повтор не совпадают.');
    if (password === oldPassword) return setError('Новый пароль такой же, как старый.');
    setBusy(true);
    setError('');
    try {
      await pb.collection(collectionName).update(id, { oldPassword, password, passwordConfirm: repeat });
    } catch (err) {
      const fields = err?.response?.data ?? {};
      setError(
        fields.oldPassword
          ? 'Старый пароль неверный.'
          : fields.password
            ? 'База не приняла новый пароль — попробуйте другой, подлиннее.'
            : failText(err, 'сменить пароль'),
      );
      setBusy(false);
      return;
    }
    try {
      await pb.collection(collectionName).authWithPassword(email, password);
      onDone(true);
    } catch {
      // Пароль уже сменён, а войти заново не вышло (например, пропала связь)
      pb.authStore.clear();
      onDone(false);
    }
  };

  return (
    <form className="admin-editor admin-editor--narrow" onSubmit={submit}>
      <h2>Сменить пароль</h2>
      <input type="email" autoComplete="username" value={email} readOnly hidden />

      <label className="admin-field">
        <span className="admin-label">Старый пароль</span>
        <input
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
      </label>

      <label className="admin-field">
        <span className="admin-label">Новый пароль</span>
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <small className="admin-hint">Не короче {MIN} символов.</small>
      </label>

      <label className="admin-field">
        <span className="admin-label">Новый пароль ещё раз</span>
        <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
      </label>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn--main" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сменить пароль'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
      </div>
    </form>
  );
}
