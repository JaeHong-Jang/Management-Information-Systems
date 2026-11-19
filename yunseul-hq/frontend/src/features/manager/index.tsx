// /store/:id/manager 점장: 오늘 할 일 한 줄 → 넘어온 질문 → 새 알바 준비 상태 → 우리 매장 상황 표 → 승인 대기 카드 → 위키 점검 → (접힘) 받은 처방·진단
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ClipboardList, Clock, MessageCircleQuestion, UserPlus } from 'lucide-react';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { useApp } from '@/app/AppData';
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
  const state = useAsync(() => api.state(id), [id]);
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
    void state.reload();
    void detail.reload();
    void lint.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endCount]);

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
          { href: '#situations', label: '카드 없는 상황', n: gaps, icon: BookOpen },
          { href: '#newcomers', label: '첫 근무 준비 중인 신입', n: preparing, icon: UserPlus, unit: '명' },
          { href: '#pending', label: '승인 대기', n: pending.length, icon: Clock },
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
            <nav aria-label="오늘 할 일" className="mb-5 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
              <ClipboardList size={16} aria-hidden className="text-ink" />
              {todo.map((t, i) => {
                const Icon = t.icon;
                const has = t.n > 0;
                return (
                  <span key={t.href} className="inline-flex items-center gap-2">
                    {i > 0 && <span className="hidden text-text-muted sm:inline" aria-hidden>·</span>}
                    <a href={t.href} className={cx('inline-flex min-h-[40px] items-center gap-1.5 rounded-ctl px-2 text-body hover:bg-ink-weak', has ? 'font-bold text-ink' : 'text-text-muted')}>
                      <Icon size={15} aria-hidden className={has ? 'text-amber-text' : undefined} />
                      {t.label}
                      <span className={cx('num rounded-badge px-1.5', has ? 'bg-yellow text-ink' : 'bg-surface-sunken')}>{t.n}{t.unit ?? ''}</span>
                    </a>
                  </span>
                );
              })}
            </nav>
            <div className="space-y-5">
              <QuestionsPanel storeId={id} questions={s.questions} people={s.people} managerId={manager?.id ?? ''} onChanged={refresh} />
              <NewcomerPanel people={s.people} onboarding={onboarding} />
              <SituationTable storeId={id} situations={situations} topics={s.topics} people={s.people} onChanged={refresh} />
              <PendingCards storeId={id} cards={pending} people={s.people} onChanged={refresh} />
              <LintPanel lint={lint} />
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
