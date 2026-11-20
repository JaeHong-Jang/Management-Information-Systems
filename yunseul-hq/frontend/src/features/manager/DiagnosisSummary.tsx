import type { StoreDetail } from '@shared/contracts';
import type { AsyncState } from '@/shared/lib/useAsync';
import { AsyncView, CauseChip, Empty, Highlighted, Panel, Provenance, RiskBadge, RiskBar, keywordRanges } from '@/shared/ui';
import { COMPLAINT_CUES } from '@/shared/theme/semantics';
import { dateTime, pct } from '@/shared/lib/format';

export function DiagnosisSummary({ detail }: { detail: AsyncState<StoreDetail> }) {
  return (
    <Panel title="매장 진단" sub="본사의 저평점 리뷰 분석 결과" className="h-full">
      <AsyncView state={detail}>
        {(d) => (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <RiskBar risk={d.score.risk} width="w-32" />
              <RiskBadge risk={d.score.risk} />
              {d.score.rank != null && <span className="text-caption text-text-muted">전국 위험 {d.score.rank}위</span>}
            </div>
            {!d.diagnosis ? (
              <div className="mt-3"><Empty title="등록된 진단 없음" /></div>
            ) : (
              <>
                <p className="mt-3 text-body">{d.diagnosis.summary}</p>
                <p className="mt-1 flex items-center gap-2 text-caption text-text-muted">
                  <span className="num">{dateTime(d.diagnosis.created)}</span> <Provenance via={d.diagnosis.via} approved={false} pendingLabel="참고용 진단" />
                </p>
                <ul className="mt-3 divide-y divide-line">
                  {[...d.diagnosis.findings].sort((a, b) => b.share - a.share).map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{f.complaint}</span>
                        <CauseChip cause={f.cause} />
                      </span>
                      <span className="num text-caption text-text-subtle">
                        저평점 {f.count}건 · {pct(f.share)}{f.brandRate != null && ` (브랜드 ${pct(f.brandRate)})`}
                      </span>
                      {f.quotes[0] && <p className="w-full text-caption text-text-muted">“<Highlighted text={f.quotes[0].text.slice(0, 120)} ranges={keywordRanges(f.quotes[0].text.slice(0, 120), COMPLAINT_CUES[f.complaint], 1)} />” · {f.quotes[0].platform} <span className="num">{f.quotes[0].date}</span></p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </AsyncView>
    </Panel>
  );
}
