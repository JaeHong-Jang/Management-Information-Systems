// 인용 문장을 누르면 여는 리뷰 원문 서랍(masdae ClaimDrawer 틀 + 관광공사 포커스 트랩).
// 순서는 누리지킴이 FindingDetailSheet처럼 원문 → 근거 → 조치. 원문 속 인용 구절은 <mark> 형광펜.
import { Link } from 'react-router-dom';
import { ShieldCheck, Star } from 'lucide-react';
import type { Finding, Prescription, Quote, Review } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { CauseChip, Drawer, DrawerSection, Highlighted, Loading, Tag, VirtualBadge, locate } from '@/shared/ui';
import { pct, star } from '@/shared/lib/format';
import { CAUSE, KIND, PRESCRIPTION_STATUS } from '@/shared/theme/semantics';

export interface OpenQuote { finding: Finding; quote: Quote }

/** 인용 문장으로 원문 리뷰를 찾는다(본문 검색 → id 대조). 전용 API가 없어서 검색을 쓴다 */
async function findReview(storeId: string, q: Quote): Promise<Review | null> {
  const needle = q.text.replace(/^[“"\s]+|[”"\s…]+$/g, '').slice(0, 30);
  const page = await api.reviews({ storeId, q: needle, limit: 20 });
  return page.items.find((r) => r.id === q.reviewId) ?? null;
}

export function ReviewDrawer({ storeId, open, prescriptions, onClose }: { storeId: string; open: OpenQuote | null; prescriptions: Prescription[]; onClose: () => void }) {
  const review = useAsync(() => (open ? findReview(storeId, open.quote) : Promise.resolve(null)), [storeId, open?.quote.reviewId, open?.finding.id]);
  const f = open?.finding;
  const q = open?.quote;
  const related = f ? prescriptions.filter((p) => p.findingIds.includes(f.id)) : [];
  const text = review.data?.text ?? q?.text ?? '';

  return (
    <Drawer
      open={!!open}
      onClose={onClose}
      eyebrow={q && <span className="num">{q.reviewId} · {q.platform} · {q.date}</span>}
      title={f ? `${f.complaint} 리뷰 원문` : ''}
    >
      {f && q && (
        <>
          <DrawerSection n={1} title="원문">
            {review.loading && !review.data ? (
              <Loading label="원문을 찾고 있어요" />
            ) : (
              <>
                <p className="mb-2 flex flex-wrap items-center gap-2 text-caption text-text-muted">
                  <span className="inline-flex items-center gap-0.5"><Star size={12} aria-hidden />{star(q.star)}</span>
                  <span>{q.platform}</span>
                  <span className="num">{q.date}</span>
                  {review.data?.virtual && <VirtualBadge label="가상 리뷰" />}
                </p>
                <blockquote className="whitespace-pre-line rounded-card border border-line bg-surface-sunken p-3 text-mobile leading-relaxed">
                  <Highlighted text={text} ranges={locate(text, q.text)} />
                </blockquote>
                {!review.data && <p className="mt-1 text-caption text-text-muted">원문 전체를 찾지 못해 인용 문장만 보여 줘요.</p>}
                <p className="mt-2 inline-flex items-center gap-1 text-caption text-done">
                  <ShieldCheck size={13} aria-hidden />
                  검증팀이 이 매장 리뷰이고 문장이 원문에 있는지 대조했어요
                </p>
              </>
            )}
          </DrawerSection>

          <DrawerSection n={2} title="근거">
            <div className="flex flex-wrap items-center gap-1.5">
              <CauseChip cause={f.cause} />
              <Tag>{f.complaint}</Tag>
              {f.standardId && <Tag>관련 표준 {f.standardId}</Tag>}
              {f.standardId && <VirtualBadge label="가상 표준" />}
            </div>
            <p className="mt-2 text-body">{f.explanation}</p>
            <p className="num mt-1 text-caption text-text-subtle">
              저평점 {f.count}건 · 매장 {pct(f.share)}{f.brandRate != null && ` · 브랜드 평균 ${pct(f.brandRate)}`}
            </p>
          </DrawerSection>

          <DrawerSection n={3} title="조치">
            <p className="text-body">처방 받는 곳: <b>{CAUSE[f.cause].to}</b></p>
            {related.length === 0 ? (
              <p className="mt-1 text-caption text-text-muted">이 진단 결과에 대한 처방이 아직 없어요. 결정 패널의 '처방 만들기'로 초안을 받을 수 있어요.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {related.map((p) => {
                  const st = PRESCRIPTION_STATUS[p.status];
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-1.5 text-body">
                      <Tag icon={KIND[p.kind].icon}>{p.kind}</Tag>
                      <Tag tone={st.tone} icon={st.icon}>{st.label}</Tag>
                      <span className="min-w-0">{p.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to={`/hq/reviews?storeId=${storeId}&type=${encodeURIComponent(f.complaint)}&maxStar=2`} className="mt-3 inline-flex h-10 items-center rounded-ctl border border-line-strong px-3 text-body text-ink hover:bg-ink-weak">
              같은 불만 리뷰 모두 보기
            </Link>
          </DrawerSection>
        </>
      )}
    </Drawer>
  );
}
