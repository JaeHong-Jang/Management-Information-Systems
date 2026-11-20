import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react';
import type { Onboarding, Person, StoreState } from '@shared/contracts';
import { useStoreData } from '@/app/StoreData';
import { AsyncView, PageHeader } from '@/shared/ui';
import { AskTab } from './AskTab';
import { BriefingTab } from './BriefingTab';
import { PrepTab, ProgressBar, readMap } from './PrepTab';
import { RecordTab } from './RecordTab';
import './staff.css';

const TABS = ['home', 'prep', 'record'] as const;
type TabId = (typeof TABS)[number];
const EMPTY_ONBOARDING = (storeId: string): Onboarding => ({ storeId, items: [], reads: [] });

export function StaffPage() {
  const { state, storeId } = useStoreData();
  return <AsyncView state={state}>{(s) => <StaffBody storeId={storeId ?? s.store.id} s={s} />}</AsyncView>;
}

function WhoPicker({ staff, onPick }: { staff: Person[]; onPick: (id: string) => void }) {
  return (
    <section className="staff-picker" aria-labelledby="who">
      <h1 id="who" className="font-display text-display text-ink">근무자 선택</h1>
      <p className="mb-4 mt-1 text-body text-text-subtle">선택한 이름으로 이 매장의 근무 기록을 조회하고 작성합니다.</p>
      <ul className="space-y-2">
        {staff.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id)}
              className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-card border border-line-strong bg-surface px-4 text-left text-mobile font-bold text-ink shadow-card hover:bg-ink-weak"
            >
              {p.name}
              <span className="text-caption font-normal text-text-muted">{p.role} · {p.tenure}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StaffBody({ storeId, s }: { storeId: string; s: StoreState }) {
  const [sp] = useSearchParams();
  const { me, setMe, staff } = useStoreData();
  const raw = sp.get('tab') ?? '';
  const tab: TabId = (TABS as readonly string[]).includes(raw) ? (raw as TabId) : 'home';
  const [ob, setOb] = useState<Onboarding>(s.onboarding ?? EMPTY_ONBOARDING(storeId));
  useEffect(() => setOb(s.onboarding ?? EMPTY_ONBOARDING(storeId)), [s.onboarding, storeId]);
  const situations = s.situations ?? [];
  const person = staff.find((p) => p.id === me);

  if (!me || !person) return <WhoPicker staff={staff} onPick={setMe} />;

  return (
    <div key={me} className="staff-page">
      <PageHeader
        title={{ home: '현장 질문·답변', prep: '첫 근무 준비', record: '근무 사례 기록' }[tab]}
        sub={{ home: '현장 질문 접수 및 사례 카드·점장 답변 조회', prep: '매장별 주요 상황과 응대 절차 확인', record: '현장 대응 사례 작성 및 매장 위키 승인 요청' }[tab]}
        actions={
          <div className="staff-context">
            <label><UserRound size={15} aria-hidden /><span>근무자</span>
              <select value={me} onChange={(e) => setMe(e.target.value)}>
                {staff.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
              </select>
            </label>
            <time dateTime={s.today}><CalendarDays size={14} aria-hidden />{s.today.replaceAll('-', '. ')}</time>
          </div>
        }
      />
      {tab === 'home' && (
        <div className="staff-home-grid">
          <div className="min-w-0">
            <AskTab key={sp.get('ask') ?? ''} initialText={sp.get('ask') ?? ''} storeId={storeId} me={me} cards={s.cards} situations={situations} questions={s.questions} now={s.now ?? s.today} />
          </div>
          <aside className="min-w-0 space-y-4" aria-label="근무 자료">
            <PrepStrip ob={ob} person={person} storeId={storeId} />
            <BriefingTab storeId={storeId} cards={s.cards} />
          </aside>
        </div>
      )}
      {tab === 'prep' && <PrepTab storeId={storeId} me={me} cards={s.cards} situations={situations} onboarding={ob} onUpdate={setOb} />}
      {tab === 'record' && <RecordTab storeId={storeId} me={me} />}
    </div>
  );
}

/** 신입이 첫 근무 준비를 다 읽지 않았으면 노랑 띠 */
function PrepStrip({ ob, person, storeId }: { ob: Onboarding; person: Person | undefined; storeId: string }) {
  if (person?.role !== '신입' || ob.items.length === 0) return null;
  const done = readMap(ob, person.id).size;
  if (done >= ob.items.length) return null;
  return (
    <Link to={`/store/${storeId}/staff?tab=prep`} className="block rounded-card border border-amber-bar bg-yellow-weak px-4 py-3 hover:bg-yellow-hl">
      <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-mobile font-bold text-ink">
        <span>첫 근무 준비 <span className="num">{done}/{ob.items.length}</span>장 확인</span>
        <span className="inline-flex items-center gap-1 text-body">교육 계속<ArrowRight size={15} aria-hidden /></span>
      </p>
      <ProgressBar done={done} total={ob.items.length} />
    </Link>
  );
}
