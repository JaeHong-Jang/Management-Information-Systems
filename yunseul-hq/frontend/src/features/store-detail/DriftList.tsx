// 본사 표준과 다른 운영(RuleDrift): 관찰된 운영 vs 본사 표준(가상)
import { Link } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import type { RuleDrift } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAction, useAsync } from '@/shared/lib/useAsync';
import { Button, Empty, InlineError, Panel, Tag, VirtualBadge } from '@/shared/ui';

const STATUS = { open: { label: '열림', tone: 'amber' }, accepted: { label: '예외 인정', tone: 'neutral' }, fixed: { label: '고침', tone: 'done' } } as const;

export function DriftList({ drifts, onChanged }: { drifts: RuleDrift[]; onChanged: () => void }) {
  const standards = useAsync(() => api.standards().then((s) => s.standards), []);
  const act = useAction();
  const std = new Map((standards.data ?? []).map((s) => [s.id, s]));

  const run = async (d: RuleDrift, a: 'accept' | 'fix') => {
    if (await act.run(`${d.id}:${a}`, () => api.drift(d.id, a))) onChanged();
  };

  return (
    <Panel title="본사 표준과 다른 운영" en="DRIFT" sub="리뷰에서 관찰된 매장 규칙" className="h-full" actions={<VirtualBadge label="가상 표준" />}>
      <InlineError message={act.error} />
      {drifts.length === 0 ? (
        <Empty title="표준과 다른 운영이 보이지 않아요" />
      ) : (
        <ul className="space-y-3">
          {drifts.map((d) => {
            const s = std.get(d.standardId);
            const st = STATUS[d.status];
            return (
              <li key={d.id} className="rounded-card border border-line p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag tone={st.tone}>{st.label}</Tag>
                  <span className="text-caption text-text-muted">{d.id} · 표준 {d.standardId}</span>
                </div>
                <dl className="mt-2 space-y-1.5 text-body">
                  <div>
                    <dt className="text-caption text-text-muted">관찰된 운영</dt>
                    <dd className="font-medium">{d.observed}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-muted">본사 표준{s ? ` · ${s.title}` : ''}</dt>
                    <dd className="text-text-subtle">{s?.rule ?? (standards.loading ? '불러오는 중이에요' : d.standardId)}</dd>
                  </div>
                </dl>
                <p className="mt-1 text-caption text-text-muted">근거 리뷰 {d.reviewIds.length}건: {d.reviewIds.slice(0, 4).join(', ')}{d.reviewIds.length > 4 ? ' …' : ''}</p>
                {d.status === 'open' && (
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" icon={Check} busy={act.busy === `${d.id}:fix`} onClick={() => run(d, 'fix')}>고침 확인</Button>
                    <Button size="sm" icon={ShieldCheck} busy={act.busy === `${d.id}:accept`} onClick={() => run(d, 'accept')}>예외 인정</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-caption"><Link to="/hq/standards" className="text-ink underline">전체 표준 보기</Link></p>
    </Panel>
  );
}
