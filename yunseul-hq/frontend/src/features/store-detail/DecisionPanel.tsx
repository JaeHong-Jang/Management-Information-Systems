// 오른쪽 360px sticky 결정 패널(사회보장 DecisionPanel): 진단 실행 → 처방 만들기 → 보낸 처방 상태 → 4주 가상 결과.
import type { ReactNode } from 'react';
// 실행은 runId를 먼저 받고 SSE로 따라간다. 진행 표시는 실제 이벤트로만 움직인다.
import { ArrowRight, FlaskConical, Pill, Stethoscope } from 'lucide-react';
import type { Outcome, Prescription, StoreDetail } from '@shared/contracts';
import type { RunView } from '@/shared/api/live';
import { Button, InlineError, RunProgress, Tag, VirtualBadge } from '@/shared/ui';
import { cx, dateTime, pct, rating } from '@/shared/lib/format';
import { PRESCRIPTION_STATUS } from '@/shared/theme/semantics';
import { PRESCRIPTION_ORDER } from './PrescriptionList';

interface RunCtl { start: () => void; active: boolean; runId: string | null; run: RunView | null; error: string | null }

function Step({ n, title, children, last }: { n: number; title: string; children: ReactNode; last?: boolean }) {
  return (
    <section className={cx('px-4 py-4', !last && 'border-b border-line')}>
      <h3 className="mb-2 flex items-center gap-2 text-body font-bold">
        <span className="num grid h-6 w-6 place-items-center rounded-full bg-ink text-caption text-white">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DecisionPanel({ d, names, diagnose, prescribe, simulate, simBusy, simError }: {
  d: StoreDetail;
  names: Record<string, string>;
  diagnose: RunCtl;
  prescribe: RunCtl;
  simulate: () => void;
  simBusy: boolean;
  simError: string | null;
}) {
  const counts = (Object.keys(PRESCRIPTION_STATUS) as Prescription['status'][]).map((s) => ({ s, n: d.prescriptions.filter((p) => p.status === s).length }));
  const recent = [...d.prescriptions].sort((a, b) => PRESCRIPTION_ORDER[a.status] - PRESCRIPTION_ORDER[b.status] || b.created.localeCompare(a.created)).slice(0, 4);
  const sentAny = d.prescriptions.some((p) => p.status === 'sent' || p.status === 'done');

  return (
    <aside aria-labelledby="decision-title" className="rounded-card border border-line bg-surface shadow-card xl:sticky xl:top-[72px] xl:max-h-[calc(100vh-88px)] xl:overflow-y-auto">
      <header className="flex items-center justify-between gap-2 rounded-t-card bg-ink px-4 py-3 text-white">
        <h2 id="decision-title" className="font-display text-section">결정 패널</h2>
        <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-white/60">DECISION</span>
      </header>

      <div className="md:grid md:grid-cols-2 xl:block">
      <Step n={1} title="진단 실행">
        <p className="mb-2 text-caption text-text-muted">
          {d.diagnosis ? <>마지막 진단 <span className="num">{dateTime(d.diagnosis.created)}</span> · 진단 결과 {d.diagnosis.findings.length}개</> : '아직 진단이 없어요. 진단팀이 저평점 리뷰의 원인을 나눠요.'}
        </p>
        <Button variant="primary" icon={Stethoscope} busy={diagnose.active} onClick={diagnose.start} className="w-full">
          {d.diagnosis ? '다시 진단' : '진단 실행'}
        </Button>
        {diagnose.runId && <div className="mt-3 rounded-ctl bg-surface-sunken p-2.5"><RunProgress run={diagnose.run} names={names} compact /></div>}
        <InlineError message={diagnose.error} />
      </Step>

      <Step n={2} title="처방 만들기">
        <p className="mb-2 text-caption text-text-muted">처방팀이 원인별 초안을 써요. 보내기 전까지는 초안이에요.</p>
        <Button icon={Pill} busy={prescribe.active} disabled={!d.diagnosis} title={d.diagnosis ? undefined : '진단을 먼저 실행해 주세요'} onClick={prescribe.start} className="w-full">
          처방 만들기
        </Button>
        {prescribe.runId && <div className="mt-3 rounded-ctl bg-surface-sunken p-2.5"><RunProgress run={prescribe.run} names={names} compact /></div>}
        <InlineError message={prescribe.error} />
      </Step>

      <Step n={3} title="보낸 처방 상태">
        <dl className="grid grid-cols-4 gap-1 text-center">
          {counts.map(({ s, n }) => {
            const st = PRESCRIPTION_STATUS[s];
            return (
              <div key={s} className="rounded-ctl bg-surface-sunken py-1.5">
                <dt className="text-caption text-text-muted">{st.label}</dt>
                <dd className={cx('num text-section', s === 'draft' && n > 0 && 'text-amber-text')}>{n}</dd>
              </div>
            );
          })}
        </dl>
        {recent.length > 0 && (
          <ul className="mt-2 space-y-1">
            {recent.map((p) => {
              const st = PRESCRIPTION_STATUS[p.status];
              return (
                <li key={p.id}>
                  <a href={`#${p.id}`} className="flex min-h-[36px] items-center gap-2 rounded-ctl px-1 text-caption hover:bg-ink-weak">
                    <Tag tone={st.tone} icon={st.icon}>{st.label}</Tag>
                    <span className="min-w-0 truncate">{p.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <a href="#prescriptions" className="mt-2 inline-flex items-center gap-1 text-caption text-ink underline-offset-2 hover:underline">
          처방 전체 보기 <ArrowRight size={12} aria-hidden />
        </a>
      </Step>

      <Step n={4} title="4주 뒤 가상 결과" last>
        <OutcomeMini outcome={d.outcome} />
        <Button icon={FlaskConical} busy={simBusy} disabled={!sentAny} title={sentAny ? undefined : '처방을 먼저 보내 주세요'} onClick={simulate} className="mt-2 w-full">
          {d.outcome?.after ? '가상 결과 다시 넣기' : '4주 뒤 가상 결과 보기'}
        </Button>
        <p className="mt-1.5 text-caption text-text-muted">처방 이후 리뷰는 가상 시나리오예요. 실제 효과가 아니에요.</p>
        <InlineError message={simError} />
      </Step>
      </div>
    </aside>
  );
}

function OutcomeMini({ outcome }: { outcome: Outcome | null }) {
  if (!outcome?.after) return <p className="text-caption text-text-muted">아직 처방 후 리뷰가 없어요.</p>;
  return (
    <div className="rounded-ctl border border-dashed border-line-strong p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-caption text-text-muted">평균 별점 · 2점 이하</span>
        <VirtualBadge label="가상 결과" />
      </div>
      <p className="num flex flex-wrap items-center gap-1.5 text-body">
        {rating(outcome.before.mean)} <ArrowRight size={13} aria-hidden /> <b>{rating(outcome.after.mean)}</b>
        <span className="text-text-muted">·</span>
        {pct(outcome.before.lowShare)} <ArrowRight size={13} aria-hidden /> <b>{pct(outcome.after.lowShare)}</b>
      </p>
    </div>
  );
}
