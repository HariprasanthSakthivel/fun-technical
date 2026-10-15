import { NavLink, Outlet } from "react-router-dom";

import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/utils/cn";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-navy-700 text-foreground"
      : "text-muted hover:bg-navy-800 hover:text-foreground",
  );

/** Shared shell for public pages (welcome + role entry points). */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Primary">
            <NavLink to="/" end className={navLinkClass}>
              Welcome
            </NavLink>
            <NavLink to="/admin/login" className={navLinkClass}>
              Admin
            </NavLink>
            <NavLink to="/participant/join" className={navLinkClass}>
              Join game
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border/50 py-5 text-center text-xs text-muted">
        Fun &amp; Technical Activity Platform · Step 1 shell · Internal events only
      </footer>
    </div>
  );
}
