// /store/:id/staff 직원: 오늘 브리핑 · 물어보기 · 기록하기(?tab=). 메뉴는 공통 셸(사이드바/하단 탭)이 맡고, 본문만 640px로 좁다.
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView } from '@/shared/ui';
import { AskTab } from './AskTab';
import { BriefingTab } from './BriefingTab';
import { RecordTab } from './RecordTab';

const TABS = ['brief', 'ask', 'record'] as const;
type TabId = (typeof TABS)[number];

export function StaffPage() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const tab = ((TABS as readonly string[]).includes(sp.get('tab') ?? '') ? sp.get('tab') : 'brief') as TabId;
  const state = useAsync(() => api.state(id), [id]);
  const [me, setMe] = useState('');

  const staff = (state.data?.people ?? []).filter((p) => p.role === '신입' || p.role === '숙련');
  useEffect(() => {
    if (!me && staff[0]) setMe(staff[0].id);
  }, [me, staff]);

  return (
    <AsyncView state={state}>
      {(s) => (
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
          {tab === 'brief' && <BriefingTab storeId={id} cards={s.cards} />}
          {tab === 'ask' && <AskTab storeId={id} me={me} cards={s.cards} />}
          {tab === 'record' && <RecordTab storeId={id} me={me} />}
        </>
      )}
    </AsyncView>
  );
}
