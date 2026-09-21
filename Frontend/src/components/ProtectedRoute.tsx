import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/types";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
