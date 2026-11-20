import { CheckCircle2, Circle, CircleAlert, MinusCircle, Timer } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import type { RunView } from '@/shared/api/live';
import { railTeams, teamPhase, type Phase } from './derive';

const STATES = {
  done: { Icon: CheckCircle2, label: '완료' },
  running: { Icon: Timer, label: '진행 중' },
  wait: { Icon: Circle, label: '대기' },
  issue: { Icon: CircleAlert, label: '확인 필요' },
  skipped: { Icon: MinusCircle, label: '일부 또는 전체 생략' },
} as const;

export function FlowRail({ h, run }: { h: HarnessConfig; run: RunView }) {
  const names = new Map(h.teams.map((t) => [t.id, t.name]));
  return (
    <ul className="ops-flow" aria-label="참여 팀별 처리 상태">
      {railTeams(h, run).map((id) => {
        const phase: Phase = teamPhase(h, id, run);
        const { Icon, label } = STATES[phase];
        return <li key={id} data-phase={phase}><Icon size={15} aria-hidden /><span>{names.get(id) ?? id} · {label}</span></li>;
      })}
    </ul>
  );
}
