import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { ComplaintType, Review } from '@shared/contracts';
import { ViaBadge, VirtualBadge } from '@/shared/ui';
import { star } from '@/shared/lib/format';

export function ReviewItem({ r, storeName, onTag }: { r: Review; storeName?: string; onTag?: (t: ComplaintType) => void }) {
  const low = r.star != null && r.star <= 2;
  return (
    <li className="grid min-w-0 gap-2 py-3 lg:grid-cols-[minmax(140px,.32fr)_minmax(0,1fr)] lg:gap-4">
      <div className="flex flex-wrap content-start items-baseline gap-x-2 gap-y-1 text-caption text-text-muted">
        <Link to={`/hq/stores/${r.storeId}`} className="text-body font-bold text-ink hover:underline lg:w-full">{storeName ?? r.storeId}</Link>
        <span>{r.platform}</span>
        <span className={`inline-flex items-center gap-0.5 ${low ? 'font-bold text-text' : ''}`}>
          <Star size={12} aria-hidden />
          {star(r.star)}
        </span>
        <span className="num lg:w-full">{r.date} · {r.id}</span>
        {r.virtual && <VirtualBadge label="가상 리뷰" />}
      </div>
      <div className="min-w-0">
        {r.text.length > 160 ? (
          <details className="group">
            <summary className="cursor-pointer list-none text-body [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{r.text.slice(0, 160)}… </span>
              <span className="text-caption font-bold text-ink underline"><span className="group-open:hidden">전문 보기</span><span className="hidden group-open:inline">전문 접기</span></span>
            </summary>
            <p className="mt-1 max-w-[90ch] whitespace-pre-line text-body">{r.text}</p>
          </details>
        ) : <p className="max-w-[90ch] whitespace-pre-line text-body">{r.text}</p>}
      {r.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {r.tags.map((t) => (
            <button key={t} type="button" onClick={() => onTag?.(t)} className="rounded-badge border border-line-strong px-1.5 py-px text-caption text-text-subtle hover:bg-ink-weak" title="이 유형만 보기">
              {t}
            </button>
          ))}
          <span className="ml-1 text-caption text-text-muted">분류</span>
          <ViaBadge via={r.tagVia} />
        </div>
      )}
      </div>
    </li>
  );
}
