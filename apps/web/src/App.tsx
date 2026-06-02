import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PatientsPage } from '@/pages/patients/PatientsPage';
import { PatientDetailPage } from '@/pages/patients/PatientDetailPage';
import { NewPatientPage } from '@/pages/patients/NewPatientPage';
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage';
import { BillingPage } from '@/pages/billing/BillingPage';
import { SocialWorksPage } from '@/pages/billing/SocialWorksPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { WhatsappMessagesPage } from '@/pages/notifications/WhatsappMessagesPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="patients"     element={<PatientsPage />} />
        <Route path="patients/new" element={<NewPatientPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="billing"      element={<BillingPage />} />
        <Route path="social-works" element={<SocialWorksPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/whatsapp" element={<WhatsappMessagesPage />} />
        <Route path="settings"     element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

