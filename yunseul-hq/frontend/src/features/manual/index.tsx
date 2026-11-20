import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, ClipboardList,
  ExternalLink, FileCheck2, FileText, ListChecks, MessageSquareText, UserRound,
} from 'lucide-react';
import type { ManualChecklist, ManualItem, Person, StoreState } from '@shared/contracts';
import { useApp, type AppRole } from '@/app/AppData';
import { useStoreData } from '@/app/StoreData';
import { ApiError } from '@/shared/api/client';
import { getManual, setManualCheck } from '@/shared/api/manual';
import { useAsync } from '@/shared/lib/useAsync';
import { AsyncView, PageHeader } from '@/shared/ui';
import './manual.css';

const PUBLIC = '본사 공개 기준';
type Filter = '전체' | '미점검' | '완료';

export function ManualPage() {
  const { id } = useParams();
  const { state } = useStoreData();
  return <AsyncView state={state}>{store => store.store.id === id && <ManualStore key={id} store={store} />}</AsyncView>;
}

function ManualStore({ store }: { store: StoreState }) {
  const { role } = useApp();
  const { staff, me, setMe } = useStoreData();
  const [viewPerson, setViewPerson] = useState('');
  const employee = role === '직원';
  const personId = employee ? me : viewPerson;
  return (
    <ManualWorkspace key={JSON.stringify([store.store.id, role, personId])}
      store={store} role={role} staff={staff} personId={personId}
      onPersonChange={employee ? setMe : setViewPerson} />
  );
}

