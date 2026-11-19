import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { ComplaintType, Review } from '@shared/contracts';
import { ViaBadge, VirtualBadge } from '@/shared/ui';
import { star } from '@/shared/lib/format';

export function ReviewItem({ r, storeName, onTag }: { r: Review; storeName?: string; onTag?: (t: ComplaintType) => void }) {
  const low = r.star != null && r.star <= 2;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
        <Link to={`/hq/stores/${r.storeId}`} className="font-bold text-ink hover:underline">{storeName ?? r.storeId}</Link>
        <span>{r.platform}</span>
        <span className={`inline-flex items-center gap-0.5 ${low ? 'font-bold text-text' : ''}`}>
          <Star size={12} aria-hidden />
          {star(r.star)}
        </span>
        <span>{r.date}</span>
        <span>{r.id}</span>
        {r.virtual && <VirtualBadge label="가상 리뷰" />}
      </div>
      <p className="mt-1 max-w-[90ch] whitespace-pre-line text-body">{r.text}</p>
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
    </li>
  );
}
