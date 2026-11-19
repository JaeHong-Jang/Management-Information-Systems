// /hq/agents 에이전트 운영: '실시간 팀' 보드와 '팀 구조' 탭(?view=structure)
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/app/AppData';
import { loadHarness } from '@/shared/api/harness';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, PageHeader } from '@/shared/ui';
import { cx } from '@/shared/lib/format';
import { LiveBoard } from './LiveBoard';
import { TeamStructure } from './TeamStructure';

const TABS = [
  { id: 'live', label: '실시간 팀' },
  { id: 'structure', label: '팀 구조' },
] as const;

export function AgentsPage() {
  const harness = useAsync(() => loadHarness(), []);
  const { overview, targetId, targetName } = useApp();
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') === 'structure' ? 'structure' : 'live';
  const storeName = new Map((overview.data?.stores ?? []).map((r) => [r.store.id, r.store.name]));

  return (
    <>
      <PageHeader
        title="에이전트 운영"
        en="AGENTS"
        sub="제품 안의 에이전트 팀이 일하는 모습이에요. 숫자는 규칙 에이전트가, 분류·설명·초안은 LLM 에이전트가 맡고, 검증팀을 통과한 것만 화면에 나가요"
      >
        {harness.data && <p className="num dev mt-1 text-caption text-text-muted">{harness.data.name} {harness.data.version} · LLM {harness.data.llm.model}</p>}
      </PageHeader>
      <div role="tablist" aria-label="보기" className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={view === t.id}
            onClick={() => setSp(t.id === 'live' ? {} : { view: t.id }, { replace: true })}
            className={cx('-mb-px min-h-[44px] border-b-[3px] px-4 text-body', view === t.id ? 'border-yellow-hl font-bold text-ink' : 'border-transparent text-text-muted hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <AsyncView state={harness}>
        {(h) => (view === 'structure' ? <TeamStructure h={h} /> : <LiveBoard h={h} storeName={storeName} targetId={targetId} targetName={targetName} />)}
      </AsyncView>
    </>
  );
}
