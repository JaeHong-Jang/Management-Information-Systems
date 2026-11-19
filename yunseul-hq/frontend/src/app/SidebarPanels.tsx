// 사이드바(≥1024)의 메뉴 밖 세 칸: 위 '지금 맥락' 카드(누구·어느 매장·오늘 + 주 행동 하나) · 메뉴 아래 실데이터 짧은 목록 · 맨 아래 상태와 고지.
// 가짜 메뉴로 채우지 않는다. 목록 항목은 모두 눌러서 해당 화면·구역으로 간다. 휴대폰에서는 사이드바가 없으니 본문이 같은 정보를 이미 갖고 있다.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircleQuestion, Store as StoreIcon } from 'lucide-react';
import type { Question } from '@shared/contracts';
import { agoLabel, cx, minutesBetween } from '@/shared/lib/format';
import { useApp, type AppRole } from './AppData';
import { useStoreData } from './StoreData';

const AI_LABEL = { claude: 'Claude', ollama: 'Ollama', rules: '규칙' } as const;

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-line bg-surface-sunken px-3 py-3">{children}</div>;
}

function Action({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="mt-3 flex min-h-[40px] items-center justify-between gap-2 rounded-ctl bg-ink px-3 text-body font-bold text-white hover:bg-ink/90">
      {children}
      <ArrowRight size={15} aria-hidden />
    </Link>
  );
}

function Bar({ done, total }: { done: number; total: number }) {
  const w = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
      <span className="block h-full rounded-full bg-ink" style={{ width: `${w}%` }} />
    </span>
  );
}

/** 메뉴 아래 목록: 제목 + 최대 3줄 + 빈 상태 한 줄 */
function DataList({ title, more, empty, children }: { title: string; more?: { to: string; label: string }; empty: string; children: ReactNode[] }) {
  return (
    <section className="mt-6 px-2" aria-label={title}>
      <p className="flex items-center justify-between pb-1.5 text-caption text-text-muted">
        {title}
        {more && children.length > 0 && <Link to={more.to} className="hover:text-ink hover:underline">{more.label}</Link>}
      </p>
      {children.length === 0 ? <p className="rounded-ctl border border-dashed border-line-strong px-2.5 py-2 text-caption text-text-muted">{empty}</p> : <ul className="space-y-1">{children}</ul>}
    </section>
  );
}

function Row({ to, dot, text, meta }: { to: string; dot: 'yellow' | 'ink' | 'muted'; text: string; meta: string }) {
  return (
    <li>
      <Link to={to} className="flex items-start gap-2 rounded-ctl px-1.5 py-1.5 hover:bg-ink-weak">
        <span className={cx('mt-[7px] h-2 w-2 shrink-0 rounded-full', dot === 'yellow' ? 'bg-yellow' : dot === 'ink' ? 'bg-ink' : 'bg-line-strong')} aria-hidden />
        <span className="min-w-0">
          <span className="line-clamp-2 text-caption text-text">{text}</span>
          <span className="block text-[0.6875rem] text-text-muted">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------- 위: 지금 맥락

export function SidebarTop({ role }: { role: AppRole }) {
  if (role === 'SV') return <HqTop />;
  return role === '점장' ? <ManagerTop /> : <StaffTop />;
}

function StaffTop() {
  const { state, storeId, me, staff } = useStoreData();
  const s = state.data;
  const person = staff.find((p) => p.id === me);
  if (!s || !storeId) return null;
  const ob = s.onboarding;
  const total = ob?.items.length ?? 0;
  const done = person && ob ? new Set(ob.reads.filter((r) => r.personId === person.id).map((r) => r.cardId)).size : 0;
  const preparing = person?.role === '신입' && total > 0 && done < total;
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-caption text-text-muted"><StoreIcon size={13} aria-hidden />{s.store.name} · <span className="num">{s.today}</span></p>
      <p className="mt-1 text-body font-bold text-ink">{person ? `${person.name}` : '누구인지 골라 주세요'}{person && <span className="ml-1 font-normal text-text-muted">{person.role} · {person.tenure}</span>}</p>
      {preparing && (
        <Link to={`/store/${storeId}/staff?tab=prep`} className="mt-2 block rounded-ctl hover:bg-ink-weak">
          <span className="flex justify-between text-caption text-text-subtle">첫 근무 준비<span className="num">{Math.min(done, total)}/{total}</span></span>
          <Bar done={done} total={total} />
        </Link>
      )}
      <Action to={`/store/${storeId}/staff?tab=home#ask`}>막혔어요 · 물어보기</Action>
    </Card>
  );
}

function ManagerTop() {
  const { state, storeId, escalated } = useStoreData();
  const s = state.data;
  if (!s || !storeId) return null;
  const manager = s.people.find((p) => p.role === '점장');
  const pending = s.cards.filter((c) => c.status === 'pending').length;
  const base = `/store/${storeId}/manager`;
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-caption text-text-muted"><StoreIcon size={13} aria-hidden />{s.store.name} · <span className="num">{s.today}</span></p>
      <p className="mt-1 text-body font-bold text-ink">{manager ? `${manager.name} 점장` : '점장'}</p>
      <p className="mt-1 text-caption text-text-subtle">
        넘어온 질문 <b className="num text-ink">{escalated}</b> · 승인 대기 <b className="num text-ink">{pending}</b>
      </p>
      {escalated > 0 ? <Action to={`${base}#questions`}>넘어온 질문 답하기</Action> : pending > 0 ? <Action to={`${base}#pending`}>승인 대기 카드 보기</Action> : <Action to={`${base}#situations`}>카드 없는 상황 보기</Action>}
    </Card>
  );
}

