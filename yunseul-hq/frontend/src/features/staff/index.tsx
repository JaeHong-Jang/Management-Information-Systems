// /store/:id/staff 직원 첫 화면: 홈(지금 막혔어요 + 오늘 브리핑) · 첫 근무 준비 · 기록하기(?tab=). brief·ask는 홈으로 연다.
// 메뉴는 공통 셸(사이드바/하단 탭)이 맡고, 본문만 640px로 좁다.
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Onboarding, Person, StoreState } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView } from '@/shared/ui';
import { AskTab } from './AskTab';
import { BriefingTab } from './BriefingTab';
import { PrepTab, ProgressBar, readMap } from './PrepTab';
import { RecordTab } from './RecordTab';

const TABS = ['home', 'prep', 'record'] as const;
type TabId = (typeof TABS)[number];
const EMPTY_ONBOARDING = (storeId: string): Onboarding => ({ storeId, items: [], reads: [] });

export function StaffPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => api.state(id), [id]);
  return <AsyncView state={state}>{(s) => <StaffBody storeId={id} s={s} />}</AsyncView>;
}

function StaffBody({ storeId, s }: { storeId: string; s: StoreState }) {
  const [sp] = useSearchParams();
  const raw = sp.get('tab') ?? '';
  const tab: TabId = (TABS as readonly string[]).includes(raw) ? (raw as TabId) : 'home';
  const staff = s.people.filter((p) => p.role === '신입' || p.role === '숙련');
  const defaultMe = (staff.find((p) => p.id === 'P006') ?? staff.find((p) => p.role === '신입') ?? staff[0])?.id ?? '';
  const [me, setMe] = useState(defaultMe);
  useEffect(() => {
    if (!me && defaultMe) setMe(defaultMe);
  }, [me, defaultMe]);
  const [ob, setOb] = useState<Onboarding>(s.onboarding ?? EMPTY_ONBOARDING(storeId));
  const situations = s.situations ?? [];
  const person = staff.find((p) => p.id === me);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
        <div>
          <p className="font-display text-section text-ink">{s.store.name}</p>
          <p className="num text-caption text-text-muted">{s.today}</p>
        </div>
        <label className="flex items-center gap-2 text-caption text-text-muted">
          나
          <select value={me} onChange={(e) => setMe(e.target.value)} className="h-11 rounded-ctl border border-line-strong bg-surface px-2 text-mobile text-text">
            {staff.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </label>
      </div>
      {tab === 'home' && (
        <div className="space-y-8">
          <AskTab storeId={storeId} me={me} cards={s.cards} situations={situations} />
          <PrepStrip ob={ob} person={person} storeId={storeId} />
          <BriefingTab storeId={storeId} cards={s.cards} />
        </div>
      )}
      {tab === 'prep' && <PrepTab storeId={storeId} me={me} cards={s.cards} situations={situations} onboarding={ob} onUpdate={setOb} />}
      {tab === 'record' && <RecordTab storeId={storeId} me={me} />}
    </>
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
