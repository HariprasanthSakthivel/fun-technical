import { Info } from "lucide-react";

import { cn } from "@/utils/cn";

interface PlaceholderBannerProps {
  message?: string;
  className?: string;
}

/** Visible reminder that Step 1 screens use placeholder data only. */
export function PlaceholderBanner({
  message = "Placeholder UI — authentication, database, and real-time features are not connected yet.",
  className,
}: PlaceholderBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground/90",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
