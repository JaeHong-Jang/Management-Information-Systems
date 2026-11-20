// 원인 진단: 원인 4분류별 진단 결과, 브랜드 평균 대비 비중, 리뷰 인용.
// 인용 속 근거어는 형광펜(<mark>), 인용을 누르면 리뷰 원문 서랍을 연다. 실행 버튼은 오른쪽 결정 패널에 있다.
import { Link } from 'react-router-dom';
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
      sub="저평점 리뷰의 불만 유형별 원인과 원문 근거"
      actions={
        dx && (
          <>
            <Provenance via={dx.via} approved={false} pendingLabel="참고용 진단 · 처방은 SV 승인 후 발송" />
            <span className="num text-caption text-text-muted">{dateTime(dx.created)}</span>
          </>
        )
      }
    >
      {!dx ? (
        <Empty title="등록된 진단 없음"><Link to="#actions" className="text-ink underline">처방·후속 조치에서 원인 진단 실행</Link></Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
            <p className="text-body">진단 불만 <strong className="num">{dx.findings.length}개 유형</strong> · 원인 <strong className="num">{new Set(dx.findings.map((f) => f.cause)).size}개 분류</strong></p>
            <details className="text-body text-text-subtle"><summary className="cursor-pointer font-medium">진단 요약 원문</summary><p className="mt-2 max-w-[64ch]">{dx.summary}</p></details>
          </div>
          {dx.findings.length === 0 && <Empty title="근거가 확인된 진단 없음" />}
          <div className="space-y-6">
            {CAUSES.map((cause) => {
              const fs = dx.findings.filter((f) => f.cause === cause);
              if (fs.length === 0) return null;
              return (
                <section key={cause}>
                  <header className="mb-2 flex flex-wrap items-center gap-2">
                    <CauseChip cause={cause} size="md" />
                    <span className="text-caption text-text-muted">담당 {CAUSE[cause].to}</span>
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
    <li className="border-t border-line py-3 first:border-t-0">
      <div className="grid gap-3 lg:grid-cols-[minmax(140px,.55fr)_minmax(0,1.45fr)]">
        <div>
          <h3 className="text-section">{f.complaint}</h3>
          <p className="num text-caption text-text-subtle">
            저평점 {f.count}건 · 매장 {pct(f.share)}
            {f.brandRate != null && <> · 브랜드 평균 {pct(f.brandRate)}</>}
          </p>
          <div className="mt-2">
            <ShareBar value={f.share} compare={f.brandRate} color={c.bar} />
            {f.brandRate != null && <p className="mt-1 text-caption text-text-muted">세로선은 브랜드 평균</p>}
          </div>
          {f.standardId && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-caption">
              <Tag>관련 표준 {f.standardId}</Tag>
              <VirtualBadge label="가상 표준" />
            </p>
          )}
        </div>
        <div className="min-w-0">
          <details className="mb-2 text-body"><summary className="cursor-pointer font-medium text-text-subtle">분류 사유</summary><p className="mt-1">{f.explanation}</p></details>
          {f.quotes.length === 0 ? (
            <p className="mt-2 text-caption text-amber-text">인용 검증 보류</p>
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
