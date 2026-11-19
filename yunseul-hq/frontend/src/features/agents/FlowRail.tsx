// 흐름 레일(masdae FlowRail): 지휘 → 관측 → 진단 → 처방 → 검증. 원 28px(완료 = ink + 체크, 실행 = 링 + 점, 대기 = 회색).
// 앞 팀이 끝났고 다음 팀이 실행 중일 때만 사이 선이 흐르는 점선이 된다(실제 이벤트로만).
import { Check } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import type { RunView } from '@/shared/api/live';
import { cx } from '@/shared/lib/format';
import { railTeams, teamPhase, type Phase } from './derive';

const SUB: Record<string, string> = {
  lead: '배정', monitor: '수집·채점', diagnose: '원인', prescribe: '카드·과제', capture: '기록', answer: '답', verify: '게이트', keeper: '위키',
};

export function FlowRail({ h, run }: { h: HarnessConfig; run: RunView | null }) {
  const teams = railTeams(h, run);
  const name = new Map(h.teams.map((t) => [t.id, t.name]));
  const phase = (t: string): Phase => (t === 'lead' ? (!run ? 'wait' : run.done ? 'done' : 'running') : teamPhase(h, t, run));
  return (
    <ol className="flex items-start" aria-label="실행 흐름">
      {teams.map((t, i) => {
        const p = phase(t);
        const next = i < teams.length - 1 ? phase(teams[i + 1]) : 'wait';
        return (
          <li key={t} className="flex min-w-0 flex-1 items-start last:flex-none">
            <div className="flex w-14 flex-col items-center text-center sm:w-20">
              <span
                className={cx(
                  'grid h-7 w-7 place-items-center rounded-full ring-2',
                  p === 'done' ? 'bg-ink text-white ring-transparent' : p === 'running' ? 'bg-surface text-ink ring-ink' : 'bg-surface-sunken text-text-muted ring-line',
                )}
                aria-label={`${name.get(t) ?? t}: ${p === 'done' ? '완료' : p === 'running' ? '진행 중' : '대기'}`}
              >
                {p === 'done' ? <Check size={14} strokeWidth={3} aria-hidden /> : <span className={cx('h-2 w-2 rounded-full', p === 'running' ? 'animate-pulse bg-yellow' : 'bg-line-strong')} />}
              </span>
              <span className={cx('mt-1 text-caption font-bold', p === 'wait' ? 'text-text-muted' : 'text-ink')}>{name.get(t) ?? t}</span>
              <span className="hidden text-[0.6875rem] text-text-muted sm:block">{SUB[t] ?? ''}</span>
            </div>
            {i < teams.length - 1 && (
              <div className="mt-3.5 h-0.5 min-w-[8px] flex-1 overflow-hidden rounded bg-line">
                <div className={cx('h-full', p === 'done' ? (next === 'running' ? 'flow-dash w-full animate-flow text-ink' : 'w-full bg-ink') : 'w-0')} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
