import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/** Styled textarea matching the design system. */
export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded-lg border border-border bg-navy-900 px-3 py-2 text-sm text-foreground placeholder:text-muted",
        "focus:outline-none focus:ring-2 focus:ring-accent-blue/60 focus:ring-offset-1 focus:ring-offset-navy-950",
        "resize-y disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-danger focus:ring-danger/60",
        className,
      )}
      {...props}
    />
  );
}
