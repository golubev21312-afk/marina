import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pb } from '../lib/pb';
import { failText } from './failText';
import { checkNewPassword, MIN_PASSWORD } from './password';
import './Admin.css';

/**
 * «Забыли пароль?» на экране входа: база шлёт письмо со ссылкой
 * /admin/reset/<код>. Есть ли такая почта, не сообщаем — ответ всегда один,
 * чтобы по нему нельзя было подбирать адреса.
 */
export function ForgotForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return setError('Напишите почту, с которой входите.');
    setBusy(true);
    setError('');
    try {
      await pb.collection('editors').requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.status === 400 ? 'Проверьте почту — похоже, в ней опечатка.' : failText(err, 'отправить письмо'));
    }
    setBusy(false);
  };

  return (
    <form className="admin-login" onSubmit={submit}>
      <h1>Забыли пароль?</h1>
      {sent ? (
        <p>
          Если такая почта есть, на неё ушло письмо со ссылкой — по ней можно задать новый пароль. Ссылка действует
          30 минут. Письма нет — загляните в «Спам».
        </p>
      ) : (
        <>
          <p>Напишите почту, с которой входите, — пришлём ссылку, чтобы задать новый пароль.</p>
          <label className="admin-field">
            <span className="admin-label">Почта</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" className="admin-btn admin-btn--main" disabled={busy}>
            {busy ? 'Отправляем…' : 'Прислать ссылку'}
          </button>
        </>
      )}
      <button type="button" className="admin-back admin-linkbtn" onClick={onBack}>
        ← Ко входу
      </button>
    </form>
  );
}

/** Страница из письма: /admin/reset/:token — новый пароль дважды. */
export default function PasswordResetPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const invalid = checkNewPassword(password, repeat);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError('');
    try {
      await pb.collection('editors').confirmPasswordReset(token, password, repeat);
      // База уже погасила прежний вход — иначе админка решила бы, что мы вошли,
      // и все запросы падали бы
      pb.authStore.clear();
      setDone(true);
    } catch (err) {
      const fields = err?.response?.data ?? {};
      setError(
        fields.token
          ? 'Ссылка устарела или уже сработала. Запросите новую на странице входа — «Забыли пароль?».'
          : fields.password
            ? 'База не приняла пароль — попробуйте другой, подлиннее.'
            : failText(err, 'сменить пароль'),
      );
    }
    setBusy(false);
  };

  return (
    <div className="page admin">
      <form className="admin-login" onSubmit={submit}>
        <h1>Новый пароль</h1>
        {done ? (
          <>
            <p>Готово — пароль изменён. Входите с новым.</p>
            <Link className="admin-btn admin-btn--main admin-login__go" to="/admin">
              Войти
            </Link>
          </>
        ) : (
          <>
            <p>Придумайте новый пароль для админки «Крафт».</p>
            <label className="admin-field">
              <span className="admin-label">Новый пароль</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <small className="admin-hint">Не короче {MIN_PASSWORD} символов.</small>
            </label>
            <label className="admin-field">
              <span className="admin-label">Ещё раз</span>
              <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
            </label>
            {error && <p className="admin-error">{error}</p>}
            <button type="submit" className="admin-btn admin-btn--main" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить пароль'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
