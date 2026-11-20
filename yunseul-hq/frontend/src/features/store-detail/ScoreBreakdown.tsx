// 점수 구성 R1~R5: 배점, 얻은 점수, 근거 문장 칩. 표본이 없으면 '미확인'
import { CircleHelp, Ruler } from 'lucide-react';
import type { StoreScore } from '@shared/contracts';
import { Panel, RiskBar, RuleBadge, Tag } from '@/shared/ui';
import { pct } from '@/shared/lib/format';

export function ScoreBreakdown({ score }: { score: StoreScore }) {
  return (
    <Panel title="점수 구성" sub="공개 배점 기준. 항목별 배점 대비 산출 점수" className="h-full" actions={<RuleBadge />}>
      <ul className="space-y-3.5">
        {score.parts.map((p) => {
          const unknown = p.basis.includes('미확인');
          return (
            <li key={p.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="num text-text-subtle">
                  <b className="text-text">{p.points.toFixed(1)}</b> / {p.max}
                </span>
              </div>
              <span className="mt-1 block h-2 rounded-full bg-surface-sunken">
                <span className="block h-2 rounded-full bg-ink" style={{ width: `${(p.points / p.max) * 100}%` }} />
              </span>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {unknown && <Tag icon={CircleHelp}>미확인</Tag>}
                <span className="inline-flex max-w-full items-start gap-1 rounded-badge border border-line bg-surface-sunken px-1.5 py-0.5 text-caption text-text-subtle" title="계산 근거">
                  <Ruler size={12} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="min-w-0">{p.basis}</span>
                </span>
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="font-bold">합계</span>
        <RiskBar risk={score.risk} width="w-32" />
      </div>
      <p className="mt-2 text-caption text-text-muted">저평점 불만 중 지식 공백 비중 <span className="num">{pct(score.knowledgeShare)}</span></p>
    </Panel>
  );
}
