// 게이트 패널(masdae GatePanel): 이 흐름에 선언된 게이트를 통과 / 막힘 / 대기로. 끝나면 최종 요약.
// 막힘은 빨강이 아니라 주의 색(빨강 = 고위험).
import { FileText, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import type { RunView } from '@/shared/api/live';
import { Panel, Tag } from '@/shared/ui';

export function GatePanel({ h, run, names }: { h: HarnessConfig; run: RunView | null; names: Record<string, string> }) {
  const declared = run ? h.gates.filter((g) => g.flow === run.flow) : [];
  const extra = run ? run.gates.filter((g) => !declared.some((d) => d.id === g.gateId)) : [];
  return (
    <Panel title="검증 게이트와 요약" en="GATE" sub="검증팀이 인용·카드 번호·표준·표현을 검사해요. 막힌 것은 화면에 나가지 않고 사람에게 넘어가요">
      {!run ? (
        <p className="text-caption text-text-muted">실행을 고르면 그 흐름의 게이트가 보여요.</p>
      ) : declared.length === 0 && extra.length === 0 ? (
        <p className="text-caption text-text-muted">이 흐름({run.flowName})에는 선언된 게이트가 없어요. 표현 검증은 단계 안에서 해요.</p>
      ) : (
        <ul className="divide-y divide-line">
          {declared.map((g) => {
            const r = [...run.gates].reverse().find((x) => x.gateId === g.id);
            return (
              <li key={g.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-body">
                  {!r ? <Shield size={15} className="shrink-0 text-text-muted" aria-hidden /> : r.passed ? <ShieldCheck size={15} className="shrink-0 text-done" aria-hidden /> : <ShieldAlert size={15} className="shrink-0 text-amber-text" aria-hidden />}
                  <b className="num">{g.id}</b>
                  <span className="text-caption text-text-muted">{g.agents.map((a) => names[a] ?? a).join(' · ')}</span>
                  <span className="ml-auto">{!r ? <Tag>{run.done ? '기록 없음' : '대기'}</Tag> : r.passed ? <Tag tone="done">통과</Tag> : <Tag tone="amber">막힘</Tag>}</span>
                </div>
                {r && !r.passed && (
                  <p className="ml-6 mt-0.5 text-caption text-amber-text">
                    {r.problems.join(' · ')}
                    {r.action && <span className="text-text-muted"> → {r.action}</span>}
                  </p>
                )}
                <p className="ml-6 mt-0.5 text-caption text-text-muted">실패하면: {g.onFail}</p>
              </li>
            );
          })}
          {extra.map((g, i) => (
            <li key={`x${i}`} className="py-2.5 text-body">
              {g.passed ? <ShieldCheck size={15} className="mr-1 inline text-done" aria-hidden /> : <ShieldAlert size={15} className="mr-1 inline text-amber-text" aria-hidden />}
              <b className="num">{g.gateId}</b> {g.passed ? '통과' : `막힘 · ${g.problems.join(' · ')}`}
            </li>
          ))}
        </ul>
      )}
      {run?.done && run.summary && (
        <div className="mt-3 rounded-ctl border border-line bg-surface-sunken p-3">
          <p className="mb-1 flex items-center gap-1.5 text-caption font-bold text-text">
            <FileText size={14} aria-hidden />
            최종 요약 {run.ok ? '' : '(멈춤)'}
          </p>
          <p className="text-body text-text-subtle">{run.summary}</p>
          <p className="mt-1 text-caption text-text-muted">에이전트가 끝낸 것과 사람이 승인한 것은 달라요. 처방·카드는 사람이 보내고 승인해야 매장에 들어가요.</p>
        </div>
      )}
    </Panel>
  );
}
