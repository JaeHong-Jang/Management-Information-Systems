// 기록하기: 겪은 일을 적으면 회고 인터뷰어가 카드 초안과 추가 질문을 만든다 → 점장 승인 대기로 보낸다
import { useState, type ReactNode } from 'react';
import { CircleCheck, PenLine, RotateCcw, Send } from 'lucide-react';
import type { InterviewDraft } from '@shared/contracts';
import { api, type DraftFields } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { AiDraftBadge, Button, InlineError, Tag, ViaBadge } from '@/shared/ui';

const input = 'w-full rounded-ctl border border-line-strong bg-surface p-3 text-body';

export function RecordTab({ storeId, me }: { storeId: string; me: string }) {
  const [raw, setRaw] = useState('');
  const [draft, setDraft] = useState<InterviewDraft | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const act = useAction();

  const interview = async () => {
    const list = Object.entries(answers).filter(([, a]) => a.trim()).map(([question, answer]) => ({ question, answer }));
    const d = await act.run('interview', () => api.interview(storeId, raw.trim(), me, list));
    if (d) setDraft(d);
  };
  const submit = async () => {
    if (!draft) return;
    const fields: DraftFields = {
      title: draft.title, topic: draft.topic, situation: draft.situation, reason: draft.reason, actions: draft.actions,
      avoid: draft.avoid, escalateWhen: draft.escalateWhen, customerNotice: draft.customerNotice, source: draft.source, tags: draft.tags,
    };
    const card = await act.run('submit', () => api.submitCard(storeId, fields, me));
    if (card) {
      setSent(card.id);
      setDraft(null);
      setRaw('');
      setAnswers({});
    }
  };
  const edit = (k: 'title' | 'situation' | 'reason' | 'avoid' | 'escalateWhen' | 'customerNotice', v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <section className="staff-record">
      <section className="staff-card" aria-labelledby="record-entry">
        <header className="staff-card-head"><h2 id="record-entry">사례 작성</h2></header>
        <div className="staff-card-body">
          {sent && (
            <p role="status" className="mb-3 flex items-center gap-2 rounded-ctl border border-done bg-done-weak p-3 text-body text-done">
              <CircleCheck size={16} aria-hidden />승인 요청 완료 · 카드 {sent}
            </p>
          )}
          <label className="mb-1 block text-body font-semibold" htmlFor="staff-incident">상황 및 대응 내용</label>
          <textarea id="staff-incident" value={raw} onChange={(e) => setRaw(e.target.value)} rows={5} className={input} placeholder="발생 상황, 판단 근거, 대응 결과 입력" />
          <div className="staff-form-footer">
            <p className="text-caption text-text-muted">고객 및 동료의 개인정보 입력 제외</p>
            <Button variant="primary" icon={PenLine} busy={act.busy === 'interview'} disabled={!raw.trim() || !me || !!act.busy} onClick={interview}>
              {draft ? '초안 다시 작성' : '카드 초안 작성'}
            </Button>
          </div>
          <InlineError message={act.error} />
        </div>
      </section>

      {draft && (
        <section className="staff-card mt-4">
          <header className="staff-card-head"><h2>초안 검토</h2></header>
          <div className="staff-card-body space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <AiDraftBadge label="카드 초안" />
              <Tag>{draft.source}</Tag>
              <ViaBadge via={draft.via} />
              {draft.masked > 0 && <span className="text-caption text-text-muted">개인정보 {draft.masked}곳 가림</span>}
            </div>
            {draft.problems.length > 0 && (
              <ul className="rounded-ctl border border-amber-bar bg-amber-weak p-3 text-body text-amber-text">
                {draft.problems.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
            <Field label="제목"><input className={input} value={draft.title} onChange={(e) => edit('title', e.target.value)} /></Field>
            <Field label="상황"><textarea className={input} rows={2} value={draft.situation} onChange={(e) => edit('situation', e.target.value)} /></Field>
            <Field label="판단 이유"><textarea className={input} rows={2} value={draft.reason} onChange={(e) => edit('reason', e.target.value)} /></Field>
            <Field label="대응 절차">
              <ol className="list-decimal space-y-0.5 pl-5 text-body">{draft.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
            </Field>
            <Field label="유의 사항"><input className={input} value={draft.avoid} onChange={(e) => edit('avoid', e.target.value)} /></Field>
            <Field label="점장 호출"><input className={input} value={draft.escalateWhen} onChange={(e) => edit('escalateWhen', e.target.value)} /></Field>
            <Field label="고객 안내 예시"><input className={input} value={draft.customerNotice ?? ''} onChange={(e) => edit('customerNotice', e.target.value)} /></Field>

            {draft.followups.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3">
                <p className="font-bold">추가 확인 사항</p>
                {draft.followups.map((f) => (
                  <Field key={f} label={f}>
                    <input className={input} value={answers[f] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [f]: e.target.value }))} />
                  </Field>
                ))}
                <Button icon={RotateCcw} className="w-full" size="lg" busy={act.busy === 'interview'} disabled={!!act.busy || !raw.trim()} onClick={interview}>추가 답변 반영</Button>
              </div>
            )}

            <Button variant="primary" size="lg" icon={Send} className="w-full" busy={act.busy === 'submit'} disabled={!!act.busy || !draft.title.trim()} onClick={submit}>점장 승인 요청</Button>
            <p className="text-caption text-text-muted">점장 승인 후 매장 위키 및 브리핑에 반영.</p>
          </div>
        </section>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption text-text-muted">{label}</span>
      {children}
    </label>
  );
}
