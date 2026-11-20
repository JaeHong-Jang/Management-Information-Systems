import { useState } from 'react';
import type { Briefing, Card } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, CardDrawer, CiteChip, Empty, ViaBadge } from '@/shared/ui';

export function BriefingTab({ storeId, cards }: { storeId: string; cards: Card[] }) {
  const b = useAsync(() => api.briefing(storeId), [storeId]);
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(cards.map((c) => [c.id, c]));
  return (
    <AsyncView state={b}>
      {(br) => (
        <section className="staff-card" aria-labelledby="briefing-title">
          <header className="staff-card-head"><h2 id="briefing-title">근무 브리핑</h2><time dateTime={br.date}>{br.date}</time></header>
          {br.items.length === 0 ? (
            <Empty title="등록된 브리핑 없음" />
          ) : (
            <>
              <ol>{br.items.slice(0, 3).map((it, i) => <Item key={it.cardId} it={it} expanded={i === 0} onOpen={setOpen} />)}</ol>
              {br.items.length > 3 && (
                <details className="border-t border-line">
                  <summary className="cursor-pointer px-4 py-3 text-body font-semibold text-ink">추가 항목 {br.items.length - 3}건</summary>
                  <ol>{br.items.slice(3).map(it => <Item key={it.cardId} it={it} onOpen={setOpen} />)}</ol>
                </details>
              )}
            </>
          )}
          <footer className="border-t border-line px-4 py-2"><ViaBadge via={br.via} /></footer>
          <CardDrawer cardId={open} card={open ? byId.get(open) : null} onClose={() => setOpen(null)} />
        </section>
      )}
    </AsyncView>
  );
}

function Item({ it, expanded = false, onOpen }: { it: Briefing['items'][number]; expanded?: boolean; onOpen: (id: string) => void }) {
  const [show, setShow] = useState(expanded);
  return (
    <li className="staff-brief-entry">
      <details open={show} onToggle={e => setShow(e.currentTarget.open)}>
        <summary>{it.title}</summary>
        <p className="mt-2 text-caption font-semibold text-text-subtle">고객 안내 예시</p>
        <blockquote className="bubble mt-1 px-3 py-2 text-body text-ink">{it.say}</blockquote>
        <p className="mt-2 text-body text-text-subtle"><strong className="mr-1">선정 근거</strong>{it.why}</p>
        <p className="mt-2 flex items-center gap-2 text-caption text-text-muted">근거 카드<CiteChip id={it.cardId} onOpen={onOpen} /></p>
      </details>
    </li>
  );
}
