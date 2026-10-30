import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LintIssue } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, CardDetail, Empty, PageHeader, Panel, Sheet, inputCls, useToast, fmtTime } from '@/shared/ui';

type Tone = 'danger' | 'warning' | 'neutral';
const KIND_TONE: Record<LintIssue['kind'], Tone> = {
  상충: 'danger',
  만료: 'danger',
  '효과 낮음': 'danger',
  공백: 'warning',
  '만료 임박': 'warning',
  중복: 'neutral',
  '이유 없음': 'neutral',
  '승인 대기': 'neutral',
};

function Tile({ label, n }: { label: string; n: number }) {
  return (
    <div className="rounded-card bg-surface p-5">
      <p className="text-caption text-ink-weak">{label}</p>
      <p className="mt-1 text-[32px] font-bold leading-10 text-ink-strong">{n}</p>
    </div>
  );
}

export default function Page() {
  const { state, me, refresh } = useLive();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [issues, setIssues] = useState<LintIssue[] | null>(null);
  const [linting, setLinting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const people = state?.people ?? [];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;
  const isManager = people.find((p) => p.id === me)?.role === '점장';
  const questions = useMemo(() => (state?.questions ?? []).filter((q) => q.status === 'escalated'), [state]);
  const pending = useMemo(() => (state?.cards ?? []).filter((c) => c.status === 'pending'), [state]);
  const openCard = state?.cards.find((c) => c.id === openId);

  const runLint = useCallback(async () => {
    setLinting(true);
    try {
      setIssues((await api.lint()).issues);
    } catch (e) {
      toast(e instanceof Error ? e.message : '점검하지 못했어요');
    } finally {
      setLinting(false);
    }
  }, [toast]);

  useEffect(() => {
    void runLint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guard = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : '처리하지 못했어요');
    } finally {
      setBusy(null);
    }
  };

  const resolve = (id: string) =>
    guard(id, async () => {
      const r = await api.resolve(id, drafts[id].trim(), me);
      toast(`질문이 사례 카드 ${r.card.id}가 됐어요`);
      setDrafts((d) => ({ ...d, [id]: '' }));
      await refresh();
    });

  const decide = (id: string, action: 'approve' | 'reject') =>
    guard(id + action, async () => {
      await api.cardAction(id, action);
      toast(action === 'approve' ? '승인했어요' : '반려했어요');
      await refresh();
    });

  const fix = (id: string, action: 'renew' | 'archive') =>
    guard(id + action, async () => {
      await api.cardAction(id, action);
      toast(action === 'renew' ? '갱신했어요' : '보관했어요');
      await refresh();
      await runLint();
    });

  const grouped = useMemo(() => {
    const m = new Map<LintIssue['kind'], LintIssue[]>();
    (issues ?? []).forEach((i) => m.set(i.kind, [...(m.get(i.kind) ?? []), i]));
    return [...m.entries()];
  }, [issues]);

  return (
    <div>
      <PageHeader eyebrow="점장 화면" title="점장 할 일" desc="승인과 답변, 위키 점검을 한곳에서 처리해요." />
      {!isManager && state && <div className="mb-4 rounded-xl bg-warning-weak px-4 py-3 text-[14px] text-warning">점장 화면이에요. 위에서 사람을 점장으로 바꿔 보세요</div>}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="승인 대기 카드" n={pending.length} />
        <Tile label="답을 기다리는 질문" n={questions.length} />
        <Tile label="점검에서 나온 할 일" n={issues?.length ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title="답을 기다리는 질문">
            <p className="mb-3 text-[13px] text-ink-weak">여기 답한 내용은 다음에 같은 질문이 오면 위키가 대신 답해요</p>
            {questions.length === 0 ? (
              <Empty>기다리는 질문이 없어요</Empty>
            ) : (
              <ul className="space-y-4">
                {questions.map((q) => {
                  const asker = people.find((p) => p.id === q.askerId);
                  return (
                    <li key={q.id} className="rounded-xl bg-surface-subtle p-4">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-weak">
                        <Badge>{q.id}</Badge>
                        <span>
                          {asker?.name ?? q.askerId}
                          {asker ? ` · ${asker.role}` : ''} · {fmtTime(q.time)}
                        </span>
                      </div>
                      <p className="mb-3 text-[15px] font-semibold text-ink-strong">{q.text}</p>
                      <textarea className={`${inputCls} min-h-20`} placeholder="신입에게 알려 줄 답을 적어 주세요" value={drafts[q.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} />
                      <Button className="mt-2 w-full" loading={busy === q.id} disabled={!(drafts[q.id] ?? '').trim()} onClick={() => void resolve(q.id)}>
                        답하고 위키에 쌓기
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="승인 대기 카드">
            {pending.length === 0 ? (
              <Empty>승인할 카드가 없어요</Empty>
            ) : (
              <ul className="space-y-4">
                {pending.map((c) => (
                  <li key={c.id} className="rounded-xl bg-surface-subtle p-4">
                    <CardDetail card={c} authorName={nameOf(c.authorId)} />
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1" loading={busy === c.id + 'approve'} onClick={() => void decide(c.id, 'approve')}>
                        승인하기
                      </Button>
                      <Button variant="danger" loading={busy === c.id + 'reject'} onClick={() => void decide(c.id, 'reject')}>
                        반려
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel
          title="위키 점검"
          action={
            <Button size="sm" variant="secondary" loading={linting} onClick={() => void runLint()}>
              점검 실행
            </Button>
          }
        >
          {issues === null ? (
            <Empty>점검하는 중이에요</Empty>
          ) : grouped.length === 0 ? (
            <Empty>문제가 없어요</Empty>
          ) : (
            <div className="space-y-5">
              {grouped.map(([kind, list]) => (
                <div key={kind}>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge tone={KIND_TONE[kind]}>{kind}</Badge>
                    <span className="text-[13px] text-ink-weak">{list.length}건</span>
                  </div>
                  <ul className="space-y-2">
                    {list.map((i, idx) => (
                      <li key={idx} className="rounded-xl bg-surface-subtle p-3">
                        <p className="text-[14px] text-ink-body">{i.detail}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {i.ids.map((id) => {
                            const isCard = !!state?.cards.some((c) => c.id === id);
                            return (
                              <span key={id} className="inline-flex items-center gap-1">
                                <button onClick={() => setOpenId(id)} className="rounded bg-brand-weak px-2 py-0.5 text-[12px] font-semibold text-brand-strong hover:bg-[#D6E8FF]">
                                  {id}
                                </button>
                                {isCard && (
                                  <>
                                    <Button size="sm" variant="secondary" loading={busy === id + 'renew'} onClick={() => void fix(id, 'renew')}>
                                      갱신
                                    </Button>
                                    <Button size="sm" variant="ghost" loading={busy === id + 'archive'} onClick={() => void fix(id, 'archive')}>
                                      보관
                                    </Button>
                                  </>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Sheet open={!!openId} onClose={() => setOpenId(null)}>
        {openCard ? <CardDetail card={openCard} authorName={nameOf(openCard.authorId)} /> : <Empty>카드가 아니거나 찾을 수 없어요 ({openId})</Empty>}
      </Sheet>
    </div>
  );
}
