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
import { Empty } from '@/shared/ui';

export function App() {
  return (
    <PresentProvider>
      <AppDataProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/hq" replace />} />
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
