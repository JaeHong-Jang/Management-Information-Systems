// 상단바(세 역할 공통, brand-ink 바탕 + 흰 글씨): 워드마크 · 역할 전환 · 매장 표시 · AI 모드 · 가상 표지 · 실시간 연결 · 심사 모드
import { useNavigate } from 'react-router-dom';
import { Cpu, FlaskConical, ListChecks, MapPin, Presentation, Radio, WifiOff } from 'lucide-react';
import { useLive } from '@/shared/api/live';
import { usePresent } from '@/shared/lib/present';
import { cx } from '@/shared/lib/format';
import { useApp, type AppRole } from './AppData';
import { useStoreId } from './useStoreId';

const ROLES: { id: AppRole; label: string }[] = [
  { id: '직원', label: '직원' },
  { id: '점장', label: '점장' },
  { id: 'SV', label: '본사 SV' },
];

const AI_LABEL = { claude: 'Claude', ollama: 'Ollama', rules: '규칙' } as const;
const chip = 'inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-badge px-2 text-caption';

/** 로고 자리: 글자 워드마크 「역전할머니맥주 × 윤슬」. 빨강은 워드마크와 고위험에만 */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-[0.9375rem] leading-none tracking-tight">
      <span className="rounded-[3px] bg-red px-1.5 py-1 text-white">역전할머니맥주</span>
      <span className="text-white/60" aria-hidden>×</span>
      <span className="sr-only">와</span>
      <span className="text-white">윤슬</span>
    </span>
  );
}

export function TopBar() {
  const { role, setRole, targetId, ai, overview } = useApp();
  const { connected } = useLive();
  const { present, toggle } = usePresent();
  const storeId = useStoreId();
  const nav = useNavigate();
  const isStaff = role === '직원'; // 직원 화면: AI 모드·실시간·심사 모드 칩은 숨긴다
  const storeName = overview.data?.stores.find((r) => r.store.id === (role === 'SV' ? null : storeId))?.store.name;
  const where = role === 'SV' ? `전국 ${overview.data ? `${overview.data.brand.storeCount.toLocaleString()}곳` : ''}` : storeName ?? '강남 윤슬점';

  const go = (r: AppRole) => {
    setRole(r);
    if (r === 'SV') nav('/hq');
    else if (targetId) nav(`/store/${targetId}/${r === '점장' ? 'manager' : 'staff'}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-ink text-white">
      <div className="flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-2 px-[var(--gutter)] py-2 lg:flex-nowrap">
        <a href="/hq" onClick={(e) => { e.preventDefault(); go('SV'); }} className="on-ink shrink-0 rounded-ctl" aria-label="역전할머니맥주 × 윤슬, 전국 현황으로">
          <Wordmark />
        </a>

        <div role="radiogroup" aria-label="역할 전환" className="flex shrink-0 rounded-ctl bg-white/10 p-0.5">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={role === r.id}
              disabled={r.id !== 'SV' && !targetId}
              onClick={() => go(r.id)}
              className={cx('on-ink h-10 rounded-[5px] px-3 text-caption font-bold disabled:opacity-40 lg:h-8', role === r.id ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white')}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:ml-auto lg:flex-nowrap">
          <span className={cx(chip, 'text-white/90')} title={role === 'SV' ? '본사는 전 매장을 봐요' : '지금 보는 매장'}>
            <MapPin size={13} aria-hidden />
            {where}
          </span>
          <span className={cx(chip, 'border border-dashed border-white/50 text-white/90')} title="본사 표준과 처방 이후 리뷰는 가상이에요">
            <FlaskConical size={13} aria-hidden />
            {isStaff ? (
              '가상 포함'
            ) : (
              <>
                <span className="hidden xl:inline">가상 표준·가상 시나리오 포함</span>
                <span className="xl:hidden">가상 포함</span>
              </>
            )}
          </span>
          {ai && !isStaff && (
            <span
              className={cx(chip, ai.lastError ? 'bg-yellow text-ink' : 'bg-white/10 text-white/90')}
              title={ai.lastError ? `최근 LLM 오류: ${ai.lastError}` : ai.model ?? '규칙 모드: 숫자와 분류를 규칙 코드로 내요'}
            >
              {ai.mode === 'rules' ? <ListChecks size={13} aria-hidden /> : <Cpu size={13} aria-hidden />}
              AI {AI_LABEL[ai.mode]}
              {ai.model && <span className="dev hidden font-mono text-white/60 xl:inline">· {ai.model}</span>}
            </span>
          )}
          {!isStaff && (
            <span className={cx(chip, connected ? 'text-white' : 'text-yellow-hl')} role="status">
              {connected ? <Radio size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}
              <span className="max-sm:sr-only">{connected ? '실시간 연결됨' : '실시간 끊김'}</span>
            </span>
          )}
          {!isStaff && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={present}
            title="심사 모드: 글자를 키우고 runId·ms 같은 개발 정보를 숨겨요 (?present=1)"
            className={cx('on-ink', chip, 'h-9 border', present ? 'border-yellow bg-yellow text-ink' : 'border-white/30 text-white/90 hover:bg-white/10')}
          >
            <Presentation size={13} aria-hidden />
            <span className="max-sm:sr-only">심사 모드</span>
          </button>
          )}
        </div>
      </div>
    </header>
  );
}
