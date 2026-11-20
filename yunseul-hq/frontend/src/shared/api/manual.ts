import type { ManualChecklist } from '@shared/contracts';
import { call } from './client';

const pathFor = (storeId: string) => `/stores/${encodeURIComponent(storeId)}/manual`;

export function getManual(storeId: string, personId: string) {
  const query = personId ? `?${new URLSearchParams({ personId })}` : '';
  return call<ManualChecklist>(pathFor(storeId) + query);
}

export function setManualCheck(storeId: string, itemId: string, personId: string, date: string, checked: boolean) {
  return call<ManualChecklist>(`${pathFor(storeId)}/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    body: JSON.stringify({ personId, date, checked }),
  });
}
