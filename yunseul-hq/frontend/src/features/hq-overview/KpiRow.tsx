// KPI 6개(masdae KpiCards). 숫자는 규칙 코드 값 그대로. 고위험 숫자만 brand-red
import { ClipboardCheck, GitPullRequestArrow, ListOrdered, Scale, ScrollText, Siren } from 'lucide-react';
import type { HqOverview } from '@shared/contracts';


type K = HqOverview['kpis'];

const TILES: { key: keyof K; label: string; unit: string; note: string; icon: typeof Siren }[] = [
  { key: 'rankedStores', label: '순위 대상 매장', unit: '곳', note: '카카오 별점 10건 이상', icon: ListOrdered },
  { key: 'highRisk', label: '고위험 매장', unit: '곳', note: '위험 점수 60 이상', icon: Siren },
  { key: 'bothLow', label: '양 플랫폼 저평점', unit: '곳', note: '카카오·네이버 교차 판정', icon: Scale },
  { key: 'openDrifts', label: '미처리 표준 차이', unit: '건', note: '매장 운영과 기준 차이', icon: ScrollText },
  { key: 'openPrescriptions', label: '진행 중 처방', unit: '건', note: '초안·보냄 상태', icon: ClipboardCheck },
  { key: 'pendingProposals', label: '표준 개정 대기', unit: '건', note: '본사 승인 대상', icon: GitPullRequestArrow },
];

export function KpiRow({ kpis, loading }: { kpis: K | null; loading?: boolean }) {
  return (
    <dl className="hq-metrics" aria-label="전국 운영 지표" aria-busy={loading || undefined}>
      {TILES.map(({ key, label, unit, note, icon: Icon }) => (
        <div key={key}>
          <dt><Icon size={14} aria-hidden />{label}</dt>
          <dd><strong className={key === 'highRisk' && kpis?.highRisk ? 'text-red' : undefined}>{kpis ? kpis[key].toLocaleString('ko-KR') : '—'}</strong><span>{unit}</span></dd>
          <dd className="hq-metric-note">{note}</dd>
        </div>
      ))}
    </dl>
  );
}
