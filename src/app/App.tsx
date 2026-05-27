import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../shared/hooks/useAuth';
import { AppLayout } from '../shared/components/AppLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { InstrumentsPage } from '../features/instruments/InstrumentsPage';
import { InstrumentFormPage } from '../features/instruments/InstrumentFormPage';
import { MembersPage } from '../features/members/MembersPage';
import { ProjectionsPage } from '../features/projections/ProjectionsPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/instruments" element={<InstrumentsPage />} />
          <Route path="/instruments/add" element={<InstrumentFormPage />} />
          <Route path="/instruments/:id/edit" element={<InstrumentFormPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
