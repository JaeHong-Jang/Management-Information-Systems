// KPI 6개(masdae KpiCards). 숫자는 규칙 코드 값 그대로. 고위험 숫자만 brand-red
import { ClipboardCheck, GitPullRequestArrow, ListOrdered, Scale, ScrollText, Siren } from 'lucide-react';
import type { HqOverview } from '@shared/contracts';
import { KpiTile } from '@/shared/ui';

type K = HqOverview['kpis'];

const TILES: { key: keyof K; label: string; unit: string; note: string; icon: typeof Siren }[] = [
  { key: 'rankedStores', label: '순위 대상 매장', unit: '곳', note: '카카오 별점 10개 이상, 분석 제외 아님', icon: ListOrdered },
  { key: 'highRisk', label: '고위험 매장', unit: '곳', note: '위험 점수 60 이상', icon: Siren },
  { key: 'bothLow', label: '양쪽 모두 낮음', unit: '곳', note: '카카오·네이버 교차 판정', icon: Scale },
  { key: 'openDrifts', label: '열린 표준 차이', unit: '건', note: '본사 표준과 다른 운영, 미처리', icon: ScrollText },
  { key: 'openPrescriptions', label: '진행 중 처방', unit: '건', note: '초안·보냄 상태', icon: ClipboardCheck },
  { key: 'pendingProposals', label: '승인 대기 개정 제안', unit: '건', note: '본사 표준 개정', icon: GitPullRequestArrow },
];

export function KpiRow({ kpis, loading }: { kpis: K | null; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {TILES.map((t) => (
        <KpiTile key={t.key} icon={t.icon} label={t.label} unit={t.unit} note={t.note} loading={loading} value={kpis ? kpis[t.key] : null} danger={t.key === 'highRisk'} />
      ))}
    </div>
  );
}
