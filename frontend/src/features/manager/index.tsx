import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Card, LintIssue } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, CardDetail, Empty, PageHeader, Panel, Sheet, inputCls, sourceTone, useToast, fmtTime } from '@/shared/ui';

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
  '재고 차이': 'warning',
  '보정 제안': 'warning',
  '레시피 대기': 'warning',
  '사용량 이탈': 'neutral',
};

function Tile({ label, n }: { label: string; n: number }) {
  return (
    <span className="rounded-lg bg-surface px-3 py-1.5 text-[13px] text-ink-weak">
      {label} <b className="text-ink-body">{n}</b>
    </span>
  );
}

function Mini({ card, side, onPick, busy }: { card: Card; side: string; onPick: () => void; busy: boolean }) {
  return (
    <div className="flex flex-col rounded-xl bg-surface p-3">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Badge>{card.id}</Badge>
        <Badge tone={sourceTone(card.source)}>{card.source}</Badge>
      </div>
      <p className="text-[14px] font-semibold text-ink-strong">{card.title}</p>
      <p className="mt-2 text-[12px] text-ink-weak">대응</p>
      <ol className="list-decimal pl-4 text-[13px] text-ink-body">
        {card.actions.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ol>
      {card.avoid && (
        <>
          <p className="mt-2 text-[12px] text-ink-weak">하면 안 되는 것</p>
          <p className="text-[13px] text-ink-body">{card.avoid}</p>
        </>
      )}
      <Button size="sm" variant="secondary" className="mt-3" loading={busy} onClick={onPick}>
        {side}
      </Button>
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
  const [renewId, setRenewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ keep: string; drop: string } | null>(null);
  const [reason, setReason] = useState('');
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const people = state?.people ?? [];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;
  const isManager = people.find((p) => p.id === me)?.role === '점장';
  const questions = useMemo(() => (state?.questions ?? []).filter((q) => q.status === 'escalated'), [state]);
  const pending = useMemo(() => (state?.cards ?? []).filter((c) => c.status === 'pending'), [state]);
  const openCard = state?.cards.find((c) => c.id === openId);
  const renewCard = state?.cards.find((c) => c.id === renewId);
  const cardOf = (id: string) => state?.cards.find((c) => c.id === id);

  const runLint = useCallback(async (quiet = false) => {
    setLinting(true);
    try {
      setIssues((await api.lint(quiet)).issues);
    } catch (e) {
      toast(e instanceof Error ? e.message : '점검하지 못했어요');
    } finally {
      setLinting(false);
    }
  }, [toast]);

  useEffect(() => {
    void runLint(true);
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
      toast(r.card.status === 'pending' ? '표현을 다듬어야 해서 승인 대기로 저장했어요' : `질문이 사례 카드 ${r.card.id}가 됐어요`);
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
      setRenewId(null);
      await refresh();
      await runLint();
    });

  const unify = (keep: string, drop: string, reason = '') =>
    guard(drop + 'archive', async () => {
      await api.cardAction(drop, 'archive', undefined, reason || `${keep} 기준으로 통일`);
      toast(`${keep} 기준으로 통일하고 ${drop}는 보관했어요${reason ? ` (사유: ${reason})` : ''}`);
      setConfirm(null);
      await refresh();
      await runLint();
    });

  const pickSide = (keep: Card, drop: Card) => {
    if (drop.source === '공식규정') {
      setReason('');
      setConfirm({ keep: keep.id, drop: drop.id });
    } else void unify(keep.id, drop.id);
  };

  const goto = (elId: string) => document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const { perCard, others } = useMemo(() => {
    const m = new Map<string, LintIssue[]>();
    const rest: LintIssue[] = [];
    (issues ?? []).forEach((i) => {
      const cardIds = i.ids.filter((id) => state?.cards.some((c) => c.id === id));
      if (i.kind === '공백' || i.kind === '승인 대기' || cardIds.length === 0) rest.push(i);
      else cardIds.forEach((id) => m.set(id, [...(m.get(id) ?? []), i]));
    });
    return { perCard: [...m.entries()].sort(([a], [b]) => a.localeCompare(b)), others: rest };
  }, [issues, state]);

  const todos = useMemo(() => {
    const list: { key: string; text: string; cta: string; go: () => void }[] = [];
    [...questions]
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach((q) => list.push({ key: q.id, text: `질문 · ${q.text}`, cta: '답하러 가기', go: () => goto('q-' + q.id) }));
    (issues ?? []).filter((i) => i.kind === '상충').forEach((i, n) => list.push({ key: '상충' + n, text: `${i.ids.join('와 ')} 내용이 서로 달라요`, cta: '정리하기', go: () => { setShowAll(true); setTimeout(() => goto('lint-' + i.ids[0]), 50); } }));
    (issues ?? []).filter((i) => i.kind === '만료').forEach((i, n) => list.push({ key: '만료' + n, text: `${i.ids.join(', ')} 만료됐어요`, cta: '확인하기', go: () => (i.ids[0] ? setRenewId(i.ids[0]) : undefined) }));
    // 재고 일은 재고·발주 화면에서 처리한다
    const stock = (issues ?? []).filter((i) => i.kind === '재고 차이' || i.kind === '보정 제안' || i.kind === '레시피 대기');
    if (stock.length) list.push({ key: '재고', text: `재고 · ${stock.map((i) => (i.kind === '재고 차이' ? i.detail.split(' 마감')[0].replace(/ \d{4}-\d{2}-\d{2}$/, '') + ' 실사 차이' : i.kind)).join(', ')}`, cta: '재고 화면에서 보기', go: () => navigate('/inventory') });
    return list.slice(0, 3);
  }, [questions, issues, navigate]);

  return (
    <div>
      <PageHeader eyebrow="점장 화면" title="점장 할 일" desc="승인과 답변, 위키 점검을 한곳에서 처리해요." />
      {!isManager && state && <p className="mb-4 text-[13px] text-ink-weak">점장 화면을 둘러보는 중이에요</p>}

      <Panel title="오늘 꼭 할 일" className="mb-3">
        {todos.length === 0 ? (
          <Empty>급한 일이 없어요</Empty>
        ) : (
          <ul className="space-y-2">
            {todos.map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface-subtle px-4 py-3">
                <span className="truncate text-[14px] font-medium text-ink-strong">{t.text}</span>
                <Button size="sm" className="shrink-0" onClick={t.go}>
                  {t.cta}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Tile label="승인 대기" n={pending.length} />
        <Tile label="답 기다리는 질문" n={questions.length} />
        <Tile label="점검 할 일" n={issues?.length ?? 0} />
        {(issues?.length ?? 0) > 0 && (
          <button onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="text-[13px] font-semibold text-brand-strong">
            {showAll ? '점검 결과 접기' : `점검 결과 ${issues!.length}건 모두 보기`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
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
                    <li key={q.id} id={"q-" + q.id} className="rounded-xl bg-surface-subtle p-4">
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
          ) : !showAll && issues.length > 0 ? (
            <Empty>{`점검 결과 ${issues.length}건은 위에서 '모두 보기'를 누르면 펼쳐져요`}</Empty>
          ) : perCard.length === 0 && others.length === 0 ? (
            <Empty>문제가 없어요</Empty>
          ) : (
            <div className="space-y-3">
              {perCard.map(([id, list]) => {
                const kinds = [...new Set(list.map((i) => i.kind))];
                const conflicts = list.filter((i) => i.kind === '상충' && i.ids[0] === id && i.ids[1]);
                return (
                  <div key={id} id={'lint-' + id} className="rounded-xl bg-surface-subtle p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => setOpenId(id)} className="rounded bg-brand-weak px-2 py-0.5 text-[12px] font-semibold text-brand-strong hover:bg-brand-hover">
                        {id}
                      </button>
                      {kinds.map((k) => (
                        <Badge key={k} tone={KIND_TONE[k]}>
                          {k}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 truncate text-[14px] font-semibold text-ink-strong">{cardOf(id)?.title}</p>
                    <ul className="mt-1 space-y-0.5">
                      {list.map((i, n) => (
                        <li key={n} className="text-[13px] text-ink-body">
                          {i.detail}
                        </li>
                      ))}
                    </ul>
                    {conflicts.map((i) => {
                      const l = cardOf(i.ids[0]);
                      const r = cardOf(i.ids[1]);
                      return l && r ? (
                        <div key={i.ids.join()} className="mt-3">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Mini card={l} side="왼쪽으로 통일" busy={busy === r.id + 'archive'} onPick={() => pickSide(l, r)} />
                            <Mini card={r} side="오른쪽으로 통일" busy={busy === l.id + 'archive'} onPick={() => pickSide(r, l)} />
                          </div>
                          {confirm && [l.id, r.id].includes(confirm.drop) && [l.id, r.id].includes(confirm.keep) && (
                            <div className="mt-2 rounded-xl bg-warning-weak p-3">
                              <p className="text-[14px] font-semibold text-ink-strong">공식규정 카드를 보관하려고 해요. 본사·매장 규정이 바뀐 게 맞나요?</p>
                              <input className={`${inputCls} mt-2`} placeholder="바뀐 이유를 짧게 적어 주세요" value={reason} onChange={(e) => setReason(e.target.value)} />
                              <div className="mt-2 flex gap-2">
                                <Button size="sm" className="flex-1" disabled={!reason.trim()} loading={busy === confirm.drop + 'archive'} onClick={() => void unify(confirm.keep, confirm.drop, reason.trim())}>
                                  맞아요, 보관할게요
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                                  취소
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setRenewId(id)}>
                        갱신
                      </Button>
                      <Button size="sm" variant="ghost" loading={busy === id + 'archive'} onClick={() => void fix(id, 'archive')}>
                        보관
                      </Button>
                    </div>
                  </div>
                );
              })}
              {others.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {others.map((i, n) => (
                    <li key={n} className="flex items-start gap-2 text-[13px] text-ink-body">
                      <Badge tone={KIND_TONE[i.kind]}>{i.kind}</Badge>
                      <span>{i.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>
      </div>

      <Sheet open={!!renewCard} onClose={() => setRenewId(null)}>
        {renewCard && (
          <>
            <CardDetail card={renewCard} authorName={nameOf(renewCard.authorId)} />
            <p className="mt-4 text-sub text-ink-strong">지금도 이대로 맞나요?</p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" loading={busy === renewCard.id + 'renew'} onClick={() => void fix(renewCard.id, 'renew')}>
                맞아요, 연장하기
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setRenewId(null);
                  toast('노하우 남기기에서 내용을 고쳐 주세요');
                }}
              >
                고칠게요
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!openId} onClose={() => setOpenId(null)}>
        {openCard ? <CardDetail card={openCard} authorName={nameOf(openCard.authorId)} /> : <Empty>카드가 아니거나 찾을 수 없어요 ({openId})</Empty>}
      </Sheet>
    </div>
  );
}
