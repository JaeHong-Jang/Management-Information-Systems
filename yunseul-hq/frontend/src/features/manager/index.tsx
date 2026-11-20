import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ChevronDown } from 'lucide-react';
import type { LintIssue, StoreDetail, StoreState } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useApp } from '@/app/AppData';
import { useStoreData } from '@/app/StoreData';
import { useAsync, type AsyncState } from '@/shared/lib/useAsync';
import { AsyncView, PageHeader } from '@/shared/ui';
import { DiagnosisSummary } from './DiagnosisSummary';
import { LintPanel } from './LintPanel';
import { NewcomerPanel } from './NewcomerPanel';
import { SituationTable } from './SituationTable';
import { PendingCards } from './PendingCards';
import { QuestionsPanel } from './QuestionsPanel';
import { ReceivedPrescriptions } from './ReceivedPrescriptions';
import './manager.css';

export function ManagerPage() {
  const { id = '' } = useParams();
  const { state } = useStoreData();
  const detail = useAsync(() => api.store(id), [id]);
  const lint = useAsync(() => api.lint(id), [id]);
  const { endCount } = useLive();
  const { setAi } = useApp();
  const first = useRef(true);

  useEffect(() => {
    if (state.data?.ai) setAi(state.data.ai);
  }, [state.data, setAi]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void detail.reload();
    void lint.reload();
  }, [endCount, detail.reload, lint.reload]);

  const refresh = () => {
    void state.reload();
    void lint.reload();
  };

  return <AsyncView state={state}>{(s) => <Workdesk key={s.store.id} s={s} detail={detail} lint={lint} refresh={refresh} />}</AsyncView>;
}

function Workdesk({ s, detail, lint, refresh }: {
  s: StoreState; detail: AsyncState<StoreDetail>; lint: AsyncState<LintIssue[]>; refresh: () => void;
}) {
  const { pathname, hash, search } = useLocation();
  const id = s.store.id;
  const manager = s.people.find((p) => p.role === '점장');
  const pending = s.cards.filter((c) => c.status === 'pending');
  const escalated = s.questions.filter((q) => q.status === 'escalated');
  const situations = s.situations ?? [];
  const onboarding = s.onboarding ?? { storeId: id, items: [], reads: [] };
  const gaps = situations.filter((x) => x.gap).length;
  const preparing = s.people.filter((p) => {
    if (p.role !== '신입') return false;
    const read = new Set(onboarding.reads.filter((r) => r.personId === p.id).map((r) => r.cardId));
    return onboarding.items.some((i) => !read.has(i.cardId));
  }).length;
  const queues = [
    { key: 'questions', label: '답변 대기 질문', count: escalated.length, unit: '건' },
    { key: 'pending', label: '승인 대기 카드', count: pending.length, unit: '건' },
    { key: 'situations', label: '카드 작성 대상', count: gaps, unit: '건' },
    { key: 'newcomers', label: '교육 진행 직원', count: preparing, unit: '명' },
  ];
  const [initialQueue] = useState(() => queues.find((queue) => queue.count > 0)?.key ?? 'questions');
  const query = new URLSearchParams(search);
  const requested = queues.find((queue) => queue.key === hash.slice(1))?.key ?? query.get('queue');
  const active = queues.find((queue) => queue.key === requested)?.key ?? initialQueue;
  return (
    <>
      <PageHeader title="점장 업무 현황" sub={`${s.store.name} · ${manager ? manager.name + ' 점장 · ' : ''}업무일 ${s.today}`}
        actions={<><Link to={{ pathname, search, hash: '#lint' }} className="manager-wiki-link manager-audit-shortcut">위키 점검</Link><Link to={`/store/${id}/wiki`} className="manager-wiki-link"><BookOpen size={15} aria-hidden />매장 위키<ArrowUpRight size={14} aria-hidden /></Link></>} />
      <nav className="manager-queues" aria-label="업무 유형">
        {queues.map(({ key, label, count, unit }) => {
          const params = new URLSearchParams(search);
          params.set('queue', key);
          return <Link key={key} to={{ pathname, search: params.toString() }} aria-current={active === key ? 'page' : undefined}>
            <span>{label}</span><strong className="num">{count}<small>{unit}</small></strong>
          </Link>;
        })}
      </nav>
      <div className="manager-columns">
        <div className="min-w-0">
          <div hidden={active !== 'questions'}>
            <QuestionsPanel storeId={id} questions={s.questions} cards={s.cards} people={s.people} now={s.now ?? s.today} managerId={manager?.id ?? ''} onChanged={refresh} />
          </div>
          <div hidden={active !== 'pending'}><PendingCards storeId={id} cards={pending} people={s.people} onChanged={refresh} /></div>
          <div hidden={active !== 'situations'}><SituationTable storeId={id} situations={situations} topics={s.topics} people={s.people} onChanged={refresh} /></div>
          <div hidden={active !== 'newcomers'}><NewcomerPanel people={s.people} onboarding={onboarding} /></div>
        </div>
        <LintPanel lint={lint} />
      </div>
      <details className="manager-hq">
        <summary><span>본사 진단 및 처방</span><ChevronDown size={17} aria-hidden /></summary>
        <div className="grid items-start gap-4 px-4 pb-4 xl:grid-cols-2">
          <DiagnosisSummary detail={detail} />
          <ReceivedPrescriptions prescriptions={s.prescriptions} storeId={id} />
        </div>
      </details>
    </>
  );
}
