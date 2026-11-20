// 우리 매장 상황 표: 리뷰 불만 · 카드 · 직원 질문 · 상태. 카드 없는 상황('gap')은 여기서 바로 카드를 만든다.
// 점장이 쓴 카드는 기존 카드 API(POST /cards)가 바로 승인 위키에 등록한다.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CirclePlus, X } from 'lucide-react';
import type { Person, Situation } from '@shared/contracts';
import { api, type DraftFields } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, Drawer, Empty, InlineError, Panel, Tag } from '@/shared/ui';
import { pct } from '@/shared/lib/format';

const field = 'w-full rounded-ctl border border-line-strong bg-surface p-2.5 text-body';

const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-caption font-bold text-text-subtle">{label}</span>{children}</label>;
}

function CardForm({ storeId, s, topics, managerId, onDone, onCancel }: {
  storeId: string;
  s: Situation;
  topics: string[];
  managerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({ title: s.title, topic: s.cardTopics[0] ?? topics[0] ?? '', situation: s.title, reason: '', actions: '', avoid: '', escalateWhen: '', customerNotice: '' });
  const act = useAction();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const topicList = [...new Set([...s.cardTopics, ...topics])];
  const ok = f.title.trim() && f.situation.trim() && lines(f.actions).length > 0 && !!managerId;
  const save = async () => {
    const draft: DraftFields = {
      title: f.title.trim(), topic: f.topic, situation: f.situation.trim(), reason: f.reason.trim(), actions: lines(f.actions),
      avoid: f.avoid.trim(), escalateWhen: f.escalateWhen.trim(), ...(f.customerNotice.trim() ? { customerNotice: f.customerNotice.trim() } : {}),
      source: '현장노하우', tags: [],
    };
    if (await act.run('save', () => api.submitCard(storeId, draft, managerId))) onDone();
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-3">
      <p className="text-body font-bold">저장 시 매장 위키에 승인 카드로 등록</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="제목"><input value={f.title} onChange={set('title')} className={field} /></Field>
        <Field label="주제">
          <select value={f.topic} onChange={set('topic')} className={field}>{topicList.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
      </div>
      <Field label="상황"><textarea value={f.situation} onChange={set('situation')} rows={2} className={field} /></Field>
      <Field label="판단 근거"><textarea value={f.reason} onChange={set('reason')} rows={2} className={field} /></Field>
      <Field label="대응 절차 (줄바꿈으로 구분)"><textarea value={f.actions} onChange={set('actions')} rows={3} className={field} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="금지 사항"><textarea value={f.avoid} onChange={set('avoid')} rows={2} className={field} /></Field>
        <Field label="점장 호출 기준"><textarea value={f.escalateWhen} onChange={set('escalateWhen')} rows={2} className={field} /></Field>
      </div>
      <Field label="고객 안내 문구"><textarea value={f.customerNotice} onChange={set('customerNotice')} rows={2} className={field} /></Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button icon={X} onClick={onCancel}>닫기</Button>
        <Button type="submit" variant="primary" busy={act.busy === 'save'} disabled={!ok}>위키에 등록</Button>
      </div>
      <InlineError message={act.error} />
    </form>
  );
}

export function SituationTable({ storeId, situations, topics, people, onChanged }: {
  storeId: string;
  situations: Situation[];
  topics: string[];
  people: Person[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [showRest, setShowRest] = useState(false);
  const managerId = people.find((p) => p.role === '점장')?.id ?? '';
  const gapRows = situations.filter((s) => s.gap);
  const rest = situations.filter((s) => !s.gap);
  const list = showRest ? [...gapRows, ...rest] : gapRows;
  const selected = situations.find((s) => s.id === open);
  return (
    <Panel id="situations" title="상황별 대응 카드" sub={`불만 리뷰 3건 이상·매장 카드 미등록 ${gapRows.length}건 / 전체 상황 ${situations.length}건`} bodyClass="!p-0">
      {situations.length === 0 ? <div className="p-4"><Empty title="등록된 상황 없음" /></div> : (
        <>
          <div className="manager-list-tools">
            <label><input type="checkbox" checked={showRest} onChange={(e) => setShowRest(e.target.checked)} />전체 상황 표시</label>
          </div>
          {list.length === 0 && <p className="px-4 py-5 text-body text-text-muted">우선 작성 대상 없음</p>}
          <ul className="divide-y divide-line">
            {list.map((s) => (
              <li className="manager-situation" key={s.id}>
                <div className="min-w-0">
                  <h3>{s.title}</h3>
                  <dl className="manager-facts">
                    <div><dt>불만 리뷰</dt><dd><b className="num">{s.storeReviews}건</b><span>매장 {pct(s.storeShare)} · 브랜드 {pct(s.brandShare)}</span></dd></div>
                    <div><dt>직원 질문</dt><dd><b className="num">{s.questions}건</b>{s.openQuestions > 0 && <span>미답변 {s.openQuestions}건</span>}</dd></div>
                    <div><dt>관련 카드</dt><dd>{s.cardIds.length > 0 ? s.cardIds.map((c) => <Link key={c} to={`/store/${storeId}/wiki#${c}`}>{c}</Link>) : <span>없음</span>}</dd></div>
                  </dl>
                </div>
                {s.gap ? <Button size="sm" icon={CirclePlus} onClick={() => setOpen(s.id)}>카드 작성</Button> : <Tag tone={s.storeCard ? 'done' : 'neutral'}>{s.storeCard ? '매장 카드 등록' : s.cardIds.length ? '본사 카드만 등록' : '카드 미등록'}</Tag>}
              </li>
            ))}
          </ul>
        </>
      )}
      <Drawer open={!!selected} title="매장 대응 카드 작성" eyebrow={selected?.title} onClose={() => setOpen(null)}>
        {selected && <CardForm key={selected.id} storeId={storeId} s={selected} topics={topics} managerId={managerId} onCancel={() => setOpen(null)} onDone={() => { setOpen(null); onChanged(); }} />}
      </Drawer>
    </Panel>
  );
}
