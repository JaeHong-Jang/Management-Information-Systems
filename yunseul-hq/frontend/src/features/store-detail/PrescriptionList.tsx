// 처방 목록: 보내기 / 완료 / 거절. 종류마다 보여 주는 내용이 달라요.
// 3중 표지: 처방팀이 쓴 것(AI 초안 / 규칙 판정) + 본사 SV가 보냈는지(사람 승인). "완료 ≠ 승인": 카드는 점장이 다시 승인한다.
import { Link } from 'react-router-dom';
import { Ban, Check, Send, Square } from 'lucide-react';
import type { Finding, Prescription } from '@shared/contracts';
import type { PrescriptionAction } from '@/shared/api/client';
import { Button, Empty, Panel, Provenance, Tag } from '@/shared/ui';
import { date } from '@/shared/lib/format';
import { KIND, PRESCRIPTION_STATUS } from '@/shared/theme/semantics';

export const PRESCRIPTION_ORDER = { draft: 0, sent: 1, done: 2, rejected: 3 } as const;

export function PrescriptionList({ storeId, prescriptions, findings, hasDiagnosis, busy, onAction }: {
  storeId: string;
  prescriptions: Prescription[];
  findings: Finding[];
  hasDiagnosis: boolean;
  busy: string | null;
  onAction: (p: Prescription, a: PrescriptionAction) => void;
}) {
  const fx = new Map(findings.map((f) => [f.id, f]));
  const list = [...prescriptions].sort((a, b) => PRESCRIPTION_ORDER[a.status] - PRESCRIPTION_ORDER[b.status] || b.created.localeCompare(a.created));

  return (
    <Panel id="prescriptions" title="처방" sub="지식 공백은 매장 카드·브리핑 대상으로 분류. 운영·위생·규칙 문제는 SV 방문 과제로 분류">
      {list.length === 0 ? (
        <Empty title="등록된 처방 없음">{hasDiagnosis ? "업무 처리에서 처방 초안 작성 가능" : '원인 진단 후 작성 가능'}</Empty>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <PrescriptionItem key={p.id} p={p} storeId={storeId} fx={fx} busy={busy} onAction={(a) => onAction(p, a)} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PrescriptionItem({ p, storeId, fx, busy, onAction }: {
  p: Prescription;
  storeId: string;
  fx: Map<string, Finding>;
  busy: string | null;
  onAction: (a: PrescriptionAction) => void;
}) {
  const k = KIND[p.kind];
  const KindIcon = k.icon;
  const st = PRESCRIPTION_STATUS[p.status];
  const complaints = p.findingIds.map((id) => fx.get(id)?.complaint ?? id);
  const sent = p.status === 'sent' || p.status === 'done';
  return (
    <li id={p.id} className={`scroll-mt-24 rounded-card border p-3 ${p.status === 'draft' ? 'border-dashed border-line-strong' : 'border-line'} ${p.status === 'rejected' ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag icon={KindIcon}>{p.kind}</Tag>
            <Tag tone={st.tone} icon={st.icon}>{st.label}</Tag>
            <Provenance via={p.via} approved={sent} approver="본사 SV" pendingLabel={p.status === 'rejected' ? '거절됨' : '본사 SV 승인 전'} />
            <span className="text-caption text-text-muted">담당 {k.to}</span>
          </div>
          <h3 className="mt-1.5 font-bold">{p.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.status === 'draft' && (
            <>
              <Button size="sm" variant="primary" icon={Send} busy={busy === `${p.id}:send`} onClick={() => onAction('send')}>보내기</Button>
              <Button size="sm" icon={Ban} busy={busy === `${p.id}:reject`} onClick={() => onAction('reject')}>거절</Button>
            </>
          )}
          {p.status === 'sent' && (
            <Button size="sm" icon={Check} busy={busy === `${p.id}:done`} onClick={() => onAction('done')}>완료 처리</Button>
          )}
        </div>
      </div>

      {p.kind === '근무 전 브리핑' ? (
        <p className="bubble mt-2 inline-block px-4 py-2 text-body">“{p.body}”</p>
      ) : (
        <p className="mt-2 whitespace-pre-line text-body text-text-subtle">{p.body}</p>
      )}

      {p.kind === 'SV 방문 과제' && p.checklist.length > 0 && (
        <ul className="mt-2 space-y-1">
          {p.checklist.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-body">
              {p.status === 'done' ? <Check size={15} className="mt-0.5 shrink-0 text-done" aria-label="점검함" /> : <Square size={15} className="mt-0.5 shrink-0 text-text-muted" aria-label="점검 전" />}
              {c}
            </li>
          ))}
        </ul>
      )}
      {p.kind === '사례 카드' && p.cardIds.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-caption">
          <span className="text-text-muted">배포 카드</span>
          {p.cardIds.map((c) => (
            <Link key={c} to={`/store/${storeId}/wiki#${c}`} className="num rounded-badge border border-line-strong px-1.5 text-ink hover:bg-ink-weak">{c}</Link>
          ))}
          <span className="text-text-muted">· {p.status === 'draft' ? '발송 후 점장 승인 대기' : '점장 승인 후 위키 게시'}</span>
        </p>
      )}
      {p.kind === '표준 개정 제안' && (
        <p className="mt-2 text-caption"><Link to="/hq/standards" className="text-ink underline">본사 표준·개정 제안에서 보기</Link></p>
      )}

      <p className="mt-2 flex flex-wrap gap-x-3 text-caption text-text-muted">
        <span className="num dev">{p.id}</span>
        {complaints.length > 0 && <span>대상 불만: {complaints.join(', ')}</span>}
        <span>만듦 <span className="num">{date(p.created)}</span></span>
        {p.sentAt && <span>보냄 <span className="num">{date(p.sentAt)}</span></span>}
        {p.doneAt && <span>완료 <span className="num">{date(p.doneAt)}</span></span>}
      </p>
    </li>
  );
}
