import { createFileRoute, Outlet, Navigate, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Map, Package, LogOut } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  ssr: false,
});

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <nav className="absolute right-4 top-4 z-[1100] flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur">
        <NavLink to="/" active={loc.pathname === "/"} icon={<Map className="h-4 w-4" />}>Map</NavLink>
        <NavLink to="/materials" active={loc.pathname.startsWith("/materials")} icon={<Package className="h-4 w-4" />}>Materials</NavLink>
        <button
          onClick={() => signOut()}
          title={user.email ?? ""}
          className="ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </nav>
      <Outlet />
    </div>
  );
}

function NavLink({ to, active, icon, children }: { to: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}{children}
    </Link>
  );
}
