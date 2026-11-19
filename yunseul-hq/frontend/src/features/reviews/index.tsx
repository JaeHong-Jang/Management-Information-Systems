// /hq/reviews 리뷰 탐색: 매장·플랫폼·불만 유형·최대 별점·본문 검색, 페이지 단위
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { COMPLAINT_TYPES, type ComplaintType, type Platform } from '@shared/contracts';
import { useApp } from '@/app/AppData';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { Button, Empty, ErrorState, Loading, PageHeader, Panel } from '@/shared/ui';
import { cx } from '@/shared/lib/format';
import { ReviewItem } from './ReviewItem';

const LIMIT = 20;
const sel = 'h-10 rounded-ctl border border-line-strong bg-surface px-2 text-body';

export function ReviewsPage() {
  const [sp, setSp] = useSearchParams();
  const { overview } = useApp();
  const storeId = sp.get('storeId') ?? '';
  const platform = (sp.get('platform') ?? '') as Platform | '';
  const type = (sp.get('type') ?? '') as ComplaintType | '';
  const maxStar = sp.get('maxStar') ? Number(sp.get('maxStar')) : '';
  const q = sp.get('q') ?? '';
  const offset = Number(sp.get('offset') ?? 0);
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  const page = useAsync(() => api.reviews({ storeId, platform, type, maxStar, q, offset, limit: LIMIT }), [storeId, platform, type, maxStar, q, offset]);

  const set = (k: string, v: string | number) => {
    const next = new URLSearchParams(sp);
    if (v === '' || v === undefined) next.delete(k);
    else next.set(k, String(v));
    if (k !== 'offset') next.delete('offset');
    setSp(next, { replace: true });
  };

  const stores = [...(overview.data?.stores ?? [])].sort((a, b) => a.store.name.localeCompare(b.store.name, 'ko'));
  const storeName = new Map(stores.map((r) => [r.store.id, r.store.name]));
  const total = page.data?.total ?? 0;

  return (
    <>
      <PageHeader title="리뷰 탐색" en="REVIEWS" sub="익명화된 리뷰 원문이에요. 다른 매장명·사람 이름·직원 인상착의는 가려져 있어요" />
      <Panel bodyClass="p-0">
        <form
          className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            set('q', text.trim());
          }}
        >
          <select aria-label="매장" className={cx(sel, 'max-w-[200px]')} value={storeId} onChange={(e) => set('storeId', e.target.value)}>
            <option value="">전체 매장</option>
            {stores.map((r) => <option key={r.store.id} value={r.store.id}>{r.store.name}</option>)}
          </select>
          <select aria-label="플랫폼" className={sel} value={platform} onChange={(e) => set('platform', e.target.value)}>
            <option value="">전체 플랫폼</option>
            <option>카카오</option>
            <option>네이버</option>
          </select>
          <select aria-label="불만 유형" className={sel} value={type} onChange={(e) => set('type', e.target.value)}>
            <option value="">전체 불만 유형</option>
            {COMPLAINT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="최대 별점" className={sel} value={maxStar} onChange={(e) => set('maxStar', e.target.value)}>
            <option value="">모든 별점</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}점 이하</option>)}
          </select>
          <label className="relative">
            <span className="sr-only">본문 검색</span>
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="본문 검색" className={cx(sel, 'w-48 pl-7')} />
          </label>
          <Button type="submit" variant="primary">검색</Button>
          <span className="num ml-auto text-caption text-text-muted">{total.toLocaleString()}건</span>
        </form>

        <div className="p-4">
          {page.error ? (
            <ErrorState message={page.error} onRetry={page.reload} />
          ) : !page.data ? (
            <Loading />
          ) : page.data.items.length === 0 ? (
            <Empty title="조건에 맞는 리뷰가 없어요">필터를 줄이거나 검색어를 바꿔 보세요.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {page.data.items.map((r) => <ReviewItem key={r.id} r={r} storeName={storeName.get(r.storeId)} onTag={(t) => set('type', t)} />)}
            </ul>
          )}
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <Button size="sm" icon={ChevronLeft} disabled={offset === 0} onClick={() => set('offset', Math.max(0, offset - LIMIT))}>이전</Button>
            <span className="num text-caption text-text-muted">
              {offset + 1}–{Math.min(total, offset + LIMIT)} / {total.toLocaleString()}
            </span>
            <Button size="sm" disabled={offset + LIMIT >= total} onClick={() => set('offset', offset + LIMIT)}>
              다음 <ChevronRight size={14} aria-hidden />
            </Button>
          </div>
        )}
      </Panel>
    </>
  );
}
