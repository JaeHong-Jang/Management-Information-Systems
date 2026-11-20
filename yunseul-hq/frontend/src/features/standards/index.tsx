import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, GitPullRequestArrow, ShieldCheck, X } from 'lucide-react';
import type { HqStandard, RuleDrift, StandardProposal } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useAgentNames } from '@/shared/api/harness';
import { useRunAction } from '@/shared/api/useRunAction';
import { useAction, useAsync } from '@/shared/lib/useAsync';
import { AsyncView, Button, Empty, InlineError, PageHeader, Panel, RunProgress, Tag, ViaBadge } from '@/shared/ui';
import { date } from '@/shared/lib/format';
import './standards.css';

const PROPOSAL = { pending: { label: '승인 대기', tone: 'amber' }, approved: { label: '승인 완료', tone: 'done' }, rejected: { label: '반려', tone: 'neutral' } } as const;
const DRIFT = { open: { label: '검토 대기', tone: 'amber' }, accepted: { label: '예외 인정', tone: 'neutral' }, fixed: { label: '시정 완료', tone: 'done' } } as const;
const tabs = [
  { id: 'proposals', label: '개정 제안' },
  { id: 'drifts', label: '매장별 표준 차이' },
  { id: 'catalog', label: '본사 표준 대장' },
] as const;
type View = typeof tabs[number]['id'];

export function StandardsPage() {
  const view = useAsync(() => api.standards(), []);
  const { overview } = useApp();
  const names = useAgentNames();
  const act = useAction();
  const promote = useRunAction(() => void view.reload());
  const { pathname, hash, search } = useLocation();
  const navigate = useNavigate();
  const requested = hash.slice(1) || new URLSearchParams(search).get('view');
  const storeName = new Map((overview.data?.stores ?? []).map((r) => [r.store.id, r.store.name]));
  const target = (id: View) => {
    const params = new URLSearchParams(search);
    params.set('view', id);
    return { pathname, search: params.toString() };
  };

  const decide = async (p: StandardProposal, a: 'approve' | 'reject') => {
    if (requested !== 'proposals') navigate(target('proposals'), { replace: true });
    const r = await act.run(`${p.id}:${a}`, () => api.proposal(p.id, a));
    if (r) view.setData((v) => v ? { ...v, proposals: v.proposals.map((x) => x.id === r.id ? r : x) } : v);
  };
  const drift = async (id: string, a: 'accept' | 'fix') => {
    if (requested !== 'drifts') navigate(target('drifts'), { replace: true });
    const r = await act.run(`${id}:${a}`, () => api.drift(id, a));
    if (r) view.setData((v) => v ? { ...v, drifts: v.drifts.map((x) => x.id === r.id ? r : x) } : v);
  };
  const generate = () => {
    navigate(target('proposals'));
    void promote.start(() => api.promote());
  };

  return (
    <>
      <PageHeader title="표준 개정 관리" sub="시연용 가상 표준에 따른 매장별 운영 차이 및 개정 이력"
        actions={<Button variant="primary" icon={GitPullRequestArrow} busy={promote.active} onClick={generate}>개정 제안 생성</Button>} />
      {promote.runId && <div className="mb-4 rounded-card border border-line bg-surface p-3"><RunProgress run={promote.run} names={names} /></div>}
      <InlineError message={promote.error ?? act.error} />
      <AsyncView state={view}>
        {(v) => {
          const active = tabs.find((t) => t.id === requested)?.id
            ?? (v.proposals.some((p) => p.status === 'pending') ? 'proposals' : v.drifts.some((d) => d.status === 'open') ? 'drifts' : 'catalog');
          const counts = { proposals: v.proposals.length, drifts: v.drifts.length, catalog: v.standards.length };
          const pending = v.proposals.filter((p) => p.status === 'pending').length;
          const open = v.drifts.filter((d) => d.status === 'open').length;
          return (
            <div className="standards-register">
              <nav className="standards-views" aria-label="표준 관리 업무">
                {tabs.map((t) => <Link key={t.id} to={target(t.id)} aria-current={active === t.id ? 'page' : undefined}>{t.label} <b className="num">{counts[t.id]}</b></Link>)}
              </nav>
              {active === 'drifts' && <Panel id="drifts" title="매장별 표준 차이" sub={`검토 대기 ${open}건 · 전체 ${v.drifts.length}건`} bodyClass="!p-0">
                {!v.drifts.length ? <div className="p-4"><Empty title="등록된 표준 차이 없음" /></div> : (
                  <div className="standard-drifts">
                    <div className="standard-drift-head" aria-hidden="true"><span>상태 · 매장</span><span>검토 근거</span><span>처리</span></div>
                    <ul>{[...v.drifts].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open')).map((d) => (
                      <DriftRow key={d.id} d={d} store={storeName.get(d.storeId) ?? d.storeId} standard={v.standards.find((s) => s.id === d.standardId)} busy={act.busy} onDecide={drift} />
                    ))}</ul>
                  </div>
                )}
              </Panel>}
              {active === 'proposals' && <Panel title="개정 제안 심사" sub={`승인 대기 ${pending}건 · 위험 상위 20개 매장 중 5곳 이상에서 반복된 불만 대상`}>
                {!v.proposals.length ? <Empty title="등록된 개정 제안 없음">‘개정 제안 생성’ 실행 시 매장 공통 문제 조회</Empty> : (
                  <ul className="divide-y divide-line">{[...v.proposals].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')).map((p) => (
                    <li key={p.id} className="standard-proposal">
                      <div className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
                        <Tag tone={PROPOSAL[p.status].tone}>{PROPOSAL[p.status].label}</Tag><span>{p.id} · {date(p.created)}</span><ViaBadge via={p.via} />
                      </div>
                      <h3>{p.title}</h3>
                      <dl className="standard-facts">
                        <dt>대상 표준</dt><dd>{p.standardId ?? '신규 표준'}</dd>
                        <dt>개정안</dt><dd>{p.change}</dd>
                        <dt>제안 근거</dt><dd>{p.why}</dd>
                        <dt>관련 매장</dt><dd className="flex flex-wrap gap-x-2 gap-y-1">{p.storeIds.map((sid) => <Link key={sid} to={`/hq/stores/${sid}`}>{storeName.get(sid) ?? sid}</Link>)}{!p.storeIds.length && '등록 없음'}</dd>
                      </dl>
                      {p.status === 'pending' && <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="primary" icon={Check} disabled={!!act.busy} busy={act.busy === `${p.id}:approve`} onClick={() => decide(p, 'approve')}>개정 승인</Button>
                        <Button size="sm" icon={X} disabled={!!act.busy} busy={act.busy === `${p.id}:reject`} onClick={() => decide(p, 'reject')}>반려</Button>
                      </div>}
                    </li>
                  ))}</ul>
                )}
              </Panel>}
              {active === 'catalog' && <StandardCatalog standards={v.standards} />}
            </div>
          );
        }}
      </AsyncView>
    </>
  );
}

