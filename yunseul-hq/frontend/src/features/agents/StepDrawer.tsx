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
  const flows = flowsOf(h, a.id);
  const sec = run?.running === a.id ? elapsedSec(run.runningSince, now) : null;
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={<span>{a.teamName} · <span className="num">명부 {a.step}</span><span className="num dev"> · {a.id}</span></span>}
      title={a.name}
      actions={run ? <StatusPill live={live} /> : undefined}
    >
      <DrawerSection title="담당 업무">
        <p className="text-body">{a.role}</p>
        <dl className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-body">
          <dt className="text-caption text-text-muted">종류</dt>
          <dd>{a.kind}</dd>
          <dt className="text-caption text-text-muted">중단 시 영향</dt>
          <dd className="flex items-start gap-1">{a.locked && <Lock size={13} className="mt-1 shrink-0" aria-label="필수 단계" />}{a.off}</dd>
          <dt className="text-caption text-text-muted">참여 업무</dt>
          <dd className="flex flex-wrap gap-1">
            {flows.map((f) => <Tag key={f.id}>{f.name} <span className="num">{f.pos}/{f.total}</span></Tag>)}
            {flows.length === 0 && <span className="text-text-muted">등록된 업무 없음</span>}
          </dd>
          <dt className="text-caption text-text-muted dev">명세 파일</dt>
          <dd className="num dev break-all text-caption text-text-muted">harness/{a.card}</dd>
        </dl>
      </DrawerSection>

      {run && <DrawerSection title={`실행 결과 · ${run.flowName}`}>
        {steps.length === 0 ? (
          <p className="text-body text-text-muted">
            {live === 'running' ? `처리 중${sec != null ? ` · ${sec}초 경과` : ''}` : live === 'idle' ? '참여 대상 외' : '개별 단계 결과 없음'}
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="rounded-ctl border border-line p-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-caption">
                  {steps.length > 1 && <span className="num text-text-muted">{i + 1}회차</span>}
                  <StatusPill live={s.status} />
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
      </DrawerSection>}

      <DrawerSection title="검증 기준">
        {gates.length === 0 ? (
          <p className="text-caption text-text-muted">담당 검증 기준 없음</p>
        ) : (
          <ul className="space-y-1.5">
            {gates.map((g) => {
              const r = [...results].reverse().find((x) => x.gateId === g.id);
              return (
                <li key={g.id} className="text-body">
                  <b className="num">{g.id}</b> · {r ? (r.passed ? <span className="text-done">통과</span> : <span className="text-amber-text">차단 · {r.problems.join(' · ')}</span>) : <span className="text-text-muted">{run ? '해당 실행 기록 없음' : '담당 기준'}</span>}
                  <p className="text-caption text-text-muted">차단 시 조치 · {g.onFail}</p>
                </li>
              );
            })}
          </ul>
        )}
      </DrawerSection>
    </Drawer>
  );
}
