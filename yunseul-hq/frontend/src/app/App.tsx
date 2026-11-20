// 라우트 (docs/PLAN.md §2). 모든 화면이 셸 하나(AppShell) 안에서 열린다.
import { lazy } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { PresentProvider } from '@/shared/lib/present';
import { AppDataProvider, useApp } from './AppData';
import { AppShell } from './AppShell';
import { Empty, ErrorState, Loading } from '@/shared/ui';

const HqOverviewPage = lazy(() => import('@/features/hq-overview').then((m) => ({ default: m.HqOverviewPage })));
const StoreDetailPage = lazy(() => import('@/features/store-detail').then((m) => ({ default: m.StoreDetailPage })));
const ReviewsPage = lazy(() => import('@/features/reviews').then((m) => ({ default: m.ReviewsPage })));
const StandardsPage = lazy(() => import('@/features/standards').then((m) => ({ default: m.StandardsPage })));
const AgentsPage = lazy(() => import('@/features/agents').then((m) => ({ default: m.AgentsPage })));
const ManagerPage = lazy(() => import('@/features/manager').then((m) => ({ default: m.ManagerPage })));
const StaffPage = lazy(() => import('@/features/staff').then((m) => ({ default: m.StaffPage })));
const ManualPage = lazy(() => import('@/features/manual').then((m) => ({ default: m.ManualPage })));
const WikiPage = lazy(() => import('@/features/wiki').then((m) => ({ default: m.WikiPage })));
const GraphPage = lazy(() => import('@/features/graph').then((m) => ({ default: m.GraphPage })));

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
            <Route path="/store/:id/manual" element={<ManualPage />} />
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
  if (targetId) return <Navigate to={`/store/${targetId}/${role === '점장' ? 'manager' : 'manual'}`} replace />;
  return (
    <div className="p-[var(--gutter)]">
      {overview.error ? <ErrorState message={overview.error} onRetry={overview.reload} /> : <Loading label="매장 정보 조회 중" />}
    </div>
  );
}

function StoreHome() {
  const { role } = useApp();
  return <Navigate to={role === '직원' ? 'manual' : 'manager'} replace />;
}

function NotFound() {
  return (
    <Empty title="해당 페이지 없음">
      <Link className="text-ink underline" to="/">업무 홈으로 이동</Link>
    </Empty>
  );
}
