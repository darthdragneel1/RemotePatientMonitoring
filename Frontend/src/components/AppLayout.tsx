import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6">
            <span className="font-semibold">Telemetry</span>
            <NavLink to="/devices" className={navLinkClass}>
              Devices
            </NavLink>
            <NavLink to="/patients" className={navLinkClass}>
              Patients
            </NavLink>
            {user?.role === "SUPER_ADMIN" && (
              <>
                <NavLink to="/admin/organizations" className={navLinkClass}>
                  Organizations
                </NavLink>
                <NavLink to="/admin/invites" className={navLinkClass}>
                  Invites
                </NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
