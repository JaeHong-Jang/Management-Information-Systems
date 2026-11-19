// 우리 매장 상황 표: 리뷰 불만 · 카드 · 직원 질문 · 상태. 카드 없는 상황('gap')은 여기서 바로 카드를 만든다.
// 점장이 쓴 카드는 기존 카드 API(POST /cards)가 바로 승인 카드로 저장한다.
import { Fragment, useState } from 'react';
import { CirclePlus, X } from 'lucide-react';
import type { Person, Situation } from '@shared/contracts';
import { api, type DraftFields } from '@/shared/api/client';
import { useAction } from '@/shared/lib/useAsync';
import { Button, Empty, InlineError, Panel, Tag } from '@/shared/ui';
import { pct } from '@/shared/lib/format';

const field = 'w-full rounded-ctl border border-line-strong bg-surface p-2.5 text-body';

function StatusTag({ s }: { s: Situation }) {
  if (s.gap) return <Tag tone="amber">카드 없음</Tag>;
  if (s.openQuestions > 0) return <Tag tone="amber">답 대기 {s.openQuestions}</Tag>;
  return <Tag tone="done">카드 있음</Tag>;
}

function CardChips({ s }: { s: Situation }) {
  if (s.cardIds.length === 0) return <span className="text-text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {s.cardIds.map((c) => <span key={c} className="num rounded-badge border border-line-strong px-1.5 text-caption text-ink">{c}</span>)}
    </span>
  );
}

const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

function CardForm({ storeId, s, topics, managerId, onDone, onCancel }: {
  storeId: string;
  s: Situation;
  topics: string[];
  managerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({ title: s.title, topic: s.cardTopics[0] ?? '', situation: s.title, reason: '', actions: '', avoid: '', escalateWhen: '', customerNotice: '' });
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
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => (
    <label className="block"><span className="mb-1 block text-caption font-bold text-text-subtle">{t}</span>{children}</label>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-3 rounded-card border border-dashed border-line-strong bg-surface p-4">
      <p className="text-body font-bold">‘{s.title}’ 카드 만들기 <span className="font-normal text-text-muted">· 저장하면 바로 위키에 올라가요</span></p>
      <div className="grid gap-3 md:grid-cols-2">
        <L t="제목"><input value={f.title} onChange={set('title')} className={field} /></L>
        <L t="주제">
          <select value={f.topic} onChange={set('topic')} className={field}>{topicList.map((t) => <option key={t}>{t}</option>)}</select>
        </L>
      </div>
      <L t="상황"><textarea value={f.situation} onChange={set('situation')} rows={2} className={field} /></L>
      <L t="왜 그렇게 해요"><textarea value={f.reason} onChange={set('reason')} rows={2} className={field} /></L>
      <L t="이렇게 해요 (한 줄에 하나)"><textarea value={f.actions} onChange={set('actions')} rows={3} className={field} /></L>
      <div className="grid gap-3 md:grid-cols-2">
        <L t="하지 말 것"><textarea value={f.avoid} onChange={set('avoid')} rows={2} className={field} /></L>
        <L t="점장을 부를 때"><textarea value={f.escalateWhen} onChange={set('escalateWhen')} rows={2} className={field} /></L>
      </div>
      <L t="손님께 할 말"><textarea value={f.customerNotice} onChange={set('customerNotice')} rows={2} className={field} /></L>
      <div className="flex flex-wrap justify-end gap-2">
        <Button icon={X} onClick={onCancel}>닫기</Button>
        <Button type="submit" variant="primary" busy={act.busy === 'save'} disabled={!ok}>카드로 저장</Button>
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
  const managerId = people.find((p) => p.role === '점장')?.id ?? '';
  const form = (s: Situation) => (
    <CardForm storeId={storeId} s={s} topics={topics} managerId={managerId} onCancel={() => setOpen(null)} onDone={() => { setOpen(null); onChanged(); }} />
  );
  const make = (s: Situation) =>
    s.gap && open !== s.id ? <Button size="sm" icon={CirclePlus} onClick={() => setOpen(s.id)}>카드 만들기</Button> : null;
  const gaps = situations.filter((s) => s.gap).length;
  const compare = (s: Situation) => `${pct(s.storeShare)} (브랜드 ${pct(s.brandShare)})`;

  return (
    <Panel id="situations" title="우리 매장 상황" en="SITUATIONS" sub={`카드 없는 상황 ${gaps}개 · 리뷰 불만이 자주 나오는데 매장 카드가 없으면 점장이 만들 차례예요`}>
      {situations.length === 0 ? (
        <Empty title="상황 데이터를 불러오지 못했어요" />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-body">
              <thead className="text-caption text-text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-medium">상황</th>
                  <th scope="col" className="py-2 pr-3 font-medium">리뷰 불만 (이 매장 비율)</th>
                  <th scope="col" className="py-2 pr-3 font-medium">카드</th>
                  <th scope="col" className="py-2 pr-3 font-medium">직원 질문</th>
                  <th scope="col" className="py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {situations.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="align-top">
                      <td className="py-2.5 pr-3 font-medium">{s.title}</td>
                      <td className="num py-2.5 pr-3">{s.storeReviews}건 <span className="text-caption text-text-muted">· {compare(s)}</span></td>
                      <td className="py-2.5 pr-3"><CardChips s={s} /></td>
                      <td className="num py-2.5 pr-3">{s.questions}{s.openQuestions > 0 && <span className="text-caption text-amber-text"> (미답 {s.openQuestions})</span>}</td>
                      <td className="py-2.5"><span className="flex flex-wrap items-center gap-2"><StatusTag s={s} />{make(s)}</span></td>
                    </tr>
                    {open === s.id && <tr><td colSpan={5} className="pb-3">{form(s)}</td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {situations.map((s) => (
              <li key={s.id} className="rounded-card border border-line p-3">
                <p className="font-bold">{s.title}</p>
                <p className="num mt-1 text-caption text-text-muted">리뷰 불만 {s.storeReviews}건 · {compare(s)}</p>
                <p className="num text-caption text-text-muted">직원 질문 {s.questions}{s.openQuestions > 0 && ` (미답 ${s.openQuestions})`}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><StatusTag s={s} /><CardChips s={s} /></div>
                {s.gap && open !== s.id && <div className="mt-2"><Button icon={CirclePlus} onClick={() => setOpen(s.id)} className="w-full">카드 만들기</Button></div>}
                {open === s.id && <div className="mt-3">{form(s)}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
