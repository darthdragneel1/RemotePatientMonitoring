import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { DevicesPage } from "@/pages/DevicesPage";
import { DeviceDetailPage } from "@/pages/DeviceDetailPage";
import { PatientsPage } from "@/pages/PatientsPage";
import { PatientDetailPage } from "@/pages/PatientDetailPage";
import { AuditLogsPage } from "@/pages/AuditLogsPage";
import { OrganizationsPage } from "@/pages/admin/OrganizationsPage";
import { InvitesPage } from "@/pages/admin/InvitesPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute, RequireRole } from "@/components/ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/audit" element={<AuditLogsPage />} />

          <Route element={<RequireRole role="SUPER_ADMIN" />}>
            <Route path="/admin/organizations" element={<OrganizationsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/invites" element={<InvitesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
