import type { SelectHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/** Styled native select element matching the design system. */
export function Select({ className, error, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-lg border border-border bg-navy-900 px-3 py-2 text-sm text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-accent-blue/60 focus:ring-offset-1 focus:ring-offset-navy-950",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>option]:bg-navy-900",
        error && "border-danger focus:ring-danger/60",
        className,
      )}
      {...props}
    />
  );
}
