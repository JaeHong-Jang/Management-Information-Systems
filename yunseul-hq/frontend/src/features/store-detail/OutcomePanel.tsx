// 효과: 처방 전(실제 리뷰) vs 처방 후(가상 시나리오). 가상 표지 필수. 실행 버튼은 결정 패널에 있다
import { ArrowRight } from 'lucide-react';
import type { ComplaintType, Outcome, PeriodStat } from '@shared/contracts';
import { Empty, Panel, VirtualBadge } from '@/shared/ui';
import { pct, rating } from '@/shared/lib/format';

export function OutcomePanel({ outcome }: { outcome: Outcome | null }) {
  return (
    <Panel id="outcome" title="처방 효과" en="OUTCOME" sub="처방 전은 실제 리뷰, 처방 후는 가상 시나리오 리뷰예요" className="h-full" actions={outcome?.virtual && <VirtualBadge label="가상 결과" />}>
      {!outcome ? (
        <Empty title="아직 효과를 볼 처방이 없어요">처방을 보낸 뒤 결정 패널의 '4주 뒤 가상 결과'로 가상 시나리오를 넣어 볼 수 있어요.</Empty>
      ) : (
        <>
          <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
            <PeriodCard label="처방 전 (실제)" p={outcome.before} />
            <span className="hidden items-center text-text-muted md:flex"><ArrowRight size={18} aria-hidden /></span>
            {outcome.after ? (
              <PeriodCard label="처방 후" p={outcome.after} virtual={outcome.virtual} />
            ) : (
              <div className="rounded-card border border-dashed border-line-strong p-3 text-body text-text-muted">처방 후 리뷰가 아직 없어요.</div>
            )}
          </div>
          {outcome.after && <TypeDiff before={outcome.before} after={outcome.after} />}
          <p className="mt-3 text-caption text-text-muted">대상 처방: <span className="num">{outcome.prescriptionIds.join(', ') || '—'}</span></p>
        </>
      )}
    </Panel>
  );
}

function PeriodCard({ label, p, virtual }: { label: string; p: PeriodStat; virtual?: boolean }) {
  return (
    <div className={`rounded-card border p-3 ${virtual ? 'border-dashed border-line-strong' : 'border-line'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{label}</span>
        {virtual && <VirtualBadge />}
      </div>
      <p className="text-caption text-text-muted"><span className="num">{p.from} ~ {p.to}</span> · <span className="num">{p.n}</span>건</p>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <dt className="text-caption text-text-muted">평균 별점</dt>
          <dd className="num text-kpi">{rating(p.mean)}</dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">2점 이하 비율</dt>
          <dd className="num text-kpi">{pct(p.lowShare)}</dd>
        </div>
      </dl>
    </div>
  );
}

function TypeDiff({ before, after }: { before: PeriodStat; after: PeriodStat }) {
  const types = [...new Set([...Object.keys(before.byType), ...Object.keys(after.byType)])] as ComplaintType[];
  if (types.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-body">
        <thead className="text-left text-caption text-text-muted">
          <tr>
            <th className="py-1 font-medium">불만 유형</th>
            <th className="py-1 text-right font-medium">처방 전</th>
            <th className="py-1 text-right font-medium">처방 후(가상)</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t} className="border-t border-line">
              <td className="py-1">{t}</td>
              <td className="num py-1 text-right">{before.byType[t] ?? 0}</td>
              <td className="num py-1 text-right">{after.byType[t] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
