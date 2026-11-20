// 전국 매장 지도(TTA RegionMap의 시군구 경계 SVG, 오프라인). 시군구별 매장 수 · 평균 평점 · 고위험 매장.
// 지도를 누르면 그 시군구로 위험 순위 표를 거른다(URL ?gu=). 빨강은 '고위험' 보기에서 고위험 매장이 있는 시군구에만.
// 키보드·화면 낭독기는 오른쪽 목록과 선택 상자로 같은 일을 한다(지도 path는 시각용).
import { useMemo, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { StoreRow } from '@shared/contracts';
import { GEO_VIEW, MUNICIPALITIES, PROVINCES, type GeoShape } from '@/shared/geo/resolve';
import { Panel } from '@/shared/ui';
import { cx, rating } from '@/shared/lib/format';
import { HIGH_RISK } from '@/shared/theme/semantics';
import type { Metric } from './useOverviewParams';

interface Agg { shape: GeoShape; label: string; stores: StoreRow[]; mean: number | null; high: number }

const HEAT = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)', 'var(--heat-5)'];
const METRICS: { id: Metric; label: string }[] = [
  { id: 'count', label: '매장 수' },
  { id: 'rating', label: '평균 평점' },
  { id: 'high', label: '고위험' },
];

function countStep(n: number) {
  return n >= 9 ? 4 : n >= 5 ? 3 : n >= 3 ? 2 : n >= 2 ? 1 : 0;
}
/** 평점이 낮을수록 진하게(위험 쪽) */
function ratingStep(m: number) {
  return m < 2.5 ? 4 : m < 3 ? 3 : m < 3.5 ? 2 : m < 4 ? 1 : 0;
}

