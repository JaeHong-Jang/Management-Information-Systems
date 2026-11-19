import type { ReactNode } from 'react';
import { Cpu, FlaskConical, ListChecks, PenLine, Ruler, Stamp as StampIcon, type LucideIcon } from 'lucide-react';
import type { CauseClass } from '@shared/contracts';
import { CAUSE, RISK, TONE, riskLevel, type Tone } from '../theme/semantics';
import { cx } from '../lib/format';

/** 기본 배지: 1px 테두리 + (아이콘) + 글자 */
export function Tag({ tone = 'neutral', icon: Icon, children, title, className }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; title?: string; className?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-badge border px-1.5 py-px text-caption', TONE[tone], className)}>
      {Icon && <Icon size={12} aria-hidden strokeWidth={2.2} />}
      {children}
    </span>
  );
}

/** 가상 표지: 점선 테두리, 바탕 없음. 닫을 수 없다 */
export function VirtualBadge({ label = '가상' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-badge border border-dashed border-line-strong px-1.5 py-px text-caption text-text-subtle">
      <FlaskConical size={12} aria-hidden />
      {label}
    </span>
  );
}

const VIA_LABEL: Record<string, string> = { claude: 'Claude', ollama: 'Ollama', rules: '규칙', 'rules(LLM 실패 대체)': '규칙(LLM 실패 대체)' };
export const isLlmVia = (via: string | null | undefined) => via === 'claude' || via === 'ollama';

/** 실행 출처(via) 배지. LLM 실패 대체만 주의 색 */
export function ViaBadge({ via }: { via: string | null | undefined }) {
  if (!via) return null;
  const fallback = via.includes('대체') || via.includes('fallback');
  return (
    <Tag tone={fallback ? 'amber' : 'neutral'} icon={isLlmVia(via) ? Cpu : ListChecks}>
      {VIA_LABEL[via] ?? via}
    </Tag>
  );
}

/** 위험 단계 배지: 고위험만 brand-red 바탕 + 흰 글자(4.8:1). 주의는 옅은 노랑 */
export function RiskBadge({ risk }: { risk: number }) {
  const lv = riskLevel(risk);
  const r = RISK[lv];
  const Icon = r.icon;
  if (lv === 'high')
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-badge bg-red px-1.5 py-px text-caption font-bold text-white">
        <Icon size={12} aria-hidden strokeWidth={2.4} />
        {r.label}
      </span>
    );
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-badge border px-1.5 py-px text-caption', lv === 'mid' ? 'border-amber-bar bg-amber-weak text-amber-text' : 'border-line-strong text-text-subtle')}>
      <Icon size={12} aria-hidden />
      {r.label}
    </span>
  );
}

/** 원인 4분류 칩: 늘 아이콘 + 글자 */
export function CauseChip({ cause, size = 'sm' }: { cause: CauseClass; size?: 'sm' | 'md' }) {
  const c = CAUSE[cause];
  const Icon = c.icon;
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-badge font-medium', c.weak, c.text, size === 'md' ? 'px-2 py-0.5 text-body' : 'px-1.5 py-px text-caption')}>
      <Icon size={size === 'md' ? 14 : 12} aria-hidden strokeWidth={2.2} />
      {cause}
    </span>
  );
}

// ---------- 3중 상태 표지 (cotutor DESIGN_CONCEPT) ----------
// AI 초안 = 점선 테두리(지울 수 있는 밑그림), 규칙 판정 = 실선 + 자, 사람 승인 = 노랑 도장.
// 선 모양으로도 갈리므로 색약에서도 구분된다. "에이전트 완료 ≠ 승인".

export function AiDraftBadge({ label = 'AI 초안' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-badge border border-dashed border-ink px-1.5 py-px text-caption text-text" title="LLM이 쓴 초안이에요. 사람이 승인하기 전에는 확정이 아니에요">
      <PenLine size={12} aria-hidden />
      {label}
    </span>
  );
}

export function RuleBadge({ label = '규칙 판정' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-badge border border-ink px-1.5 py-px text-caption text-text" title="공개 규칙 코드가 계산·판정했어요">
      <Ruler size={12} aria-hidden />
      {label}
    </span>
  );
}

export function HumanStamp({ label = '사람 승인' }: { label?: string }) {
  return (
    <span className="stamp inline-flex items-center gap-1 whitespace-nowrap rounded-badge bg-yellow px-1.5 py-px text-caption font-bold text-ink">
      <StampIcon size={12} aria-hidden />
      {label}
    </span>
  );
}

/** 처방·카드·진단에 붙는 표지 묶음: 만든 쪽(AI 초안/규칙 판정) + 사람 승인 여부 */
export function Provenance({ via, approved, approver = '사람', pendingLabel }: { via?: string | null; approved: boolean; approver?: string; pendingLabel?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {isLlmVia(via) ? <AiDraftBadge /> : <RuleBadge />}
      {approved ? (
        <HumanStamp label={`${approver} 승인`} />
      ) : (
        <span className="inline-flex items-center whitespace-nowrap px-1 text-caption text-text-muted">{pendingLabel ?? `${approver} 승인 전`}</span>
      )}
    </span>
  );
}
