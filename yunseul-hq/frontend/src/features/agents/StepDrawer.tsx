// 단계 상세 서랍: 에이전트 카드를 누르면 연다. 하는 일 → 이번 실행 결과 → 검사·막힘.
import { Lock } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import type { RunView } from '@/shared/api/live';
import { Drawer, DrawerSection, StatusPill, Tag, ViaBadge, type LiveStatus } from '@/shared/ui';
import { elapsedSec, useNow } from '@/shared/lib/useNow';
import { flowsOf, type Declared } from './declare';
import { stepsOf } from './derive';

export function StepDrawer({ h, a, live, run, onClose }: { h: HarnessConfig; a: Declared | null; live: LiveStatus; run: RunView | null; onClose: () => void }) {
  const now = useNow(live === 'running');
  if (!a) return null;
  const steps = stepsOf(run, a.id);
  const gates = h.gates.filter((g) => g.agents.includes(a.id));
  const results = run ? run.gates.filter((r) => gates.some((g) => g.id === r.gateId)) : [];
  const sec = run?.running === a.id ? elapsedSec(run.runningSince, now) : null;
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={<span>{a.teamName} · <span className="num">{a.step}</span> · <span className="num dev">{a.id}</span></span>}
      title={a.name}
      actions={<StatusPill live={live} />}
    >
      <DrawerSection n={1} title="하는 일">
        <p className="text-body">{a.role}</p>
        <dl className="mt-3 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-body">
          <dt className="text-caption text-text-muted">종류</dt>
          <dd>{a.kind}</dd>
          <dt className="text-caption text-text-muted">끄면 빠지는 것</dt>
          <dd className="flex items-start gap-1">{a.locked && <Lock size={13} className="mt-1 shrink-0" aria-label="끌 수 없음" />}{a.off}</dd>
          <dt className="text-caption text-text-muted">들어가는 흐름</dt>
          <dd className="flex flex-wrap gap-1">
            {flowsOf(h, a.id).map((f) => <Tag key={f.id}>{f.name} <span className="num">{f.pos}/{f.total}</span></Tag>)}
            {flowsOf(h, a.id).length === 0 && <span className="text-text-muted">모든 흐름을 배정해요</span>}
          </dd>
          <dt className="text-caption text-text-muted dev">카드</dt>
          <dd className="num dev break-all text-caption text-text-muted">harness/{a.card}</dd>
        </dl>
      </DrawerSection>

      <DrawerSection n={2} title={run ? `이번 실행 · ${run.flowName}` : '이번 실행'}>
        {!run ? (
          <p className="text-caption text-text-muted">고른 실행이 없어요.</p>
        ) : steps.length === 0 ? (
          <p className="text-body text-text-muted">
            {live === 'running' ? `일하는 중이에요${sec != null ? ` · ${sec}초 경과` : ''}` : live === 'idle' ? '이 흐름에는 들어가지 않아요.' : '아직 결과가 없어요.'}
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="rounded-ctl border border-line p-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-caption">
                  {steps.length > 1 && <span className="num text-text-muted">{i + 1}회차</span>}
                  <StatusPill live={s.status === 'ok' ? 'ok' : s.status} />
                  <ViaBadge via={s.via} />
                  <span className="num dev text-text-muted">{s.ms.toLocaleString()} ms</span>
                </div>
                <p className="mt-1.5 text-body">{s.summary}</p>
                {s.problems?.length ? (
                  <ul className="mt-1 list-disc pl-5 text-caption text-amber-text">
                    {s.problems.map((p, j) => <li key={j}>{p}</li>)}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </DrawerSection>

      <DrawerSection n={3} title="검사·막힘">
        {gates.length === 0 ? (
          <p className="text-caption text-text-muted">맡은 게이트가 없어요.</p>
        ) : (
          <ul className="space-y-1.5">
            {gates.map((g) => {
              const r = [...results].reverse().find((x) => x.gateId === g.id);
              return (
                <li key={g.id} className="text-body">
                  <b className="num">{g.id}</b> · {r ? (r.passed ? <span className="text-done">통과</span> : <span className="text-amber-text">막힘 · {r.problems.join(' · ')}</span>) : <span className="text-text-muted">이번 실행 기록 없음</span>}
                  <p className="text-caption text-text-muted">실패하면: {g.onFail}</p>
                </li>
              );
            })}
          </ul>
        )}
      </DrawerSection>
    </Drawer>
  );
}
