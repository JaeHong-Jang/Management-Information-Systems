import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import Overview from '@/features/overview';
import Ask from '@/features/ask';
import Record from '@/features/record';
import Train from '@/features/train';
import Manager from '@/features/manager';
import Wiki from '@/features/wiki';
import Ontology from '@/features/ontology';
import Agents from '@/features/agents';
import Customers from '@/features/customers';
import MetricsPage from '@/features/metrics';
import Judge from '@/features/judge';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="ask" element={<Ask />} />
        <Route path="record" element={<Record />} />
        <Route path="train" element={<Train />} />
        <Route path="manager" element={<Manager />} />
        <Route path="wiki" element={<Wiki />} />
        <Route path="graph" element={<Ontology />} />
        <Route path="agents" element={<Agents />} />
        <Route path="customers" element={<Customers />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="judge" element={<Judge />} />
      </Route>
    </Routes>
  );
}
