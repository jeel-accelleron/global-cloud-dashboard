import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import WorkItems from './pages/WorkItems';
import Analytics from './pages/Analytics';
import TeamInsights from './pages/TeamInsights';
import AIChat from './pages/AIChat';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import PBIs from './pages/PBIs';
import Tasks from './pages/Tasks';
import MissingComponents from './pages/MissingComponents';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/pbis" element={<PBIs />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/missing" element={<MissingComponents />} />
        <Route path="/work-items" element={<WorkItems />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/team" element={<TeamInsights />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
