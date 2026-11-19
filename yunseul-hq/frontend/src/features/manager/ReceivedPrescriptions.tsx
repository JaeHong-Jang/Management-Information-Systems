// 받은 처방: 본사가 이 매장에 보낸 것. 3중 표지(AI 초안/규칙 판정 + 본사 SV 승인)와 함께
import { Link } from 'react-router-dom';
import type { Prescription } from '@shared/contracts';
import { Empty, Panel, Provenance, Tag } from '@/shared/ui';
import { date } from '@/shared/lib/format';
import { KIND, PRESCRIPTION_STATUS } from '@/shared/theme/semantics';

export function ReceivedPrescriptions({ prescriptions, storeId }: { prescriptions: Prescription[]; storeId: string }) {
  const list = prescriptions.filter((p) => p.status !== 'draft' && p.status !== 'rejected');
  return (
    <Panel title="받은 처방" en="RECEIVED" sub="본사가 우리 매장에 보낸 것" className="h-full">
      {list.length === 0 ? (
        <Empty title="받은 처방이 없어요" />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => {
            const k = KIND[p.kind];
            const st = PRESCRIPTION_STATUS[p.status];
            return (
              <li key={p.id} className="rounded-card border border-line p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag icon={k.icon}>{p.kind}</Tag>
                  <Tag tone={st.tone} icon={st.icon}>{st.label}</Tag>
                  <Provenance via={p.via} approved approver="본사 SV" />
                  <span className="num text-caption text-text-muted">{date(p.sentAt ?? p.created)}</span>
                </div>
                <p className="mt-1.5 font-bold">{p.title}</p>
                {p.kind === '근무 전 브리핑' ? (
                  <p className="bubble mt-1.5 inline-block px-4 py-2 text-body">“{p.body}”</p>
                ) : (
                  <p className="mt-0.5 line-clamp-3 text-body text-text-subtle">{p.body}</p>
                )}
                {p.cardIds.length > 0 && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1 text-caption">
                    <span className="text-text-muted">카드</span>
                    {p.cardIds.map((c) => <Link key={c} to={`/store/${storeId}/wiki#${c}`} className="num rounded-badge border border-line-strong px-1.5 text-ink hover:bg-ink-weak">{c}</Link>)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