function ManualWorkspace({ store, role, staff, personId, onPersonChange }: {
  store: StoreState; role: AppRole; staff: Person[]; personId: string; onPersonChange: (id: string) => void;
}) {
  const storeId = store.store.id;
  const manual = useAsync(() => getManual(storeId, personId), [storeId, personId]);
  const [filter, setFilter] = useState<Filter>('전체');
  const [selectedId, setSelectedId] = useState('');
  const [pending, setPending] = useState('');
  const [saveError, setSaveError] = useState('');
  const busy = useRef(false);
  const listRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const isEmployee = role === '직원';

  // Reload on focus and the next Korean business day, even if a shift leaves this tab open overnight.
  const { reload } = manual;
  useEffect(() => {
    const inFocus = () => { if (!document.hidden && !busy.current) void reload(); };
    const now = Date.now();
    const offset = 9 * 60 * 60 * 1000;
    const day = 24 * 60 * 60 * 1000;
    const midnight = window.setTimeout(inFocus, day - (now + offset) % day + 100);
    document.addEventListener('visibilitychange', inFocus);
    return () => { document.removeEventListener('visibilitychange', inFocus); window.clearTimeout(midnight); };
  }, [reload, manual.data?.date]);

  async function toggle(data: ManualChecklist, item: ManualItem) {
    if (busy.current || !personId || !isEmployee || manual.loading) return;
    busy.current = true;
    setPending(item.id);
    setSaveError('');
    try {
      const updated = await setManualCheck(storeId, item.id, personId, data.date, !data.checkedIds.includes(item.id));
      manual.setData(() => updated);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '점검 결과를 저장하지 못했습니다.');
      if (error instanceof ApiError && error.status === 409) await reload();
    } finally {
      busy.current = false;
      setPending('');
    }
  }

  function selectItem(id: string) {
    setSelectedId(id);
    if (!window.matchMedia('(min-width: 1220px)').matches) {
      requestAnimationFrame(() => {
        detailRef.current?.focus({ preventScroll: true });
        detailRef.current?.scrollIntoView({ block: 'start' });
      });
    }
  }

  return (
    <div className="manual-page">
      <PageHeader title="공통 매뉴얼" sub="본사 공개 기준 및 윤슬 실무 제안에 따른 일일 근무 점검" />
      <AsyncView state={manual}>{data => {
        const checked = new Set(data.checkedIds);
        const complete = data.items.filter(item => checked.has(item.id)).length;
        const filtered = data.items.filter(item => filter === '전체' || (filter === '완료') === checked.has(item.id));
        const selected = filtered.find(item => item.id === selectedId) ?? filtered[0];
        const official = data.items.filter(item => item.basis === PUBLIC).length;
        return (
          <>
            <div className="manual-totals">
              <ProgressSummary completed={complete} total={data.items.length} identified={!!personId} />
              <div className="manual-stat">
                <span className="manual-stat-icon"><FileCheck2 size={20} aria-hidden /></span>
                <span className="manual-stat-label">본사 공개 기준</span>
                <p><strong>{official}</strong><span>건</span></p>
              </div>
              <div className="manual-stat practice">
                <span className="manual-stat-icon"><BookOpen size={20} aria-hidden /></span>
                <span className="manual-stat-label">윤슬 실무 제안</span>
                <p><strong>{data.items.length - official}</strong><span>건</span></p>
              </div>
            </div>
            <div className="manual-workspace">
              <section ref={listRef} className="manual-register" aria-labelledby="manual-list-title" id="manual-list">
                <div className="manual-register-heading">
                  <div className="manual-section-title"><ClipboardList size={20} aria-hidden /><h2 id="manual-list-title">근무 체크리스트</h2></div>
                  <span className="manual-date"><CalendarDays size={14} aria-hidden /><time dateTime={data.date}>{data.date.replaceAll('-', '. ')}</time></span>
                </div>
                <div className="manual-toolbar">
                  <div role="group" aria-label="점검 상태 필터" className="manual-filters">
                    {(['전체', '미점검', '완료'] as const).map(value =>
                      <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
                        disabled={!personId && value !== '전체'}>{value}</button>)}
                  </div>
                  <label className="manual-person">
                    <UserRound size={15} aria-hidden />
                    <select aria-label={isEmployee ? '점검 담당자' : '조회할 직원'} value={personId} onChange={e => onPersonChange(e.target.value)} disabled={!!pending}>
                      <option value="">{isEmployee ? '담당자 선택' : '직원 기록 조회'}</option>
                      {staff.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
                    </select>
                  </label>
                </div>
                {!personId && <p className="manual-note">{isEmployee ? '점검 기록 저장을 위해 담당자를 선택하십시오.' : '점검 기록 조회를 위해 직원을 선택하십시오.'}</p>}
                {saveError && <p className="manual-error" role="alert">{saveError}</p>}
                {manual.error && <p className="manual-error" role="alert">{manual.error} <button onClick={() => void reload()}>다시 불러오기</button></p>}
                <table className="manual-table">
                  <caption className="sr-only">근무 점검 항목과 기준 상세</caption>
                  <thead><tr><th scope="col">점검</th><th scope="col">분야</th><th scope="col">점검 항목</th><th scope="col">근거 구분</th></tr></thead>
                  <tbody>{filtered.map(item =>
                    <tr key={item.id} className={selected?.id === item.id ? 'current' : undefined}>
                      <td><label className="manual-check">
                        <input type="checkbox" aria-label={item.title + ' 점검 완료'} checked={checked.has(item.id)}
                          disabled={!personId || !isEmployee || !!pending || manual.loading} onChange={() => void toggle(data, item)} />
                        <span aria-hidden>{checked.has(item.id) && <Check size={13} strokeWidth={3} />}</span>
                      </label></td>
                      <td><span className="manual-category">{item.category}</span></td>
                      <td><button className="manual-item" aria-controls="manual-selected" aria-pressed={selected?.id === item.id} onClick={() => selectItem(item.id)}>
                        <span>{item.title}<small className="manual-mobile-basis">{item.basis}</small></span><ChevronRight size={15} aria-hidden />
                      </button></td>
                      <td><Basis basis={item.basis} /></td>
                    </tr>
                  )}</tbody>
                </table>
                {!filtered.length && <p className="manual-empty"><ListChecks size={23} aria-hidden />{filter === '완료' ? '아직 완료한 점검이 없습니다.' : '남은 점검 항목이 없습니다.'}</p>}
                {pending && <p role="status" className="sr-only">점검 결과를 저장하고 있습니다.</p>}
              </section>
              <aside id="manual-selected" ref={detailRef} tabIndex={-1} className="manual-detail" aria-label="선택한 매뉴얼 상세">
                <div className="manual-detail-heading"><FileText size={18} aria-hidden /><h2>매뉴얼 상세</h2>
                  <button type="button" className="manual-back" onClick={() => {
                    listRef.current?.querySelector<HTMLButtonElement>('.manual-item[aria-pressed="true"]')?.focus({ preventScroll: true });
                    listRef.current?.scrollIntoView({ block: 'start' });
                  }}><ArrowLeft size={14} aria-hidden />목록</button>
                </div>
                {selected ? <ManualDetail item={selected} store={store} role={role} /> : <p className="manual-detail-empty">목록의 항목을 선택하면 기준과 근거를 확인할 수 있습니다.</p>}
              </aside>
            </div>
          </>
        );
      }}</AsyncView>
    </div>
  );
}

