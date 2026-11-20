// /hq/stores/:id 매장 상세: 본문 + 오른쪽 360px sticky 결정 패널(1280 이상). 좁은 화면은 결정 패널이 머리글 바로 아래로 온다.
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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
  const { hash, search } = useLocation();
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

  const sections = [
    { id: 'diagnosis', label: '불만 진단' },
    { id: 'indicators', label: '지표·매장 비교' },
    { id: 'actions', label: '처방·후속 조치' },
  ];
  const section = !hash || hash === '#diagnosis' ? 'diagnosis' : hash === '#indicators' ? 'indicators' : 'actions';

  return (
    <AsyncView state={detail}>
      {(d) => (
        <>
          <StoreHeader store={d.store} score={d.score} ranked={ranked} />
          <nav className="hq-register-nav" aria-label="매장 분석 항목">
            {sections.map((s) => <Link key={s.id} to={{ hash: s.id, search }} aria-current={s.id === section ? 'page' : undefined}>{s.label}</Link>)}
          </nav>
          {section === 'diagnosis' && <DiagnosisPanel diagnosis={d.diagnosis} onQuote={(f: Finding, q: Quote) => setQuote({ finding: f, quote: q })} />}
          {section === 'indicators' && <div className="grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <ScoreBreakdown score={d.score} />
              <MonthlyTrend monthly={d.monthly} />
            </div>
            <PeersPanel peers={d.peers} />
          </div>}
          {section === 'actions' && <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="min-w-0 xl:order-last">
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
            <div className="min-w-0 space-y-4">
              <InlineError message={act.error} />
              <PrescriptionList storeId={d.store.id} prescriptions={d.prescriptions} findings={d.diagnosis?.findings ?? []} hasDiagnosis={!!d.diagnosis} busy={act.busy} onAction={prescriptionAction} />
              <DriftList drifts={d.drifts} onChanged={reload} />
              <OutcomePanel outcome={d.outcome} />
            </div>
          </div>}
          <ReviewDrawer storeId={d.store.id} open={quote} prescriptions={d.prescriptions} onClose={() => setQuote(null)} />
        </>
      )}
    </AsyncView>
  );
}
