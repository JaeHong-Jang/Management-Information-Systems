// 오늘 브리핑: '손님께 할 말'은 말풍선(옅은 노랑, 24px 0 24px 24px) + '왜'. 카드 번호를 누르면 근거 카드 서랍
import { useState } from 'react';
import type { Briefing, Card } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, CardDrawer, CiteChip, Empty, PageHeader, ViaBadge } from '@/shared/ui';

export function BriefingTab({ storeId, cards }: { storeId: string; cards: Card[] }) {
  const b = useAsync(() => api.briefing(storeId), [storeId]);
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(cards.map((c) => [c.id, c]));
  return (
    <AsyncView state={b}>
      {(br) => (
        <section>
          <PageHeader title="오늘 브리핑" en="BRIEFING" sub={`${br.date} 근무 전에 읽어 주세요. 손님께 미리 말씀드리면 생기지 않는 불만이에요.`} actions={<ViaBadge via={br.via} />} />
          {br.items.length === 0 ? (
            <Empty title="오늘 따로 알릴 것이 없어요">근무 중에 막히면 위에서 바로 물어보세요.</Empty>
          ) : (
            <>
              <ol className="space-y-4">{br.items.slice(0, 3).map((it, i) => <Item key={it.cardId} it={it} n={i + 1} onOpen={setOpen} />)}</ol>
              {br.items.length > 3 && (
                <details className="mt-3">
                  <summary className="flex min-h-[48px] cursor-pointer items-center text-body font-bold text-ink hover:underline">나머지 {br.items.length - 3}개 더 보기</summary>
                  <ol className="mt-1 space-y-4">{br.items.slice(3).map((it, i) => <Item key={it.cardId} it={it} n={i + 4} onOpen={setOpen} />)}</ol>
                </details>
              )}
            </>
          )}
          <CardDrawer cardId={open} card={open ? byId.get(open) : null} onClose={() => setOpen(null)} />
        </section>
      )}
    </AsyncView>
  );
}

function Item({ it, n, onOpen }: { it: Briefing['items'][number]; n: number; onOpen: (id: string) => void }) {
  return (
    <li className="rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 text-body font-bold">
        <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-caption text-white">{n}</span>
        {it.title}
      </p>
      <p className="mt-3 text-caption font-bold text-text-subtle">손님께 할 말</p>
      <p className="bubble mt-1 px-5 py-3.5 text-mobile font-medium text-ink">“{it.say}”</p>
      <p className="mt-3 text-body text-text-subtle">
        <span className="mr-1 font-bold text-text">왜</span>
        {it.why}
      </p>
      <p className="mt-2 flex items-center gap-1 text-caption text-text-muted">
        근거 카드
        <CiteChip id={it.cardId} onOpen={onOpen} />
      </p>
    </li>
  );
}
