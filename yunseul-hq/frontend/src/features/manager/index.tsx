// /store/:id/manager 점장: 오늘 할 일 숫자 타일 4개(누르면 그 구역으로) → 두 열(≥1280).
// 왼쪽(처리할 것): 넘어온 질문 → 승인 대기 카드. 오른쪽 340px(지켜볼 것): 새 알바 준비 상태 → 위키 점검.
// 그 아래 전체 폭: 우리 매장 상황 표(열이 많아 좁은 열에 넣지 않는다) → (접힘) 받은 처방·진단. 1280 미만은 같은 순서로 한 열.
import { useEffect, useRef, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Clock, MessageCircleQuestion, UserPlus, type LucideIcon } from 'lucide-react';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useApp } from '@/app/AppData';
import { useStoreData } from '@/app/StoreData';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, PageHeader } from '@/shared/ui';
import { cx } from '@/shared/lib/format';
import { DiagnosisSummary } from './DiagnosisSummary';
import { LintPanel } from './LintPanel';
import { NewcomerPanel } from './NewcomerPanel';
import { SituationTable } from './SituationTable';
import { PendingCards } from './PendingCards';
import { QuestionsPanel } from './QuestionsPanel';
import { ReceivedPrescriptions } from './ReceivedPrescriptions';

export function ManagerPage() {
  const { id = '' } = useParams();
  const { state } = useStoreData(); // 셸과 같이 쓰는 매장 상태(실행 끝·15초마다 갱신)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endCount]);

  const scrollTo = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const refresh = () => {
    void state.reload();
    void lint.reload();
  };

  return (
    <AsyncView state={state}>
      {(s) => {
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
        const todo = [
          { href: '#questions', label: '넘어온 질문', n: escalated.length, icon: MessageCircleQuestion },
          { href: '#situations', label: '카드 없는 상황', n: gaps, icon: BookOpen, unit: '개' },
          { href: '#newcomers', label: '준비 중인 신입', n: preparing, icon: UserPlus, unit: '명' },
          { href: '#pending', label: '승인 대기 카드', n: pending.length, icon: Clock, unit: '장' },
        ];
        return (
          <>
            <PageHeader
              title="오늘 할 일"
              en="TODAY"
              sub={`${s.store.name} · ${s.today} · ${manager ? `${manager.name} 점장` : '점장'}`}
              actions={
                <Link to={`/store/${id}/wiki`} className="inline-flex h-10 items-center gap-1.5 rounded-ctl border border-line-strong bg-surface px-3 text-body text-ink hover:bg-ink-weak">
                  <BookOpen size={15} aria-hidden />
                  매장 위키 열기
                </Link>
              }
            />
            <nav aria-label="오늘 할 일" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {todo.map((t) => (
                <TodoTile key={t.href} {...t} onJump={(e) => scrollTo(e, t.href)} />
              ))}
            </nav>
            <div className="space-y-5">
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 space-y-5">
                  <QuestionsPanel storeId={id} questions={s.questions} cards={s.cards} people={s.people} now={s.now ?? s.today} managerId={manager?.id ?? ''} onChanged={refresh} />
                  <PendingCards storeId={id} cards={pending} people={s.people} onChanged={refresh} />
                </div>
                <aside className="min-w-0 space-y-5" aria-label="지켜볼 것">
                  <NewcomerPanel people={s.people} onboarding={onboarding} />
                  <LintPanel lint={lint} />
                </aside>
              </div>
              <SituationTable storeId={id} situations={situations} topics={s.topics} people={s.people} onChanged={refresh} />
              <details className="rounded-card border border-line bg-surface shadow-card">
                <summary className="min-h-[48px] cursor-pointer select-none px-4 py-3 font-display text-section">본사에서 받은 처방과 진단 요약 보기</summary>
                <div className="grid grid-cols-12 gap-5 p-4 pt-0">
                  <div className="col-span-12 xl:col-span-7"><DiagnosisSummary detail={detail} /></div>
                  <div className="col-span-12 xl:col-span-5"><ReceivedPrescriptions prescriptions={s.prescriptions} storeId={id} /></div>
                </div>
              </details>
            </div>
          </>
        );
      }}
    </AsyncView>
  );
}

/** 오늘 할 일 숫자 타일: 누르면 그 구역으로. 할 일이 있으면 노랑 바닥선 + 진한 숫자, 없으면 흐리게 */
function TodoTile({ href, label, n, unit, icon: Icon, onJump }: { href: string; label: string; n: number; unit?: string; icon: LucideIcon; onJump: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const has = n > 0;
  return (
    <a href={href} onClick={onJump} className="relative min-w-0 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card hover:border-line-strong hover:bg-ink-weak">
      <span className="flex items-center gap-1.5 text-caption text-text-muted">
        <Icon size={14} aria-hidden className={has ? 'text-amber-text' : undefined} />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-2 flex items-baseline gap-1">
        <span className={cx('num text-kpi tracking-tight', has ? 'text-ink' : 'text-text-muted')}>{n}</span>
        <span className="text-caption text-text-muted">{unit ?? '건'}</span>
      </span>
      <span className="mt-1 block truncate text-caption text-text-muted">{has ? '눌러서 바로 보기' : '지금은 없어요'}</span>
      {has && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-yellow" aria-hidden />}
    </a>
  );
}
