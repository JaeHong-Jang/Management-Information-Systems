// 맨 위 한 줄 경보 띠(금융 UrgentCallout + FallGuard 관제실 '확인 / 모두 확인').
// 새로 고위험이 된 매장 / 열린 표준 차이 / 승인 대기 개정 제안. '확인'은 본 것 표시로 이 브라우저에만 남는다.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCheck, GitPullRequestArrow, ScrollText, Siren } from 'lucide-react';
import type { HqOverview } from '@shared/contracts';
import { cx } from '@/shared/lib/format';
import { HIGH_RISK } from '@/shared/theme/semantics';

const KEY = 'yunseul-hq.alert-ack';
interface Ack { high: string[]; drifts: number; proposals: number }

function readAck(): Ack {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Ack | null;
    if (v && Array.isArray(v.high)) return v;
  } catch {
    /* 저장소를 못 쓰면 모두 새것으로 본다 */
  }
  return { high: [], drifts: 0, proposals: 0 };
}
function writeAck(a: Ack) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* 무시 */
  }
}

export function AlertStrip({ o }: { o: HqOverview }) {
  const [ack, setAck] = useState<Ack>(readAck);
  const high = o.stores.filter((r) => r.score.rank !== null && r.score.risk >= HIGH_RISK);
  const newHigh = high.filter((r) => !ack.high.includes(r.store.id));
  const drifts = o.kpis.openDrifts;
  const proposals = o.kpis.pendingProposals;

  const update = (patch: Partial<Ack>) => {
    const next = { ...ack, ...patch };
    setAck(next);
    writeAck(next);
  };

  const items = [
    newHigh.length > 0 && {
      key: 'high',
      icon: Siren,
      danger: true,
      text: (
        <>
          새로 고위험이 된 매장 <b className="num text-red">{newHigh.length}</b>곳 · {newHigh.slice(0, 2).map((r) => r.store.name).join(', ')}
          {newHigh.length > 2 && ' 외'}
        </>
      ),
      to: newHigh.length === 1 ? `/hq/stores/${newHigh[0].store.id}` : '/hq?high=1#ranking',
      go: newHigh.length === 1 ? '매장 보기' : '고위험만 보기',
      onAck: () => update({ high: high.map((r) => r.store.id) }),
    },
    drifts > 0 && drifts !== ack.drifts && {
      key: 'drifts',
      icon: ScrollText,
      danger: false,
      text: (
        <>
          열린 표준 차이 <b className="num">{drifts}</b>건
        </>
      ),
      to: '/hq/standards#drifts',
      go: '표준 차이 보기',
      onAck: () => update({ drifts }),
    },
    proposals > 0 && proposals !== ack.proposals && {
      key: 'proposals',
      icon: GitPullRequestArrow,
      danger: false,
      text: (
        <>
          승인 대기 개정 제안 <b className="num">{proposals}</b>건
        </>
      ),
      to: '/hq/standards',
      go: '제안 보기',
      onAck: () => update({ proposals }),
    },
  ].filter(Boolean) as { key: string; icon: typeof Siren; danger: boolean; text: ReactNode; to: string; go: string; onAck: () => void }[];

  if (items.length === 0)
    return (
      <p className="mb-5 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-4 py-2.5 text-caption text-text-muted" role="status">
        <CheckCheck size={15} className="text-done" aria-hidden />
        새로 확인할 것이 없어요 · 고위험 <span className="num">{high.length}</span>곳 · 열린 표준 차이 <span className="num">{drifts}</span>건 · 승인 대기 제안 <span className="num">{proposals}</span>건
      </p>
    );

  return (
    <aside aria-label="확인할 것" className="mb-5 overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ink px-4 py-2 text-white">
        <span className="font-display text-body">확인할 것 <span className="ml-1 font-mono text-[0.6875rem] tracking-[0.14em] text-white/60">ALERTS</span></span>
        <button type="button" onClick={() => items.forEach((i) => i.onAck())} className="on-ink inline-flex h-8 items-center gap-1 rounded-ctl border border-white/40 px-2.5 text-caption hover:bg-white/10">
          <CheckCheck size={13} aria-hidden />
          모두 확인
        </button>
      </div>
      <ul className="divide-y divide-line">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <Icon size={16} aria-hidden className={cx('shrink-0', it.danger ? 'text-red' : 'text-amber-text')} />
              <span className="min-w-0 flex-1 text-body">{it.text}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Link to={it.to} className="inline-flex h-9 items-center gap-1 rounded-ctl bg-ink px-3 text-caption font-bold text-white hover:bg-ink-hover">
                  {it.go}
                  <ArrowRight size={13} aria-hidden />
                </Link>
                <button type="button" onClick={it.onAck} className="inline-flex h-9 items-center gap-1 rounded-ctl border border-line-strong px-3 text-caption text-ink hover:bg-ink-weak" aria-label={`${it.go} 항목 확인`}>
                  <Check size={13} aria-hidden />
                  확인
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
