import { Outlet } from "react-router-dom";

import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";

/** Participant section shell for join / waiting flows. */
export function ParticipantLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <Badge variant="purple">Participant</Badge>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