function DriftRow({ d, store, standard, busy, onDecide }: {
  d: RuleDrift; store: string; standard?: HqStandard; busy: string | null; onDecide: (id: string, action: 'accept' | 'fix') => void;
}) {
  const status = DRIFT[d.status];
  const countNote = `(리뷰 ${d.reviewIds.length}건)`;
  const observation = d.observed.endsWith(countNote) ? d.observed.slice(0, -countNote.length).trimEnd() : d.observed;
  return <li className="standard-drift">
    <div><Tag tone={status.tone}>{status.label}</Tag><Link className="standard-store" to={`/hq/stores/${d.storeId}`}>{store} <ChevronRight size={13} aria-hidden /></Link></div>
    <dl className="standard-facts">
      <dt>적용 표준</dt><dd>{standard?.title ?? d.standardId}{standard && <span className="standard-ref">{d.standardId}</span>}</dd>
      <dt>관찰 내용</dt><dd>{observation}</dd>
      <dt>관련 리뷰</dt><dd>{d.reviewIds.length}건</dd>
    </dl>
    <div className="standard-decide">
      {d.status === 'open' ? <>
        <Button size="sm" icon={Check} disabled={!!busy} busy={busy === `${d.id}:fix`} onClick={() => onDecide(d.id, 'fix')}>시정 확인</Button>
        <Button size="sm" icon={ShieldCheck} disabled={!!busy} busy={busy === `${d.id}:accept`} onClick={() => onDecide(d.id, 'accept')}>예외 인정</Button>
      </> : <span className="text-caption text-text-muted">처리 완료</span>}
    </div>
  </li>;
}

function StandardCatalog({ standards }: { standards: HqStandard[] }) {
  const [id, setId] = useState('');
  const selected = standards.find((s) => s.id === id) ?? standards[0];
  return <Panel title="본사 표준 대장" sub={`가상 표준 ${standards.length}건`} bodyClass="!p-0">
    {!selected ? <div className="p-4"><Empty title="등록된 표준 없음" /></div> : <div className="standard-catalog">
      <ul className="standard-index">{standards.map((s) => <li key={s.id}><button type="button" aria-pressed={s.id === selected.id} onClick={() => setId(s.id)}>
        <span className="num">{s.id}</span><strong>{s.topic}</strong><ChevronRight size={13} aria-hidden />
      </button></li>)}</ul>
      <article className="standard-reader" aria-live="polite">
        <p className="text-caption text-text-muted">{selected.id} · {selected.topic} · {selected.version}</p>
        <h3>{selected.title}</h3>
        <dl className="standard-facts">
          <dt>운영 기준</dt><dd>{selected.rule}</dd>
          <dt>설정 근거</dt><dd>{selected.reason}</dd>
          <dt>고객 안내</dt><dd><q>{selected.customerNotice}</q></dd>
        </dl>
      </article>
    </div>}
  </Panel>;
}
