// /store/:id/staff 직원 첫 화면: 홈(상황 버튼 → 입력창 → 답 → 내 질문 → 첫 근무 준비 띠 → 오늘 브리핑) · 첫 근무 준비 · 기록하기(?tab=).
// brief·ask는 홈으로 연다. '나'는 localStorage에 저장하고, 없으면 처음 한 번 '누구세요?'를 묻는다. 메뉴는 공통 셸이 맡는다.
// 폭: 휴대폰·태블릿은 한 열 640px. 홈·준비는 1280px 이상에서 두 열(홈: 왼쪽 묻기·내 질문, 오른쪽 340px 첫 근무 준비·오늘 브리핑 / 준비: 왼쪽 지금 장, 오른쪽 전체 목록). 기록은 640px.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Onboarding, Person, StoreState } from '@shared/contracts';
import { useStoreData } from '@/app/StoreData';
import { AsyncView } from '@/shared/ui';
import { AskTab } from './AskTab';
import { BriefingTab } from './BriefingTab';
import { PrepTab, ProgressBar, readMap } from './PrepTab';
import { RecordTab } from './RecordTab';

const TABS = ['home', 'prep', 'record'] as const;
type TabId = (typeof TABS)[number];
const EMPTY_ONBOARDING = (storeId: string): Onboarding => ({ storeId, items: [], reads: [] });

export function StaffPage() {
  const { state, storeId } = useStoreData();
  return <AsyncView state={state}>{(s) => <StaffBody storeId={storeId ?? s.store.id} s={s} />}</AsyncView>;
}

/** 처음 한 번: 누구세요? 이름 버튼(52px 이상) */
function WhoPicker({ staff, onPick }: { staff: Person[]; onPick: (id: string) => void }) {
  return (
    <section aria-labelledby="who">
      <h1 id="who" className="font-display text-display text-ink">누구세요?</h1>
      <p className="mb-4 mt-1 text-body text-text-subtle">이름을 한 번만 골라 주세요. 이 기기에 기억해 두고, 나중에 맨 위에서 바꿀 수 있어요.</p>
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

  if (!me || !person) return <div className="mx-auto max-w-[640px]"><WhoPicker staff={staff} onPick={setMe} /></div>;

  return (
    <div key={me} className={tab === 'record' ? 'mx-auto max-w-[640px]' : 'mx-auto max-w-[640px] xl:max-w-[1060px]'}>
      <p className="mb-4 flex items-center gap-2 text-caption text-text-muted">
        <label className="flex items-center gap-2">
          나
          <select value={me} onChange={(e) => setMe(e.target.value)} className="h-11 rounded-ctl border border-line-strong bg-surface px-2 text-body font-bold text-text">
            {staff.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </label>
        <span className="num ml-auto">{s.today}</span>
      </p>
      {tab === 'home' && (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
          <div className="min-w-0">
            <AskTab storeId={storeId} me={me} cards={s.cards} situations={situations} questions={s.questions} now={s.now ?? s.today} />
          </div>
          <aside className="min-w-0 space-y-8 xl:space-y-6" aria-label="근무 전에 볼 것">
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
        <span>첫 근무 준비 <span className="num">{done}/{ob.items.length}</span>장 읽었어요</span>
        <span className="inline-flex items-center gap-1 text-body">이어서 보기<ArrowRight size={15} aria-hidden /></span>
      </p>
      <ProgressBar done={done} total={ob.items.length} />
    </Link>
  );
}
