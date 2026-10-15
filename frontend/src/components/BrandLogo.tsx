import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/utils/cn";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
}

/** Application logo placeholder with brand mark. */
export function BrandLogo({ className, showText = true }: BrandLogoProps) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple shadow-lg shadow-accent-blue/30">
        <Zap className="h-5 w-5 text-white" aria-hidden />
      </span>
      {showText ? (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-sm font-bold tracking-wide text-foreground sm:text-base">
            Fun &amp; Technical
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Activity Platform
          </span>
        </span>
      ) : null}
    </Link>
  );
}
