// 기록하기: 겪은 일을 적으면 회고 인터뷰어가 카드 초안과 추가 질문을 만든다 → 점장 승인 대기로 보낸다
import { useState, type ReactNode } from 'react';
import { CircleCheck, PenLine, RotateCcw, Send } from 'lucide-react';
import type { InterviewDraft } from '@shared/contracts';
import { api, type DraftFields } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { AiDraftBadge, Button, InlineError, PageHeader, Tag, ViaBadge } from '@/shared/ui';

const input = 'w-full rounded-ctl border border-line-strong bg-surface p-3 text-mobile';

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
    <section>
      <PageHeader title="기록하기" en="RECORD" sub="오늘 겪은 일과 어떻게 했는지 편하게 적어 주세요. 손님·동료 이름은 자동으로 가려져요." />
      {sent && (
        <p className="mb-3 flex items-center gap-2 rounded-ctl border border-done bg-done-weak p-3 text-body text-done">
          <CircleCheck size={16} aria-hidden />
          카드 {sent}를 점장 승인 대기로 보냈어요.
        </p>
      )}
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={5} className={input} placeholder="예: 2인 손님이 4인석을 원하셨는데, 피크라 바 자리로 안내하고 이유를 말씀드렸더니 괜찮아하셨어요" aria-label="겪은 일" />
      <Button variant="primary" size="lg" icon={PenLine} className="mt-2 w-full" busy={act.busy === 'interview'} disabled={!raw.trim() || !me} onClick={interview}>
        {draft ? '답 넣고 다시 정리하기' : '카드 초안 만들기'}
      </Button>
      <InlineError message={act.error} />

      {draft && (
        <div className="mt-5 space-y-3 rounded-card border border-dashed border-line-strong bg-surface p-4">
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
          <Field label="할 일">
            <ol className="list-decimal space-y-0.5 pl-5 text-mobile">{draft.actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
          </Field>
          <Field label="피할 것"><input className={input} value={draft.avoid} onChange={(e) => edit('avoid', e.target.value)} /></Field>
          <Field label="점장 호출"><input className={input} value={draft.escalateWhen} onChange={(e) => edit('escalateWhen', e.target.value)} /></Field>
          <Field label="손님 안내"><input className={input} value={draft.customerNotice ?? ''} onChange={(e) => edit('customerNotice', e.target.value)} /></Field>

          {draft.followups.length > 0 && (
            <div className="space-y-2 border-t border-line pt-3">
              <p className="font-bold">더 알려 주세요</p>
              {draft.followups.map((f) => (
                <Field key={f} label={f}>
                  <input className={input} value={answers[f] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [f]: e.target.value }))} />
                </Field>
              ))}
              <Button icon={RotateCcw} className="w-full" size="lg" busy={act.busy === 'interview'} onClick={interview}>답 넣고 다시 정리하기</Button>
            </div>
          )}

          <Button variant="primary" size="lg" icon={Send} className="w-full" busy={act.busy === 'submit'} onClick={submit}>점장 승인 요청하기</Button>
          <p className="text-caption text-text-muted">점장이 승인해야 매장 위키와 브리핑에 들어가요.</p>
        </div>
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
