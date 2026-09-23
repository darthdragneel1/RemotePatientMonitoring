import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, Bell } from "lucide-react";

import { useLiveTelemetry } from "@/hooks/useLiveTelemetry";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block py-3 text-lg font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useLiveTelemetry();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-lg">Telemetry</span>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLink to="/devices" className={navLinkClass}>
                Devices
              </NavLink>
              <NavLink to="/patients" className={navLinkClass}>
                Patients
              </NavLink>
              {user?.role !== "ORG_USER" && (
                <NavLink to="/audit" className={navLinkClass}>
                  Audit Logs
                </NavLink>
              )}
              {user?.role === "SUPER_ADMIN" && (
                <>
                  <NavLink to="/admin/organizations" className={navLinkClass}>
                    Organizations
                  </NavLink>
                  <NavLink to="/admin/users" className={navLinkClass}>
                    Users
                  </NavLink>
                  <NavLink to="/admin/invites" className={navLinkClass}>
                    Invites
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => {
                if ("Notification" in window) {
                  Notification.requestPermission().then(() => {
                    // Force a re-render or just let the browser handle it.
                    // The hook will check Notification.permission dynamically.
                    window.location.reload();
                  });
                }
              }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors relative"
              title="Enable Desktop Notifications"
            >
              <Bell size={20} />
              {"Notification" in window && Notification.permission !== "granted" && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-6 py-4 shadow-lg absolute w-full left-0">
            <nav className="flex flex-col space-y-2">
              <NavLink to="/devices" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                Devices
              </NavLink>
              <NavLink to="/patients" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                Patients
              </NavLink>
              {user?.role !== "ORG_USER" && (
                <NavLink to="/audit" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                  Audit Logs
                </NavLink>
              )}
              {user?.role === "SUPER_ADMIN" && (
                <>
                  <div className="pt-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">Admin</div>
                  <NavLink to="/admin/organizations" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    Organizations
                  </NavLink>
                  <NavLink to="/admin/users" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    Users
                  </NavLink>
                  <NavLink to="/admin/invites" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    Invites
                  </NavLink>
                </>
              )}
            </nav>
            <div className="mt-6 border-t pt-4">
              <div className="mb-4 text-sm text-muted-foreground">{user?.email}</div>
              <Button variant="outline" className="w-full" onClick={() => { closeMobileMenu(); handleLogout(); }}>
                Log out
              </Button>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
