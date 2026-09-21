import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './lib/authStore';

// Layout & Pages
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Ingestion } from './pages/Ingestion';
import { ComparisonReview } from './pages/ComparisonReview';
import { SnippingWorkspace } from './pages/SnippingWorkspace';
import { QuestionBank } from './pages/QuestionBank';
import { PaperDesigner } from './pages/PaperDesigner';
import { PaperBank } from './pages/PaperBank';
import { OMRGenerator } from './pages/OMRGenerator';
import { OMREvaluator } from './pages/OMREvaluator';
import { ModelManager } from './pages/ModelManager';
import { UserManagement } from './pages/UserManagement';
import { AuditLogs } from './pages/AuditLogs';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="ingest" element={<Ingestion />} />
            <Route path="review" element={<ComparisonReview />} />
            <Route path="snip" element={<SnippingWorkspace />} />
            <Route path="bank" element={<QuestionBank />} />
            <Route path="designer" element={<PaperDesigner />} />
            <Route path="papers" element={<PaperBank />} />
            <Route path="omr-gen" element={<OMRGenerator />} />
            <Route path="omr-eval" element={<OMREvaluator />} />

            {/* Admin Only Routes */}
            <Route
              path="models"
              element={
                <ProtectedRoute adminOnly>
                  <ModelManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute adminOnly>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
