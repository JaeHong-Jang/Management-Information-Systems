// 오른쪽 360px sticky 업무 처리(사회보장 DecisionPanel): 진단 실행 → 처방 초안 작성 → 처방 처리 현황 → 4주 가상 결과.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
        <h2 id="decision-title" className="font-display text-section">업무 처리</h2>
      </header>

      <div className="md:grid md:grid-cols-2 xl:block">
      <Step n={1} title="진단 실행">
        <p className="mb-2 text-caption text-text-muted">
          {d.diagnosis ? <>마지막 진단 <span className="num">{dateTime(d.diagnosis.created)}</span> · 진단 결과 {d.diagnosis.findings.length}개</> : '진단 미실행 · 저평점 리뷰 대상'}
        </p>
        <Button variant="primary" icon={Stethoscope} busy={diagnose.active} onClick={diagnose.start} className="w-full">
          {d.diagnosis ? '진단 재실행' : '진단 실행'}
        </Button>
        {diagnose.runId && <div className="mt-3 rounded-ctl bg-surface-sunken p-2.5"><RunProgress run={diagnose.run} names={names} compact /></div>}
        <InlineError message={diagnose.error} />
      </Step>

      <Step n={2} title="처방 초안 작성">
        <p className="mb-2 text-caption text-text-muted">원인 진단 결과를 기반으로 작성. 본사 SV 검토 후 발송</p>
        <Button icon={Pill} busy={prescribe.active} disabled={!d.diagnosis} title={d.diagnosis ? undefined : '원인 진단 후 작성 가능'} onClick={prescribe.start} className="w-full">
          처방 초안 작성
        </Button>
        {prescribe.runId && <div className="mt-3 rounded-ctl bg-surface-sunken p-2.5"><RunProgress run={prescribe.run} names={names} compact /></div>}
        <InlineError message={prescribe.error} />
      </Step>

      <Step n={3} title="처방 처리 현황">
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
                  <Link to={`#${p.id}`} className="flex min-h-[36px] items-center gap-2 rounded-ctl px-1 text-caption hover:bg-ink-weak">
                    <Tag tone={st.tone} icon={st.icon}>{st.label}</Tag>
                    <span className="min-w-0 truncate">{p.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link to="#prescriptions" className="mt-2 inline-flex items-center gap-1 text-caption text-ink underline-offset-2 hover:underline">
          처방 전체 보기 <ArrowRight size={12} aria-hidden />
        </Link>
      </Step>

      <Step n={4} title="4주 시뮬레이션" last>
        <OutcomeMini outcome={d.outcome} />
        <Button icon={FlaskConical} busy={simBusy} disabled={!sentAny} title={sentAny ? undefined : '처방 발송 후 실행 가능'} onClick={simulate} className="mt-2 w-full">
          {d.outcome?.after ? '가상 결과 재산출' : '4주 시뮬레이션 보기'}
        </Button>
        <p className="mt-1.5 text-caption text-text-muted">처방 후 지표는 가상 리뷰 기준</p>
        <InlineError message={simError} />
      </Step>
      </div>
    </aside>
  );
}

function OutcomeMini({ outcome }: { outcome: Outcome | null }) {
  if (!outcome?.after) return <p className="text-caption text-text-muted">처방 후 리뷰 미등록</p>;
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
