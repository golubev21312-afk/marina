import { useOnline } from '../lib/offline';
import './OfflineNotice.css';

/** Сети нет — говорим, что каталог показан сохранённый (public/sw.js). */
export default function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <p className="offline-notice" role="status">
      Нет сети — показан сохранённый каталог
    </p>
  );
}
