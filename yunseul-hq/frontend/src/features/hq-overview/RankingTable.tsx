// 위험 순위 표(사회보장 Queue): 필터·정렬을 URL에 두고, 머리글 정렬에 aria-sort를 단다.
// 고위험 행은 왼쪽 4px brand-red 바. 위험 막대는 ScoreBar(숫자 + 64×8). md 미만은 카드 목록.
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Star, X } from 'lucide-react';
import type { StoreRow } from '@shared/contracts';
import type { GeoShape } from '@/shared/geo/resolve';
import { Button, CrossChip, Panel, RiskBadge, ScoreBar, Tag, TrendMark } from '@/shared/ui';
import { cx, pct, rating } from '@/shared/lib/format';
import { HIGH_RISK } from '@/shared/theme/semantics';
import { useOverviewParams, type SortKey } from './useOverviewParams';

const sel = 'h-10 rounded-ctl border border-line-strong bg-surface px-2 text-body';
const PAGE = 30;

const isHigh = (r: StoreRow) => r.score.rank !== null && r.score.risk >= HIGH_RISK;

export function RankingTable({ rows, shapes }: { rows: StoreRow[]; shapes: Map<string, GeoShape> }) {
  const nav = useNavigate();
  const p = useOverviewParams();
  const [shown, setShown] = useState(PAGE);
  const [text, setText] = useState(p.q);

  const regions = useMemo(() => [...new Set(rows.map((r) => r.store.region))].sort((a, b) => a.localeCompare(b, 'ko')), [rows]);
  const areas = useMemo(() => [...new Set(rows.map((r) => r.store.area))], [rows]);
  const crosses = useMemo(() => [...new Set(rows.map((r) => r.store.cross))], [rows]);
  const guName = p.gu ? (() => {
    const hit = rows.filter((r) => shapes.get(r.store.id)?.code === p.gu);
    return hit.length ? `${hit[0].store.region} ${[...new Set(hit.map((r) => r.store.district))].join('·')}` : p.gu;
  })() : '';

  const list = useMemo(() => {
    const s = p.q.trim();
    const f = rows.filter(
      (r) =>
        (!s || r.store.name.includes(s) || r.store.district.includes(s)) &&
        (!p.region || r.store.region === p.region) &&
        (!p.area || r.store.area === p.area) &&
        (!p.cross || r.store.cross === p.cross) &&
        (!p.high || isHigh(r)) &&
        (!p.gu || shapes.get(r.store.id)?.code === p.gu),
    );
    const nz = (v: number | null, d: number) => (v == null ? d : v);
    const by: Record<SortKey, (a: StoreRow, b: StoreRow) => number> = {
      // 표본 부족 매장(순위 없음)은 리뷰 몇 건으로 점수가 튀므로 늘 순위 대상 뒤에 둔다
      risk: (a, b) => a.score.risk - b.score.risk,
      name: (a, b) => a.store.name.localeCompare(b.store.name, 'ko'),
      rating: (a, b) => nz(a.store.kakao.rating, 9) - nz(b.store.kakao.rating, 9),
      count: (a, b) => a.store.kakao.count - b.store.kakao.count,
      naver: (a, b) => nz(a.store.naver.pageMean, 9) - nz(b.store.naver.pageMean, 9),
    };
    const sign = p.dir === 'asc' ? 1 : -1;
    return [...f].sort((a, b) => (p.sort === 'risk' ? Number(a.score.rank === null) - Number(b.score.rank === null) : 0) || sign * by[p.sort](a, b));
  }, [rows, shapes, p.q, p.region, p.area, p.cross, p.high, p.gu, p.sort, p.dir]);

  const change = (patch: Record<string, string | null>) => {
    setShown(PAGE);
    p.set(patch);
  };
  const sortBy = (k: SortKey, first: 'asc' | 'desc') => {
    const dir = p.sort === k ? (p.dir === 'asc' ? 'desc' : 'asc') : first;
    change({ sort: k === 'risk' && dir === 'desc' ? null : k, dir: k === 'risk' && dir === 'desc' ? null : dir });
  };
  const ariaSort = (k: SortKey) => (p.sort === k ? (p.dir === 'asc' ? 'ascending' : 'descending') : 'none') as 'ascending' | 'descending' | 'none';
  const anyFilter = !!(p.q || p.region || p.area || p.cross || p.high || p.gu);

  const Th = ({ k, first, children, right }: { k: SortKey; first: 'asc' | 'desc'; children: ReactNode; right?: boolean }) => {
    const Icon = p.sort === k ? (p.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th scope="col" aria-sort={ariaSort(k)} className={cx('whitespace-nowrap px-3 py-2 font-medium', right && 'text-right')}>
        <button type="button" onClick={() => sortBy(k, first)} className={cx('inline-flex min-h-[32px] items-center gap-1 rounded-ctl hover:text-ink', p.sort === k && 'font-bold text-ink')}>
          {children}
          <Icon size={13} aria-hidden />
        </button>
      </th>
    );
  };

  return (
    <Panel
      id="ranking"
      title="매장 위험 순위"
      sub={`조회 결과 ${list.length.toLocaleString()}곳 · 카카오 별점 10건 이상 매장 순위 · 위험 점수는 R1~R5 배점의 합계`}
      bodyClass="p-0"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <form
          className="relative"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            change({ q: text.trim() || null });
          }}
        >
          <label>
            <span className="sr-only">매장·시군구 검색</span>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text.trim() !== p.q && change({ q: text.trim() || null })} placeholder="매장·시군구 검색" className={cx(sel, 'w-44 pl-8')} />
          </label>
        </form>
        <select aria-label="지역" className={sel} value={p.region} onChange={(e) => change({ region: e.target.value || null })}>
          <option value="">전체 지역</option>
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select aria-label="상권" className={sel} value={p.area} onChange={(e) => change({ area: e.target.value || null })}>
          <option value="">전체 상권</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select aria-label="교차 판정" className={cx(sel, 'max-w-[200px]')} value={p.cross} onChange={(e) => change({ cross: e.target.value || null })}>
          <option value="">전체 교차 판정</option>
          {crosses.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="inline-flex min-h-[40px] items-center gap-1.5 text-body">
          <input type="checkbox" className="h-4 w-4 accent-[var(--ink)]" checked={p.high} onChange={(e) => change({ high: e.target.checked ? '1' : null })} />
          고위험만
        </label>
        {p.gu && (
          <button type="button" onClick={() => change({ gu: null })} className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-caption text-white" aria-label={`시군구 ${guName} 선택 풀기`}>
            {guName}
            <X size={13} aria-hidden />
          </button>
        )}
        {anyFilter && (
          <button type="button" className="text-caption text-ink underline-offset-2 hover:underline" onClick={() => { setText(''); change({ q: null, region: null, area: null, cross: null, high: null, gu: null }); }}>
            필터 초기화
          </button>
        )}
        {/* 카드 목록(md 미만)에서는 머리글이 없으므로 정렬을 상자로 고른다 */}
        <select aria-label="정렬" className={cx(sel, 'ml-auto md:hidden')} value={`${p.sort}-${p.dir}`} onChange={(e) => { const [k, d] = e.target.value.split('-'); change({ sort: k, dir: d }); }}>
          <option value="risk-desc">위험 높은 순</option>
          <option value="rating-asc">카카오 평점 낮은 순</option>
          <option value="count-desc">카카오 리뷰 많은 순</option>
          <option value="naver-asc">네이버 평균 낮은 순</option>
          <option value="name-asc">매장 이름 순</option>
        </select>
      </div>

      {/* md 이상: 표 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-body">
          <caption className="sr-only">매장별 위험 순위. 열 제목 선택 시 정렬</caption>
          <thead className="bg-surface-sunken text-left text-caption text-text-muted">
            <tr>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium">순위</th>
              <Th k="name" first="asc">매장 · 지역</Th>
              <Th k="rating" first="asc" right>카카오</Th>
              <Th k="naver" first="asc" right>네이버</Th>
              <th scope="col" className="px-3 py-2 font-medium">교차 판정</th>
              <Th k="risk" first="desc">위험</Th>
              <th scope="col" className="w-[22%] px-3 py-2 font-medium">주요 불만(저평점)</th>
              <th scope="col" className="px-3 py-2 font-medium">추세</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, shown).map((r) => {
              const { store: s, score } = r;
              const high = isHigh(r);
              return (
                <tr
                  key={s.id}
                  onClick={() => nav(`/hq/stores/${s.id}`)}
                  className={cx('cursor-pointer border-t border-line transition-colors hover:bg-ink-weak focus:bg-ink-weak', s.isTarget && 'bg-yellow-weak')}
                >
                  <td className={cx('num px-3 py-2 text-right text-text-subtle', high && 'shadow-[inset_4px_0_0_var(--brand-red)]')}>{score.rank ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/hq/stores/${s.id}`} onClick={(e) => e.stopPropagation()} className="whitespace-nowrap font-bold text-ink hover:underline">{s.name}</Link>
                      {s.isTarget && <Tag tone="ink">시연 매장</Tag>}
                      {s.excluded && <Tag title={s.excluded}>분석 제외</Tag>}
                      {!s.excluded && score.rank == null && <Tag>표본 부족</Tag>}
                    </div>
                    <p className="whitespace-nowrap text-caption text-text-muted">{s.region} {s.district} · {s.area}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <span className="num inline-flex items-center gap-1">
                      <Star size={12} className="text-text-muted" aria-hidden />
                      {rating(s.kakao.rating)}
                    </span>
                    <span className="num ml-1 text-caption text-text-muted">({s.kakao.count.toLocaleString()})</span>
                    <div className="text-caption text-text-muted">2점 이하 <span className="num">{pct(s.kakao.lowShare)}</span></div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right" title="네이버 첫 페이지 리뷰(최대 10건) 별점 평균">
                    {s.naver.matched ? (
                      <>
                        <span className="num">{rating(s.naver.pageMean)}</span> <span className="text-caption text-text-muted">(<span className="num">{s.naver.pageN}</span>건)</span>
                      </>
                    ) : (
                      <span className="text-caption text-text-muted">미매칭</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><CrossChip cross={s.cross} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ScoreBar risk={score.risk} muted={score.rank === null} />
                      {high && <RiskBadge risk={score.risk} />}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {score.topComplaints.length === 0 && <span className="text-caption text-text-muted">—</span>}
                      {score.topComplaints.map((c) => (
                        <Tag key={c.type}>
                          {c.type} <span className="num">{c.count}</span>
                        </Tag>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2"><TrendMark trend={score.trend} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* md 미만: 카드 목록 */}
      <ul className="divide-y divide-line md:hidden">
        {list.slice(0, shown).map((r) => {
          const { store: s, score } = r;
          const high = isHigh(r);
          return (
            <li key={s.id} className={cx(high && 'shadow-[inset_4px_0_0_var(--brand-red)]')}>
              <Link to={`/hq/stores/${s.id}`} className="block px-4 py-3 hover:bg-ink-weak">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="num text-caption text-text-muted">{score.rank != null ? `${score.rank}위` : '—'}</span>
                      <b className="text-ink">{s.name}</b>
                      {s.isTarget && <Tag tone="ink">시연 매장</Tag>}
                      {high && <RiskBadge risk={score.risk} />}
                    </p>
                    <p className="text-caption text-text-muted">{s.region} {s.district} · {s.area}</p>
                  </div>
                  <ScoreBar risk={score.risk} muted={score.rank === null} />
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-subtle">
                  <span>카카오 <span className="num">{rating(s.kakao.rating)}</span> (<span className="num">{s.kakao.count}</span>)</span>
                  <span>네이버 {s.naver.matched ? <span className="num">{rating(s.naver.pageMean)}</span> : '미매칭'}</span>
                  <TrendMark trend={score.trend} />
                </p>
                {score.topComplaints.length > 0 && <p className="mt-1 text-caption text-text-muted">{score.topComplaints.map((c) => `${c.type} ${c.count}`).join(' · ')}</p>}
              </Link>
            </li>
          );
        })}
      </ul>

      {list.length === 0 && <p className="px-4 py-6 text-body text-text-muted">조회 조건에 해당하는 매장 없음</p>}
      {list.length > shown && (
        <div className="border-t border-line px-4 py-3">
          <Button size="sm" onClick={() => setShown((n) => n + PAGE)}>
            {Math.min(PAGE, list.length - shown)}곳 더 보기 ({shown}/{list.length})
          </Button>
        </div>
      )}
    </Panel>
  );
}
