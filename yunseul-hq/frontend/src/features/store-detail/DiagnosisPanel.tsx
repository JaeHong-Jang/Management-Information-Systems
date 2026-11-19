// 원인 진단: 원인 4분류별 진단 결과, 브랜드 평균 대비 비중, 리뷰 인용.
// 인용 속 근거어는 형광펜(<mark>), 인용을 누르면 리뷰 원문 서랍을 연다. 실행 버튼은 오른쪽 결정 패널에 있다.
import { ShieldCheck } from 'lucide-react';
import type { Diagnosis, Finding, Quote } from '@shared/contracts';
import { CauseChip, Empty, Highlighted, Panel, Provenance, ShareBar, Tag, VirtualBadge, keywordRanges } from '@/shared/ui';
import { dateTime, pct, star } from '@/shared/lib/format';
import { CAUSE, CAUSES, COMPLAINT_CUES } from '@/shared/theme/semantics';

export function DiagnosisPanel({ diagnosis: dx, onQuote }: { diagnosis: Diagnosis | null; onQuote: (f: Finding, q: Quote) => void }) {
  return (
    <Panel
      id="diagnosis"
      title="원인 진단"
      en="DIAGNOSIS"
      sub="숫자는 규칙 계산, 설명은 리뷰 인용과 함께 써요. 인용은 검증팀이 원문과 대조했어요"
      actions={
        dx && (
          <>
            <Provenance via={dx.via} approved={false} pendingLabel="진단은 참고용 · 처방을 보낼 때 사람이 판단" />
            <span className="num text-caption text-text-muted">{dateTime(dx.created)}</span>
          </>
        )
      }
    >
      {!dx ? (
        <Empty title="아직 진단이 없어요">결정 패널의 '진단 실행'을 누르면 진단팀이 저평점 리뷰의 원인을 나눠요.</Empty>
      ) : (
        <>
          <p className="mb-5 max-w-[72ch] text-body">{dx.summary}</p>
          {dx.findings.length === 0 && <Empty title="근거가 확인된 진단 결과가 없어요" />}
          <div className="space-y-6">
            {CAUSES.map((cause) => {
              const fs = dx.findings.filter((f) => f.cause === cause);
              if (fs.length === 0) return null;
              return (
                <section key={cause}>
                  <header className="mb-2 flex flex-wrap items-center gap-2">
                    <CauseChip cause={cause} size="md" />
                    <span className="text-caption text-text-muted">처방 받는 곳: {CAUSE[cause].to}</span>
                  </header>
                  <ul className="space-y-3">
                    {fs.map((f) => <FindingItem key={f.id} f={f} onQuote={onQuote} />)}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

function FindingItem({ f, onQuote }: { f: Finding; onQuote: (f: Finding, q: Quote) => void }) {
  const c = CAUSE[f.cause];
  return (
    <li className="rounded-card border border-line p-3">
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="font-bold">{f.complaint}</p>
          <p className="num text-caption text-text-subtle">
            저평점 {f.count}건 · 매장 {pct(f.share)}
            {f.brandRate != null && <> · 브랜드 평균 {pct(f.brandRate)}</>}
          </p>
          <div className="mt-2">
            <ShareBar value={f.share} compare={f.brandRate} color={c.bar} />
            {f.brandRate != null && <p className="mt-1 text-caption text-text-muted">세로선 = 브랜드 평균</p>}
          </div>
          {f.standardId && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-caption">
              <Tag>관련 표준 {f.standardId}</Tag>
              <VirtualBadge label="가상 표준" />
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-body">{f.explanation}</p>
          {f.quotes.length === 0 ? (
            <p className="mt-2 text-caption text-amber-text">인용이 검증되지 않아 보류된 결과예요</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {f.quotes.map((q) => (
                <QuoteButton key={q.reviewId} q={q} cues={COMPLAINT_CUES[f.complaint]} onOpen={() => onQuote(f, q)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

export function QuoteButton({ q, cues, onOpen }: { q: Quote; cues?: readonly string[]; onOpen?: () => void }) {
  const text = q.text.length > 140 ? `${q.text.slice(0, 140)}…` : q.text;
  const body = (
    <>
      <span className="block border-l-2 border-line-strong pl-3 text-body text-text-subtle">
        “<Highlighted text={text} ranges={keywordRanges(text, cues ?? [])} />”
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 pl-3 text-caption text-text-muted">
        <span>{q.platform} · {star(q.star)} · <span className="num">{q.date}</span> · <span className="num">{q.reviewId}</span></span>
        <span className="inline-flex items-center gap-0.5 text-done"><ShieldCheck size={12} aria-hidden />인용 확인</span>
        {onOpen && <span className="text-ink underline-offset-2 group-hover:underline">원문 보기</span>}
      </span>
    </>
  );
  return (
    <li>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="group block w-full rounded-ctl py-1 text-left hover:bg-ink-weak">
          {body}
        </button>
      ) : (
        body
      )}
    </li>
  );
}
