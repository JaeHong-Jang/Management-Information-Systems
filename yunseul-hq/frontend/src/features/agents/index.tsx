import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '@/app/AppData';
import { loadHarness } from '@/shared/api/harness';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, PageHeader } from '@/shared/ui';
import { LiveBoard } from './LiveBoard';
import { TeamStructure } from './TeamStructure';
import './operations.css';

export function AgentsPage() {
  const harness = useAsync(() => loadHarness(), []);
  const { overview, targetId, targetName } = useApp();
  const [sp] = useSearchParams();
  const structure = sp.get('view') === 'structure';
  const storeNames = new Map((overview.data?.stores ?? []).map((r) => [r.store.id, r.store.name]));

  function viewLink(showStructure: boolean) {
    const params = new URLSearchParams(sp);
    if (showStructure) params.set('view', 'structure');
    else params.delete('view');
    return { pathname: '/hq/agents', search: params.toString() };
  }

  return (
    <>
      <PageHeader title="에이전트 운영" sub="자동 처리 업무의 실행 이력, 담당 단계 및 검증 결과" />
      <nav className="ops-views" aria-label="운영 조회">
        <Link to={viewLink(false)} aria-current={structure ? undefined : 'page'}>실행 현황</Link>
        <Link to={viewLink(true)} aria-current={structure ? 'page' : undefined}>팀 구성</Link>
      </nav>
      <AsyncView state={harness}>
        {(h) => structure ? <TeamStructure h={h} /> : <LiveBoard h={h} storeName={storeNames} targetId={targetId} targetName={targetName} />}
      </AsyncView>
    </>
  );
}
