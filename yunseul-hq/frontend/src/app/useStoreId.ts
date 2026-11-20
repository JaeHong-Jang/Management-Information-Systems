import { matchPath, useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from './AppData';

/** 지금 화면의 매장 id: /store/:id/…, /hq/stores/:id, ?storeId=, 없으면 타깃 매장 */
export function useStoreId(): string | null {
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  const { targetId } = useApp();
  const m = matchPath('/store/:id/*', pathname) ?? matchPath('/hq/stores/:id', pathname);
  return m?.params.id ?? sp.get('storeId') ?? targetId;
}
