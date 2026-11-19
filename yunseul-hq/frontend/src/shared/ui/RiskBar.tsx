import { RISK, riskLevel } from '../theme/semantics';
import { cx } from '../lib/format';

/** 위험 점수 막대(0~100). 색은 단계, 숫자는 늘 함께 */
// muted: 표본 부족 매장처럼 순위 밖이면 위험 색(노랑·빨강)을 쓰지 않는다
export function RiskBar({ risk, width = 'w-24', showNumber = true, muted = false }: { risk: number; width?: string; showNumber?: boolean; muted?: boolean }) {
  const lv = muted ? riskLevel(0) : riskLevel(risk);
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx('relative h-2 overflow-hidden rounded-full bg-surface-sunken', width)} role="img" aria-label={`위험 ${Math.round(risk)}점, ${RISK[lv].label}`}>
        <span className={cx('absolute inset-y-0 left-0 rounded-full', RISK[lv].bar)} style={{ width: `${Math.max(2, Math.min(100, risk))}%` }} />
      </span>
      {showNumber && <span className={cx('num w-7 text-right font-bold', RISK[lv].text)}>{Math.round(risk)}</span>}
    </span>
  );
}

/** 사회보장 ScoreBar 형식: 숫자 먼저 + 64×8 막대. 표 셀용 */
export function ScoreBar({ risk, muted = false }: { risk: number; muted?: boolean }) {
  const lv = muted ? riskLevel(0) : riskLevel(risk);
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`위험 ${Math.round(risk)}점, ${muted ? '순위 밖' : RISK[lv].label}`}>
      <b className={cx('num w-7 text-right', muted ? 'text-text-muted' : RISK[lv].text)}>{Math.round(risk)}</b>
      <span className="relative h-2 w-16 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
        <span className={cx('absolute inset-y-0 left-0 rounded-full', RISK[lv].bar)} style={{ width: `${Math.max(2, Math.min(100, risk))}%` }} />
      </span>
    </span>
  );
}

/** 비중 막대(0~1), 비교선(브랜드 평균) 선택 */
export function ShareBar({ value, compare, color = 'bg-ink', width = 'w-full' }: { value: number; compare?: number | null; color?: string; width?: string }) {
  return (
    <span className={cx('relative block h-2 rounded-full bg-surface-sunken', width)}>
      <span className={cx('absolute inset-y-0 left-0 rounded-full', color)} style={{ width: `${Math.min(100, value * 100)}%` }} />
      {compare != null && (
        <span className="absolute -top-1 h-4 w-0.5 bg-text" style={{ left: `calc(${Math.min(100, compare * 100)}% - 1px)` }} title={`브랜드 평균 ${(compare * 100).toFixed(0)}%`} />
      )}
    </span>
  );
}
