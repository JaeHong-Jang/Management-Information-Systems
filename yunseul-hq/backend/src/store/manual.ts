import type { ManualChecklist } from '@shared/contracts';
import { manualItems } from '@shared/manual';
import * as db from './db.js';

const seoulDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});
const error = (status: number, message: string) => Object.assign(new Error(message), { status });

export function manualChecklist(storeId: string, personId?: unknown): ManualChecklist {
  if (!db.store(storeId)) throw error(404, '해당 매장 없음');
  if (personId !== undefined && (typeof personId !== 'string' || !personId || db.person(personId)?.storeId !== storeId)) {
    throw error(400, '해당 매장 소속 직원 선택 필요');
  }
  const date = seoulDay.format(new Date());
  const checkedIds = db.get().manualChecks
    .filter((row) => row.storeId === storeId && row.personId === personId && row.date === date)
    .map((row) => row.itemId);
  return { storeId, personId: personId ?? null, date, items: manualItems, checkedIds };
}

export function setManualCheck(storeId: string, itemId: string, personId: unknown, date: unknown, checked: unknown): ManualChecklist {
  if (typeof personId !== 'string' || !personId) throw error(400, '점검 담당자 선택 필요');
  const checklist = manualChecklist(storeId, personId);
  if (!manualItems.some((item) => item.id === itemId)) throw error(404, '해당 점검 항목 없음');
  if (typeof checked !== 'boolean' || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw error(400, '근무일 또는 점검 상태 값 오류');
  }
  if (date !== checklist.date) throw error(409, '근무일 변경 · 오늘의 점검표 재조회 필요');
  if (checklist.checkedIds.includes(itemId) === checked) return checklist;

  const data = db.get();
  const manualChecks = checked
    ? [...data.manualChecks, { storeId, personId, date, itemId }]
    : data.manualChecks.filter((row) => !(row.storeId === storeId && row.personId === personId && row.date === date && row.itemId === itemId));
  db.save({ ...data, manualChecks });
  data.manualChecks = manualChecks;
  checklist.checkedIds = checked ? [...checklist.checkedIds, itemId] : checklist.checkedIds.filter((id) => id !== itemId);
  return checklist;
}
