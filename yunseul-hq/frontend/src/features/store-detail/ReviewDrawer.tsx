import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { Finding, Prescription, Quote, Review } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { CauseChip, Drawer, Highlighted, Loading, Tag, VirtualBadge } from '@/shared/ui';
import { pct, star } from '@/shared/lib/format';
import { CAUSE, KIND, PRESCRIPTION_STATUS } from '@/shared/theme/semantics';

export interface OpenQuote { finding: Finding; quote: Quote }

async function findReview(storeId: string, q: Quote): Promise<Review | null> {
  const needle = q.text.trim().replace(/^[“"']|[”"']$/g, '').slice(0, 30);
  const search = { storeId, platform: q.platform, q: needle, limit: 200 };
  let offset = 0;
  do {
    const page = await api.reviews({ ...search, offset });
    const review = page.items.find((r) => r.id === q.reviewId);
    if (review) return review;
    offset += page.items.length;
    if (!page.items.length || offset >= page.total) return null;
  } while (true);
}

export function ReviewDrawer({ storeId, open, prescriptions, onClose }: { storeId: string; open: OpenQuote | null; prescriptions: Prescription[]; onClose: () => void }) {
  const review = useAsync(() => (open ? findReview(storeId, open.quote) : Promise.resolve(null)), [storeId, open?.quote.reviewId, open?.finding.id]);
  const f = open?.finding;
  const q = open?.quote;
  const related = f ? prescriptions.filter((p) => p.findingIds.includes(f.id)) : [];
  const full = review.data?.id === q?.reviewId ? review.data?.text : undefined;
  const excerpt = q?.text ?? '';
  const index = excerpt && full ? full.indexOf(excerpt) : -1;

  return (
    <Drawer open={!!open} onClose={onClose} eyebrow="리뷰 증빙" title={f ? `${f.complaint} 리뷰 원문` : ''} width="max-w-[560px]">
      {f && q && (
        <div className="space-y-5">
          <section aria-label="출처 및 인용문">
            <p className="num mb-2 flex flex-wrap items-center gap-x-2 text-caption text-text-muted">
              <b className="text-text">{q.platform}</b><span>{star(q.star)}</span><time>{q.date}</time><span>{q.reviewId}</span>
              {review.data?.virtual && <VirtualBadge label="가상 리뷰" />}
            </p>
            <h3 className="mb-2 text-section">진단에 인용된 구절</h3>
            <blockquote className="whitespace-pre-line rounded-ctl border-l-[3px] border-yellow bg-yellow-weak px-4 py-3 text-body leading-relaxed text-ink">{excerpt}</blockquote>
            {review.loading && <Loading label="리뷰 원문 조회 중" />}
            {!review.loading && (full ? (
              <>
                {index >= 0 && <p className="mt-2 flex items-center gap-1 text-caption text-done"><ShieldCheck size={14} aria-hidden />매장·리뷰 번호·인용문 일치</p>}
                {index < 0 && <p className="mt-2 text-caption text-text-muted">리뷰 번호 일치 · 인용 위치 미확인</p>}
                {full !== excerpt && <details className="mt-3 rounded-ctl border border-line">
                  <summary className="cursor-pointer px-3 py-2.5 text-body font-bold">리뷰 전체 원문</summary>
                  <blockquote className="whitespace-pre-line border-t border-line px-3 py-3 text-body leading-relaxed">
                    <Highlighted text={full} ranges={index >= 0 ? [{ start: index, end: index + excerpt.length }] : []} />
                  </blockquote>
                </details>}
              </>
            ) : <p className="mt-2 text-caption text-text-muted">전체 원문 조회 불가 · 저장된 인용문 표시 <button type="button" className="underline" onClick={() => void review.reload()}>재조회</button></p>)}
          </section>
          <section className="border-t border-line pt-4">
            <h3 className="mb-2 text-section">판정 근거</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <CauseChip cause={f.cause} />
              {f.standardId && <><Tag>표준 {f.standardId}</Tag><VirtualBadge label="가상 표준" /></>}
            </div>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-line border-y border-line bg-surface-sunken py-2 text-center">
              <div><dt className="text-caption text-text-muted">저평점 불만</dt><dd className="num text-section">{f.count}건</dd></div>
              <div><dt className="text-caption text-text-muted">매장 비율</dt><dd className="num text-section">{pct(f.share)}</dd></div>
              <div><dt className="text-caption text-text-muted">브랜드 평균</dt><dd className="num text-section">{pct(f.brandRate)}</dd></div>
            </dl>
            <details className="mt-2"><summary className="cursor-pointer py-1 text-body font-medium">진단 기록</summary><p className="mt-1 text-body text-text-subtle">{f.explanation}</p></details>
          </section>
          <section className="border-t border-line pt-4">
            <h3 className="mb-2 text-section">후속 조치</h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-body">
              <dt className="text-text-muted">담당</dt><dd className="font-bold">{CAUSE[f.cause].to}</dd>
              <dt className="text-text-muted">연결 처방</dt><dd>{related.length ? `${related.length}건` : '미등록'}</dd>
            </dl>
            {related.length > 0 && <ul className="mt-2 divide-y divide-line">
              {related.map((p) => {
                const st = PRESCRIPTION_STATUS[p.status];
                return <li key={p.id} className="flex flex-wrap items-center gap-1.5 py-2 text-body">
                  <Tag icon={KIND[p.kind].icon}>{p.kind}</Tag><Tag tone={st.tone} icon={st.icon}>{st.label}</Tag>
                  <span>{p.title}</span>
                </li>;
              })}
            </ul>}
            <Link to={`/hq/reviews?storeId=${storeId}&type=${encodeURIComponent(f.complaint)}&maxStar=2`} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-ctl border border-line-strong px-3 text-body font-bold text-ink hover:bg-ink-weak">
              같은 유형의 저평점 리뷰 <ArrowRight size={14} aria-hidden />
            </Link>
          </section>
        </div>
      )}
    </Drawer>
  );
}
