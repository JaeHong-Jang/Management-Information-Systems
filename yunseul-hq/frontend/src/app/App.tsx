// 라우트 (docs/PLAN.md §2). 모든 화면이 셸 하나(AppShell) 안에서 열린다.
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { PresentProvider } from '@/shared/lib/present';
import { AppDataProvider, useApp } from './AppData';
import { AppShell } from './AppShell';
import { HqOverviewPage } from '@/features/hq-overview';
import { StoreDetailPage } from '@/features/store-detail';
import { ReviewsPage } from '@/features/reviews';
import { StandardsPage } from '@/features/standards';
import { AgentsPage } from '@/features/agents';
import { ManagerPage } from '@/features/manager';
import { StaffPage } from '@/features/staff';
import { WikiPage } from '@/features/wiki';
import { GraphPage } from '@/features/graph';
import { Empty, ErrorState, Loading } from '@/shared/ui';

export function App() {
  return (
    <PresentProvider>
      <AppDataProvider>
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route element={<AppShell />}>
            <Route path="/hq" element={<HqOverviewPage />} />
            <Route path="/hq/stores/:id" element={<StoreDetailPage />} />
            <Route path="/hq/reviews" element={<ReviewsPage />} />
            <Route path="/hq/standards" element={<StandardsPage />} />
            <Route path="/hq/agents" element={<AgentsPage />} />
            <Route path="/store/:id/manager" element={<ManagerPage />} />
            <Route path="/store/:id/staff" element={<StaffPage />} />
            <Route path="/store/:id/wiki" element={<WikiPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/store/:id" element={<StoreHome />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppDataProvider>
    </PresentProvider>
  );
}

/** 첫 진입: 역할에 맞는 첫 화면으로. 타깃 매장 id가 오기 전에는 로딩을 보여 준다 */
function RoleHome() {
  const { role, targetId, overview } = useApp();
  if (role === 'SV') return <Navigate to="/hq" replace />;
  if (targetId) return <Navigate to={`/store/${targetId}/${role === '점장' ? 'manager' : 'staff'}`} replace />;
  return (
    <div className="p-[var(--gutter)]">
      {overview.error ? <ErrorState message={overview.error} onRetry={overview.reload} /> : <Loading label="매장을 불러오는 중이에요" />}
    </div>
  );
}

function StoreHome() {
  const { role } = useApp();
  return <Navigate to={role === '직원' ? 'staff' : 'manager'} replace />;
}

function NotFound() {
  return (
    <Empty title="없는 화면이에요">
      <Link className="text-ink underline" to="/hq">전국 현황으로 가기</Link>
    </Empty>
  );
}
