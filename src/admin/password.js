/** Пароль учётки editors — как в базе: не короче 8 символов. */
export const MIN_PASSWORD = 8;

/** Проверка нового пароля до отправки: текст ошибки или пустая строка. */
export function checkNewPassword(password, repeat) {
  if (password.length < MIN_PASSWORD) return `Пароль — не короче ${MIN_PASSWORD} символов.`;
  if (password !== repeat) return 'Пароль и повтор не совпадают.';
  return '';
}