function ProgressSummary({ completed, total, identified }: { completed: number; total: number; identified: boolean }) {
  const percent = total > 0 ? Math.round(completed / total * 100) : 0;
  return (
    <div className="manual-progress">
      <div className="manual-progress-head"><ListChecks size={18} aria-hidden /><span>오늘의 점검 현황</span></div>
      <div className="manual-progress-values"><strong>{identified ? completed : total}</strong><span>{identified ? `/ ${total}건 완료` : '건 점검 대상'}</span>
        {identified && <span className="manual-remaining">미점검 {total - completed}건</span>}
      </div>
      <div className="manual-progress-line">
        <progress value={identified ? percent : 0} max={100} aria-label="오늘의 근무 점검 완료율" />
        <span>{identified ? percent + '%' : '담당자 미선택'}</span>
      </div>
    </div>
  );
}

function Basis({ basis }: { basis: ManualItem['basis'] }) {
  return <span className={'manual-basis' + (basis === PUBLIC ? ' official' : '')}>{basis}</span>;
}

function ManualDetail({ item, store, role }: { item: ManualItem; store: StoreState; role: AppRole }) {
  const storeId = store.store.id;
  const situation = store.situations?.find(s => s.id === item.situationId);
  const cards = situation ? store.cards.filter(c => c.status === 'approved' && situation.cardIds.includes(c.id)) : [];

  const staffPath = `/store/${storeId}/staff`;
  const askUrl = staffPath + '?' + new URLSearchParams({ ask: `‘${item.title}’ 항목은 우리 매장에서 어떻게 적용하면 될까요?` }) + '#ask';
  return (
    <div className="manual-detail-content">
      <div className="manual-detail-labels"><span>{item.category}</span><Basis basis={item.basis} /></div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      {item.source && <a className="manual-source" href={item.source.url} target="_blank" rel="noreferrer">
        <FileText size={15} aria-hidden /><span>{item.source.label}</span><ExternalLink size={13} aria-hidden />
      </a>}
      <div className="manual-related">
        <h4>관련 현장 자료</h4>
        {situation && <div className="manual-situation">
          <p>{situation.title}</p>
          <span>관련 매장 리뷰 <strong>{situation.storeReviews}건</strong></span>
          {cards.length > 0 && <ul>{cards.map(card => <li key={card.id}>
            <Link to={`/store/${storeId}/wiki#${card.id}`}><BookOpen size={13} aria-hidden />
              <span><small>{card.standardId ? '가상 본사 카드' : card.scope === 'store' ? '승인된 매장 카드' : '승인된 공통 카드'}</small>{card.title}</span><ChevronRight size={13} aria-hidden />
            </Link>
          </li>)}</ul>}
        </div>}
        {role === '직원' ? <Link className="manual-primary" to={askUrl}><MessageSquareText size={16} aria-hidden />항목 적용 문의<ArrowRight size={14} aria-hidden /></Link>
          : <Link className="manual-primary" to={role === '점장' ? `/store/${storeId}/manager#questions` : '/hq/reviews'}><MessageSquareText size={16} aria-hidden />{role === '점장' ? '직원 질문 확인' : '가맹점 리뷰 확인'}<ArrowRight size={14} aria-hidden /></Link>}
        {!cards.length && <Link className="manual-wiki" to={`/store/${storeId}/wiki`}><BookOpen size={15} aria-hidden />매장 사례 카드<ChevronRight size={14} aria-hidden /></Link>}
        {role === '직원' && <Link className="manual-wiki" to={staffPath + '#my-q'}><MessageSquareText size={15} aria-hidden />내 질문 내역<ChevronRight size={14} aria-hidden /></Link>}
      </div>
    </div>
  );
}
