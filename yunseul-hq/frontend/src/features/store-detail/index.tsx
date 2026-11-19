// /hq/stores/:id 매장 상세: 본문 + 오른쪽 360px sticky 결정 패널(1280 이상). 좁은 화면은 결정 패널이 머리글 바로 아래로 온다.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Finding, Prescription, Quote } from '@shared/contracts';
import { api, type PrescriptionAction } from '@/shared/api/client';
import { useAgentNames } from '@/shared/api/harness';
import { useRunAction } from '@/shared/api/useRunAction';
import { useAction, useAsync } from '@/shared/lib/useAsync';
import { AsyncView, InlineError } from '@/shared/ui';
import { useApp } from '@/app/AppData';
import { DecisionPanel } from './DecisionPanel';
import { DiagnosisPanel } from './DiagnosisPanel';
import { DriftList } from './DriftList';
import { MonthlyTrend } from './MonthlyTrend';
import { OutcomePanel } from './OutcomePanel';
import { PeersPanel } from './PeersPanel';
import { PrescriptionList } from './PrescriptionList';
import { ReviewDrawer, type OpenQuote } from './ReviewDrawer';
import { ScoreBreakdown } from './ScoreBreakdown';
import { StoreHeader } from './StoreHeader';

export function StoreDetailPage() {
  const { id = '' } = useParams();
  const detail = useAsync(() => api.store(id), [id]);
  const { overview } = useApp();
  const names = useAgentNames();
  const ranked = overview.data?.kpis.rankedStores ?? null;
  const reload = () => {
    void detail.reload();
    void overview.reload();
  };
  const dx = useRunAction(reload);
  const rx = useRunAction(reload);
  const act = useAction();
  const sim = useAction();
  const [quote, setQuote] = useState<OpenQuote | null>(null);

  const prescriptionAction = async (p: Prescription, a: PrescriptionAction) => {
    if (await act.run(`${p.id}:${a}`, () => api.prescription(p.id, a))) reload();
  };
  const simulate = async () => {
    const o = await sim.run('sim', () => api.simulate(id));
    if (o) detail.setData((p) => (p ? { ...p, outcome: o } : p));
  };

  return (
    <AsyncView state={detail}>
      {(d) => (
        <>
          <StoreHeader store={d.store} score={d.score} ranked={ranked} />
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="order-first xl:order-last">
              <DecisionPanel
                d={d}
                names={names}
                diagnose={{ ...dx, start: () => dx.start(() => api.diagnose(d.store.id)) }}
                prescribe={{ ...rx, start: () => rx.start(() => api.prescribe(d.store.id)) }}
                simulate={simulate}
                simBusy={sim.busy === 'sim'}
                simError={sim.error}
              />
            </div>
            <div className="min-w-0 space-y-5">
              <div className="grid gap-5 2xl:grid-cols-2">
                <ScoreBreakdown score={d.score} />
                <MonthlyTrend monthly={d.monthly} />
              </div>
              <DiagnosisPanel diagnosis={d.diagnosis} onQuote={(f: Finding, q: Quote) => setQuote({ finding: f, quote: q })} />
              <InlineError message={act.error} />
              <PrescriptionList storeId={d.store.id} prescriptions={d.prescriptions} findings={d.diagnosis?.findings ?? []} hasDiagnosis={!!d.diagnosis} busy={act.busy} onAction={prescriptionAction} />
              <div className="grid gap-5 2xl:grid-cols-2">
                <DriftList drifts={d.drifts} onChanged={reload} />
                <OutcomePanel outcome={d.outcome} />
              </div>
              <PeersPanel peers={d.peers} />
            </div>
          </div>
          <ReviewDrawer storeId={d.store.id} open={quote} prescriptions={d.prescriptions} onClose={() => setQuote(null)} />
        </>
      )}
    </AsyncView>
  );
}
