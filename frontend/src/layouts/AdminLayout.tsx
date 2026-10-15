import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gamepad2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Trophy,
  UserCircle2,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { BrandLogo } from "@/components/BrandLogo";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/utils/cn";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/games", label: "Games", icon: Gamepad2 },
  { to: "/admin/questions", label: "Question Bank", icon: ClipboardList },
  { to: "/admin/teams", label: "Teams", icon: Users },
  { to: "/admin/sessions", label: "Live Sessions", icon: Wifi },
  { to: "/admin/scoreboard", label: "Scoreboard", icon: Trophy },
  { to: "/admin/results", label: "Results & History", icon: History },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

/** Map route prefixes → page title for the top bar */
const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/games": "Games",
  "/admin/questions": "Question Bank",
  "/admin/teams": "Teams",
  "/admin/sessions": "Live Sessions",
  "/admin/scoreboard": "Scoreboard",
  "/admin/results": "Results & History",
  "/admin/settings": "Settings",
};

function usePageTitle() {
  const { pathname } = useLocation();
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return "Admin";
}

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = usePageTitle();

  return (
    <div className="flex min-h-screen bg-navy-950">
      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/60 bg-navy-950 transition-all duration-300",
          "lg:relative lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "w-64",
        )}
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "flex items-center border-b border-border/60 px-4 py-4",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          {!collapsed && <BrandLogo />}
          {collapsed && (
            <BrandLogo showText={false} />
          )}

          {/* Mobile close */}
          <button
            className="rounded-lg p-1 text-muted hover:bg-navy-800 hover:text-foreground lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            className={cn(
              "hidden rounded-lg p-1 text-muted hover:bg-navy-800 hover:text-foreground lg:block",
              collapsed && "mx-auto",
            )}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-blue/15 text-accent-blue-bright"
                    : "text-muted hover:bg-navy-800 hover:text-foreground",
                  collapsed && "justify-center px-2",
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Admin profile + logout */}
        <div className="border-t border-border/60 px-2 py-4 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple">
                <UserCircle2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">Admin User</p>
                <p className="truncate text-xs text-muted">Super Admin</p>
              </div>
            </div>
          )}
          <NavLink
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-navy-800 hover:text-danger",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span>Logout</span>}
          </NavLink>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border/60 bg-navy-900/80 px-4 py-3 backdrop-blur-md sm:px-6">
          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-2 text-muted hover:bg-navy-800 hover:text-foreground lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title + breadcrumb */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Admin
            </p>
            <h1 className="font-display text-base font-semibold text-foreground sm:text-lg">
              {pageTitle}
            </h1>
          </div>

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              placeholder="Search…"
              className="h-9 w-52 rounded-lg border border-border bg-navy-800 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/60 focus:border-transparent lg:w-64"
            />
          </div>

          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 text-muted hover:bg-navy-800 hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-blue" aria-hidden />
          </button>

          {/* Admin avatar */}
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple"
            aria-label="Admin profile"
          >
            <BarChart3 className="h-4 w-4 text-white" aria-hidden />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
