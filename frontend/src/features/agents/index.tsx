// 에이전트 팀: harness.config.json을 그대로 그린다. 팀·에이전트·흐름·게이트, 그리고 실제 실행 기록.
import { useEffect, useMemo, useState } from 'react';
import type { HarnessConfig } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Empty, PageHeader, Panel, cx } from '@/shared/ui';
import { TEAM_STYLE } from '@/shared/theme/tokens';
import { RunCard } from '../overview';

export default function Agents() {
  const { runs } = useLive();
  const [h, setH] = useState<HarnessConfig | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => void api.harness().then(setH), []);

  const calls = useMemo(() => {
    const m: Record<string, { n: number; llm: number; blocked: number }> = {};
    runs.flatMap((r) => r.steps).forEach((s) => {
      m[s.agentId] ??= { n: 0, llm: 0, blocked: 0 };
      m[s.agentId].n++;
      if (s.via === 'claude' || s.via === 'ollama') m[s.agentId].llm++;
      if (s.status === 'blocked') m[s.agentId].blocked++;
    });
    return m;
  }, [runs]);

  if (!h) return null;
  const name = (id: string) => h.agents.find((a) => a.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        eyebrow="시스템"
        title="에이전트 팀"
        desc="처음 일하는 사람도 혼자 해결할 수 있게 여섯 팀이 나눠 일해요. 글을 이해하고 쓰는 일만 LLM이 하고, 검색·검증·개인정보·점장 연결·재고 숫자 계산은 규칙이 해요. LLM이 쓴 답은 규칙으로 다시 확인해요."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {h.teams.map((t) => {
          const st = TEAM_STYLE[t.id];
          return (
            <Panel key={t.id} className="!p-4">
              <p className="mb-3 text-[15px] font-bold" style={{ color: st.color }}>
                {t.name}
              </p>
              <ul className="space-y-2.5">
                {t.agents.map((id) => {
                  const a = h.agents.find((x) => x.id === id)!;
                  const c = calls[id];
                  return (
                    <li key={id} className="rounded-xl p-3" style={{ background: st.weak }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-ink-strong">{a.name}</p>
                        <Badge tone={a.llm ? 'brand' : 'neutral'}>{a.llm ? 'LLM' : '규칙'}</Badge>
                      </div>
                      <p className="mt-1 text-[12px] leading-[18px] text-ink-body">{a.role}</p>
                      {c && (
                        <p className="mt-1.5 text-[11px] text-ink-weak">
                          이번 세션 {c.n}회{c.llm ? ` · Claude ${c.llm}` : ''}
                          {c.blocked ? ` · 걸러냄 ${c.blocked}` : ''}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel title="흐름과 검증 게이트" className="mb-5">
        <div className="space-y-3">
          {Object.entries(h.flows).map(([id, f]) => {
            const gate = h.gates.find((g) => g.flow === id);
            return (
              <div key={id} className="flex flex-wrap items-center gap-1.5">
                <span className="w-32 text-[14px] font-semibold text-ink-strong">{f.name}</span>
                {f.steps.map((s, i) => {
                  const team = h.agents.find((a) => a.id === s)?.team ?? 'lead';
                  const inGate = gate?.agents.includes(s);
                  return (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      {i > 0 && <span className="text-ink-disabled">→</span>}
                      <span className={cx('rounded-lg px-2 py-1 text-[12px] font-semibold', inGate && 'ring-2 ring-warning/40')} style={{ background: TEAM_STYLE[team].weak, color: TEAM_STYLE[team].color }}>
                        {name(s)}
                      </span>
                    </span>
                  );
                })}
                {gate && <span className="ml-2 text-[12px] text-ink-weak">게이트: {gate.onFail}</span>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="실행 기록">
        {runs.length ? (
          <ul className="divide-y divide-line">
            {runs.slice(0, 20).map((r) => (
              <li key={r.runId} className="py-2">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === r.runId ? null : r.runId)}>
                  <Badge tone="brand">{r.flowName}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[14px]">{r.input}</span>
                  <span className="text-[12px] text-ink-weak">{r.done ? r.summary : '진행 중'}</span>
                </button>
                {open === r.runId && (
                  <div className="mt-3 rounded-xl bg-surface-subtle p-4">
                    <RunCard run={r} harness={h} />
                    <p className="mt-3 text-[12px] text-ink-weak">
                      에이전트별 시간: {r.steps.map((s) => `${name(s.agentId)} ${s.ms}ms`).join(' · ')}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>아직 실행이 없어요. 질문하기나 매장의 하루 재생으로 시작해 보세요.</Empty>
        )}
      </Panel>
    </>
  );
}