export function StoreMap({ rows, shapes, metric, selected, onMetric, onSelect }: {
  rows: StoreRow[];
  shapes: Map<string, GeoShape>;
  metric: Metric;
  selected: string;
  onMetric: (m: Metric) => void;
  onSelect: (code: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const aggs = useMemo(() => {
    const m = new Map<string, Agg>();
    rows.forEach((r) => {
      const s = shapes.get(r.store.id);
      if (!s) return;
      const a = m.get(s.code) ?? { shape: s, label: `${r.store.region} ${r.store.district}`, stores: [], mean: null, high: 0 };
      a.stores.push(r);
      m.set(s.code, a);
    });
    m.forEach((a) => {
      const rs = a.stores.map((r) => r.store.kakao.rating).filter((v): v is number => v != null);
      a.mean = rs.length ? rs.reduce((x, y) => x + y, 0) / rs.length : null;
      a.high = a.stores.filter((r) => r.score.rank !== null && r.score.risk >= HIGH_RISK).length;
      // 이름이 여러 표기로 들어온 경우(옛 경계로 합친 구) 표기를 묶어 보여 준다
      const names = [...new Set(a.stores.map((r) => r.store.district))];
      if (names.length > 1) a.label = `${a.stores[0].store.region} ${names.join('·')}`;
    });
    return m;
  }, [rows, shapes]);

  const fill = (a: Agg | undefined) => {
    if (!a) return 'var(--surface)';
    if (metric === 'count') return HEAT[countStep(a.stores.length)];
    if (metric === 'rating') return a.mean == null ? 'var(--surface-sunken)' : HEAT[ratingStep(a.mean)];
    return a.high > 0 ? 'var(--brand-red)' : 'var(--heat-1)';
  };

  const focus = aggs.get(hover ?? selected) ?? null;
  const unmatched = rows.length - [...aggs.values()].reduce((s, a) => s + a.stores.length, 0);
  const top = [...aggs.values()].sort((a, b) => (metric === 'high' ? b.high - a.high : 0) || b.stores.length - a.stores.length).slice(0, 8);
  const options = [...aggs.values()].sort((a, b) => a.label.localeCompare(b.label, 'ko'));

  const legend =
    metric === 'count'
      ? ['1곳', '2곳', '3–4곳', '5–8곳', '9곳 이상']
      : metric === 'rating'
        ? ['4.0 이상', '3.5–4.0', '3.0–3.5', '2.5–3.0', '2.5 미만']
        : null;

  return (
    <Panel
      id="map"
      title="전국 매장 지도"
      sub="통계청 2018년 행정구역 기준. 지역 선택 시 매장 현황 및 위험 순위 필터 적용"
      actions={
        <div role="radiogroup" aria-label="지도에 칠할 값" className="flex rounded-ctl border border-line-strong p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={metric === m.id}
              onClick={() => onMetric(m.id)}
              className={cx('h-8 rounded-[4px] px-2.5 text-caption', metric === m.id ? 'bg-ink font-bold text-white' : 'text-text-subtle hover:bg-ink-weak')}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <svg
            viewBox={`0 0 ${GEO_VIEW.w} ${GEO_VIEW.h}`}
            className="mx-auto block h-auto max-h-[560px] w-full"
            role="img"
            aria-label={`시군구별 ${METRICS.find((m) => m.id === metric)?.label} 지도. 매장이 있는 시군구 ${aggs.size}곳`}
            onMouseLeave={() => setHover(null)}
          >
            {MUNICIPALITIES.map((m) => {
              // 합친 경계(수원시 등)는 조각 단위로 같은 집계를 칠한다
              const a = aggs.get(m.code) ?? [...aggs.values()].find((x) => x.shape.code.split('+').includes(m.code));
              const code = a?.shape.code;
              const on = !!code && (code === selected || code === hover);
              return (
                <path
                  key={m.code}
                  d={m.d}
                  fill={fill(a)}
                  stroke={on ? 'var(--ink)' : 'var(--surface)'}
                  strokeWidth={on ? 3 : 0.8}
                  className={a ? 'cursor-pointer' : undefined}
                  onMouseEnter={() => code && setHover(code)}
                  onClick={() => code && onSelect(code === selected ? null : code)}
                >
                  {a && <title>{`${a.label} · 매장 ${a.stores.length}곳 · 평균 ${rating(a.mean)} · 고위험 ${a.high}곳`}</title>}
                </path>
              );
            })}
            {PROVINCES.map((p) => (
              <path key={p.code} d={p.d} fill="none" stroke="var(--line-strong)" strokeWidth={1.2} pointerEvents="none" />
            ))}
            {selected && aggs.get(selected) && (
              <path d={aggs.get(selected)!.shape.d} fill="none" stroke="var(--ink)" strokeWidth={3.5} pointerEvents="none" />
            )}
          </svg>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
            {legend ? (
              legend.map((l, i) => (
                <span key={l} className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-line" style={{ background: HEAT[i] }} aria-hidden />
                  {l}
                </span>
              ))
            ) : (
              <>
                <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red" aria-hidden />고위험 매장 있음</span>
                <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-line" style={{ background: HEAT[0] }} aria-hidden />매장 있음</span>
              </>
            )}
            {metric === 'rating' && <span>· 진한 색은 낮은 카카오 평균 평점</span>}
            {unmatched > 0 && <span>· 행정구역 경계 미확인 {unmatched}곳 제외</span>}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-card border border-line bg-surface-sunken p-3" aria-live="polite">
            {focus ? (
              <>
                <p className="flex items-center gap-1.5 font-bold">
                  <MapPin size={14} aria-hidden />
                  {focus.label}
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div><dt className="text-caption text-text-muted">매장</dt><dd className="num text-section">{focus.stores.length}</dd></div>
                  <div><dt className="text-caption text-text-muted">평균 평점</dt><dd className="num text-section">{rating(focus.mean)}</dd></div>
                  <div><dt className="text-caption text-text-muted">고위험</dt><dd className={cx('num text-section', focus.high > 0 && 'text-red')}>{focus.high}</dd></div>
                </dl>
                {selected && focus.shape.code === selected && (
                  <button type="button" onClick={() => onSelect(null)} className="mt-2 inline-flex h-8 items-center gap-1 rounded-ctl border border-line-strong bg-surface px-2.5 text-caption text-ink hover:bg-ink-weak">
                    <X size={13} aria-hidden />
                    지역 선택 해제
                  </button>
                )}
              </>
            ) : (
              <p className="text-caption text-text-muted">매장 소재 시군구 {aggs.size}곳. 지역 선택 시 세부 지표 표시</p>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-caption text-text-muted">시군구 선택</span>
            <select value={selected} onChange={(e) => onSelect(e.target.value || null)} className="h-10 w-full rounded-ctl border border-line-strong bg-surface px-2 text-body">
              <option value="">전체 시군구</option>
              {options.map((a) => (
                <option key={a.shape.code} value={a.shape.code}>{a.label} ({a.stores.length})</option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-1 text-caption text-text-muted">{metric === 'high' ? '고위험 매장이 있는 시군구' : '매장이 많은 시군구'}</p>
            <ul className="space-y-0.5">
              {top.map((a) => (
                <li key={a.shape.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.shape.code === selected ? null : a.shape.code)}
                    aria-pressed={a.shape.code === selected}
                    className={cx('flex min-h-[36px] w-full items-center justify-between gap-2 rounded-ctl px-2 text-left text-body', a.shape.code === selected ? 'bg-ink text-white' : 'hover:bg-ink-weak')}
                  >
                    <span className="truncate">{a.label}</span>
                    <span className="num shrink-0 text-caption">
                      {a.stores.length}곳{a.high > 0 && <span className={a.shape.code === selected ? '' : 'text-red'}> · 고위험 {a.high}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
