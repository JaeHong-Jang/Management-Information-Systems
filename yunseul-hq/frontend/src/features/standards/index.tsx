// /hq/standards 본사 표준(가상), 매장별 표준 차이, 개정 제안 승인
import { Link } from 'react-router-dom';
import { Check, GitPullRequestArrow, ShieldCheck, X } from 'lucide-react';
import type { StandardProposal } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useAgentNames } from '@/shared/api/harness';
import { useRunAction } from '@/shared/api/useRunAction';
import { useAction, useAsync } from '@/shared/lib/useAsync';
import { AsyncView, Button, Empty, InlineError, PageHeader, Panel, RunProgress, Tag, ViaBadge, VirtualBadge, Details } from '@/shared/ui';
import { date } from '@/shared/lib/format';

const PROPOSAL = { pending: { label: '승인 대기', tone: 'amber' }, approved: { label: '승인됨', tone: 'done' }, rejected: { label: '거절', tone: 'neutral' } } as const;
const DRIFT = { open: { label: '열림', tone: 'amber' }, accepted: { label: '예외 인정', tone: 'neutral' }, fixed: { label: '고침', tone: 'done' } } as const;

export function StandardsPage() {
  const view = useAsync(() => api.standards(), []);
  const { overview } = useApp();
  const names = useAgentNames();
  const act = useAction();
  const promote = useRunAction(() => void view.reload());
  const storeName = new Map((overview.data?.stores ?? []).map((r) => [r.store.id, r.store.name]));

  const decide = async (p: StandardProposal, a: 'approve' | 'reject') => {
    const r = await act.run(`${p.id}:${a}`, () => api.proposal(p.id, a));
    if (r) view.setData((v) => (v ? { ...v, proposals: v.proposals.map((x) => (x.id === r.id ? r : x)) } : v));
  };
  const drift = async (id: string, a: 'accept' | 'fix') => {
    const r = await act.run(`${id}:${a}`, () => api.drift(id, a));
    if (r) view.setData((v) => (v ? { ...v, drifts: v.drifts.map((x) => (x.id === r.id ? r : x)) } : v));
  };

  return (
    <>
      <PageHeader
        title="본사 표준·개정 제안"
        en="STANDARD"
        sub="여기 나오는 본사 표준은 시연용 가상 표준이에요. 실제 역전할머니맥주 본사 규정이 아니에요"
        actions={
          <Button variant="primary" icon={GitPullRequestArrow} busy={promote.active} onClick={() => promote.start(() => api.promote())}>
            공통 문제 개정 제안 만들기
          </Button>
        }
      />
      {promote.runId && (
        <div className="mb-6 rounded-card border border-line bg-surface p-3">
          <RunProgress run={promote.run} names={names} />
        </div>
      )}
      <InlineError message={promote.error ?? act.error} />
      <AsyncView state={view}>
        {(v) => (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <Panel title="개정 제안" en="PROPOSAL" sub="같은 불만이 위험 상위 20개 매장 중 5곳 이상에서 반복되면 위키 관리팀이 제안해요">
                {v.proposals.length === 0 ? (
                  <Empty title="아직 개정 제안이 없어요">'공통 문제 개정 제안 만들기'로 매장 공통 문제를 찾아볼 수 있어요.</Empty>
                ) : (
                  <ul className="space-y-3">
                    {[...v.proposals].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0)).map((p) => {
                      const st = PROPOSAL[p.status];
                      return (
                        <li key={p.id} className="rounded-card border border-line p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Tag tone={st.tone}>{st.label}</Tag>
                                <Tag>{p.standardId ? `표준 ${p.standardId} 개정` : '새 표준'}</Tag>
                                <ViaBadge via={p.via} />
                                <span className="text-caption text-text-muted">{p.id} · {date(p.created)}</span>
                              </div>
                              <h3 className="mt-1.5 font-bold">{p.title}</h3>
                            </div>
                            {p.status === 'pending' && (
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="primary" icon={Check} busy={act.busy === `${p.id}:approve`} onClick={() => decide(p, 'approve')}>승인</Button>
                                <Button size="sm" icon={X} busy={act.busy === `${p.id}:reject`} onClick={() => decide(p, 'reject')}>거절</Button>
                              </div>
                            )}
                          </div>
                          <dl className="mt-2 grid gap-2 text-body md:grid-cols-2">
                            <div><dt className="text-caption text-text-muted">바꿀 내용</dt><dd>{p.change}</dd></div>
                            <div><dt className="text-caption text-text-muted">근거</dt><dd className="text-text-subtle">{p.why}</dd></div>
                          </dl>
                          <p className="mt-2 flex flex-wrap gap-1 text-caption text-text-muted">
                            매장 {p.storeIds.length}곳:
                            {p.storeIds.map((id) => <Link key={id} to={`/hq/stores/${id}`} className="text-ink hover:underline">{storeName.get(id) ?? id}</Link>)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="col-span-12 xl:col-span-7">
              <Panel title="본사 표준" en="STANDARD" actions={<VirtualBadge label="가상 표준" />}>
                {v.standards.length === 0 ? <Empty title="표준이 없어요" /> : (
                  <ul className="divide-y divide-line">
                    {v.standards.map((s) => (
                      <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold">{s.id} {s.title}</span>
                          <Tag>{s.topic}</Tag>
                          <span className="text-caption text-text-muted">{s.version}</span>
                        </div>
                        <p className="mt-1 text-body">{s.rule}</p>
                        <Details summary="이유와 손님 안내 문장" className="mt-1">
                          <p className="text-body text-text-subtle">{s.reason}</p>
                          <p className="bubble mt-1.5 inline-block px-4 py-2 text-body">“{s.customerNotice}”</p>
                        </Details>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="col-span-12 xl:col-span-5">
              <Panel id="drifts" title="매장별 표준 차이" en="DRIFT" sub="리뷰에서 관찰된 매장 자체 규칙">
                {v.drifts.length === 0 ? <Empty title="표준 차이가 없어요" /> : (
                  <ul className="space-y-3">
                    {v.drifts.map((d) => {
                      const st = DRIFT[d.status];
                      return (
                        <li key={d.id} className="rounded-card border border-line p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link to={`/hq/stores/${d.storeId}`} className="font-bold text-ink hover:underline">{storeName.get(d.storeId) ?? d.storeId}</Link>
                            <Tag tone={st.tone}>{st.label}</Tag>
                            <span className="text-caption text-text-muted">표준 {d.standardId} · 리뷰 {d.reviewIds.length}건</span>
                          </div>
                          <p className="mt-1 text-body">{d.observed}</p>
                          {d.status === 'open' && (
                            <div className="mt-2 flex gap-1.5">
                              <Button size="sm" icon={Check} busy={act.busy === `${d.id}:fix`} onClick={() => drift(d.id, 'fix')}>고침 확인</Button>
                              <Button size="sm" icon={ShieldCheck} busy={act.busy === `${d.id}:accept`} onClick={() => drift(d.id, 'accept')}>예외 인정</Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        )}
      </AsyncView>
    </>
  );
}
