import { formatArabicDate, lastUpdateInfo } from '../lib/stats';
import { useData } from '../store';
import { Icon } from './Icon';

/** سطر "آخر تحديث" ليعرف الجمهور أن البيانات حديثة */
export function LastUpdate() {
  const state = useData();
  const info = lastUpdateInfo(state);
  return (
    <p className="last-update">
      <Icon name="clock" />{' '}
      {info ? `آخر تحديث: ${formatArabicDate(info.date)} · ${info.time}` : 'لم تُلعب أي مباراة بعد'}
    </p>
  );
}
