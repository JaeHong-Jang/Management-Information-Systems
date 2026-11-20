// 사이드바(≥1024)의 메뉴 밖 세 칸: 위 '지금 맥락' 카드(누구·어느 매장·오늘 + 주 행동 하나) · 메뉴 아래 실데이터 짧은 목록 · 맨 아래 상태와 고지.
// 가짜 메뉴로 채우지 않는다. 목록 항목은 모두 눌러서 해당 화면·구역으로 간다. 휴대폰에서는 사이드바가 없으니 본문이 같은 정보를 이미 갖고 있다.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Radio, Store as StoreIcon, WifiOff } from 'lucide-react';
import type { Question } from '@shared/contracts';
import { useLive } from '@/shared/api/live';
import { agoLabel, cx, minutesBetween } from '@/shared/lib/format';
import { useApp, type AppRole } from './AppData';
import { useStoreData } from './StoreData';

const AI_LABEL = { claude: 'Claude', ollama: 'Ollama', rules: '규칙' } as const;

function Card({ children }: { children: ReactNode }) {
  return <div className="side-context">{children}</div>;
}

function Action({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="side-context-action">
      {children}
      <ArrowRight size={15} aria-hidden />
    </Link>
  );
}

function Bar({ done, total }: { done: number; total: number }) {
  const w = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-line" aria-hidden>
      <span className="block h-full rounded-full bg-ink" style={{ width: `${w}%` }} />
    </span>
  );
}

/** 메뉴 아래 목록: 제목 + 최대 3줄 + 빈 상태 한 줄 */
function DataList({ title, more, empty, children }: { title: string; more?: { to: string; label: string }; empty: string; children: ReactNode[] }) {
  return (
    <section className="side-data" aria-label={title}>
      <p className="side-data-heading">
        {title}
        {more && children.length > 0 && <Link to={more.to} className="hover:underline">{more.label}</Link>}
      </p>
      {children.length === 0 ? <p className="side-empty">{empty}</p> : <ul className="space-y-1">{children}</ul>}
    </section>
  );
}

function Row({ to, dot, text, meta }: { to: string; dot: 'yellow' | 'ink' | 'muted'; text: string; meta: string }) {
  return (
    <li>
      <Link to={to} className="side-row">
        <span className={cx('mt-[7px] h-2 w-2 shrink-0 rounded-full', dot === 'yellow' ? 'bg-yellow' : dot === 'ink' ? 'bg-ink' : 'bg-low-bar')} aria-hidden />
        <span className="min-w-0">
          <span className="line-clamp-2 text-caption">{text}</span>
          <span className="side-row-meta">{meta}</span>
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

function StoreIdentity({ name, detail, hq = false }: { name: string; detail: string; hq?: boolean }) {
  const Icon = hq ? Building2 : StoreIcon;
  return (
    <div className="side-identity-line">
      <span className="side-store-icon"><Icon size={20} strokeWidth={1.7} aria-hidden /></span>
      <div><p>{detail}</p><strong>{name}</strong></div>
    </div>
  );
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
      <StoreIdentity name={s.store.name} detail={person ? `${person.name} · ${person.role}` : '직원 업무공간'} />
      {preparing && (
        <Link to={`/store/${storeId}/staff?tab=prep`} className="mt-2 block rounded-ctl hover:underline">
          <span className="flex justify-between text-caption text-text-muted">첫 근무 준비<span className="num">{Math.min(done, total)}/{total}</span></span>
          <Bar done={done} total={total} />
        </Link>
      )}
      <Action to={`/store/${storeId}/staff?tab=home#ask`}>현장 질문 작성</Action>
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
      <StoreIdentity name={s.store.name} detail={manager ? `${manager.name} 점장` : '점장 업무공간'} />
      <p className="mt-1 text-caption">
        답변 대기 <b className="num text-ink">{escalated}</b> · 승인 대기 <b className="num text-ink">{pending}</b>
      </p>
      {escalated > 0 ? <Action to={`${base}#questions`}>질문 답변</Action> : pending > 0 ? <Action to={`${base}#pending`}>카드 승인 검토</Action> : <Action to={`${base}#situations`}>미등록 사례 확인</Action>}
    </Card>
  );
}

function HqTop() {
  const { overview, targetId, targetName } = useApp();
  const o = overview.data;
  if (!o) return null;
  return (
    <Card>
      <StoreIdentity hq name={o.brand.name} detail="본사 업무공간" />
      <p className="mt-3 text-caption">순위 산정 매장 <span className="num">{o.kpis.rankedStores}</span>곳</p>
      <p className="text-caption">전체 <span className="num">{o.stores.length}</span>곳 · 평점 10건 이상 기준</p>
      <p className="mt-1 text-caption">
        고위험 <b className={cx('num', o.kpis.highRisk > 0 ? 'text-amber-text' : 'text-ink')}>{o.kpis.highRisk}</b> · 미해결 표준 차이 <b className="num text-ink">{o.kpis.openDrifts}</b>
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
  q.managerAnswer ? { dot: 'yellow', label: '답변 등록' } : q.status === 'escalated' ? { dot: 'muted', label: '점장 답변 대기' } : { dot: 'ink', label: '카드 답변' };

function StaffData() {
  const { state, storeId, me } = useStoreData();
  const s = state.data;
  if (!s || !storeId || !me) return null;
  const mine = s.questions.filter((q) => q.askerId === me).sort((a, b) => b.time.localeCompare(a.time));
  const now = s.now ?? s.today;
  return (
    <DataList title="내 질문" empty="등록된 질문 없음" more={mine.length > 3 ? { to: `/store/${storeId}/staff?tab=home#my-q`, label: `${mine.length}개 모두` } : undefined}>
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
    <DataList title="사례 카드 미등록" empty="미등록 사례 없음">
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
    <DataList title="위험 상위 매장" empty="순위 산정 대상 없음" more={{ to: '/hq', label: '전체' }}>
      {top.map((r) => (
        <Row key={r.store.id} to={`/hq/stores/${r.store.id}`} dot={r.score.risk >= 70 ? 'yellow' : 'muted'} text={`${r.score.rank}위 ${r.store.name}`} meta={`위험 ${r.score.risk} · ${r.store.region}`} />
      ))}
    </DataList>
  );
}

// ---------------------------------------------------------------- 맨 아래: 상태와 고지

export function SidebarFoot({ role }: { role: AppRole }) {
  const { ai } = useApp();
  const { connected } = useLive();
  const Icon = connected ? Radio : WifiOff;
  return (
    <div className="side-foot">
      <p className={cx('side-status', connected && 'connected')}><Icon size={15} aria-hidden />{connected ? '실시간 연결' : '연결 대기'}{role !== '직원' && ai && <span>AI {AI_LABEL[ai.mode]}</span>}</p>
      <p>매장명 익명 처리 · 시연 기준과 처방 결과에 가상 표지 적용</p>
    </div>
  );
}