function HqTop() {
  const { overview, targetId, targetName } = useApp();
  const o = overview.data;
  if (!o) return null;
  return (
    <Card>
      <p className="text-caption text-text-muted">{o.brand.name} · <span className="num">{o.today}</span></p>
      <p className="mt-1 text-body font-bold text-ink">순위 매긴 매장 <span className="num">{o.kpis.rankedStores}</span>곳</p>
      <p className="text-caption text-text-muted">전체 <span className="num">{o.stores.length}</span>곳 중 별점 10개 이상</p>
      <p className="mt-1 text-caption text-text-subtle">
        고위험 <b className={cx('num', o.kpis.highRisk > 0 ? 'text-red' : 'text-ink')}>{o.kpis.highRisk}</b> · 열린 표준 차이 <b className="num text-ink">{o.kpis.openDrifts}</b>
      </p>
      {targetId && <Action to={`/hq/stores/${targetId}`}>{targetName} 보기</Action>}
    </Card>
  );
}

// ---------------------------------------------------------------- 메뉴 아래: 실데이터 목록

export function SidebarData({ role }: { role: AppRole }) {
  if (role === 'SV') return <HqData />;
  return role === '점장' ? <ManagerData /> : <StaffData />;
}

const qStatus = (q: Question): { dot: 'yellow' | 'ink' | 'muted'; label: string } =>
  q.managerAnswer ? { dot: 'yellow', label: '답 옴' } : q.status === 'escalated' ? { dot: 'muted', label: '점장님 대기' } : { dot: 'ink', label: '카드로 답함' };

function StaffData() {
  const { state, storeId, me } = useStoreData();
  const s = state.data;
  if (!s || !storeId || !me) return null;
  const mine = s.questions.filter((q) => q.askerId === me).sort((a, b) => b.time.localeCompare(a.time));
  const now = s.now ?? s.today;
  return (
    <DataList title="내 질문" empty="아직 물어본 게 없어요" more={mine.length > 3 ? { to: `/store/${storeId}/staff?tab=home#my-q`, label: `${mine.length}개 모두` } : undefined}>
      {mine.slice(0, 3).map((q) => {
        const st = qStatus(q);
        return <Row key={q.id} to={`/store/${storeId}/staff?tab=home#my-q`} dot={st.dot} text={q.text} meta={`${st.label} · ${agoLabel(minutesBetween(now, q.time))}`} />;
      })}
    </DataList>
  );
}

function ManagerData() {
  const { state, storeId } = useStoreData();
  const s = state.data;
  if (!s || !storeId) return null;
  const gaps = (s.situations ?? []).filter((x) => x.gap);
  return (
    <DataList title="카드 없는 상황" empty="자주 나오는 상황에 모두 매장 카드가 있어요">
      {gaps.slice(0, 3).map((g) => (
        <Row key={g.id} to={`/store/${storeId}/manager#situations`} dot="yellow" text={g.title} meta={`리뷰 불만 ${g.storeReviews}건`} />
      ))}
    </DataList>
  );
}

function HqData() {
  const { overview } = useApp();
  const o = overview.data;
  if (!o) return null;
  const top = o.stores.filter((r) => r.score.rank != null).slice(0, 3);
  return (
    <DataList title="위험 상위 매장" empty="순위를 낼 매장이 없어요" more={{ to: '/hq', label: '전체' }}>
      {top.map((r) => (
        <Row key={r.store.id} to={`/hq/stores/${r.store.id}`} dot={r.score.risk >= 70 ? 'yellow' : 'muted'} text={`${r.score.rank}위 ${r.store.name}`} meta={`위험 ${r.score.risk} · ${r.store.region}`} />
      ))}
    </DataList>
  );
}

// ---------------------------------------------------------------- 맨 아래: 상태와 고지

export function SidebarFoot({ role }: { role: AppRole }) {
  const { ai } = useApp();
  return (
    <div className="mt-auto space-y-2 px-2 pt-6">
      {ai && role !== '직원' && (
        <p className="flex items-start gap-2 text-caption text-text-subtle" title={ai.lastError ? `최근 LLM 오류: ${ai.lastError}` : undefined}>
          <span className={cx('mt-[6px] h-2 w-2 shrink-0 rounded-full', ai.lastError ? 'bg-yellow' : ai.mode === 'rules' ? 'bg-line-strong' : 'bg-ink')} aria-hidden />
          <span>
            {ai.mode === 'rules' ? '규칙 모드예요. 숫자와 분류는 규칙 코드가 내요.' : ai.lastError ? `AI ${AI_LABEL[ai.mode]} 오류로 규칙으로 대신했어요.` : `AI ${AI_LABEL[ai.mode]} 켜짐. 숫자는 규칙 코드가 내요.`}
          </span>
        </p>
      )}
      {role === '직원' && (
        <p className="flex items-start gap-2 text-caption text-text-subtle">
          <MessageCircleQuestion size={14} className="mt-[3px] shrink-0" aria-hidden />
          카드에 없는 일은 점장님께 넘어가요. 다치거나 다툼이 나면 바로 점장님을 불러 주세요.
        </p>
      )}
      <p className="border-t border-line pt-2 text-caption text-text-muted">브랜드는 실명, 매장은 익명이에요. 본사 표준과 처방 이후 리뷰는 가상이에요.</p>
    </div>
  );
}
