import { CheckCircle, Info, TriangleAlert, X, XCircle } from "lucide-react";

import { dismissToast, type ToastItem, useToastStore } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

const STYLES: Record<
  ToastItem["type"],
  { icon: React.ElementType; bg: string; border: string; text: string; icon_color: string }
> = {
  success: {
    icon: CheckCircle,
    bg: "bg-navy-800",
    border: "border-success/40",
    text: "text-foreground",
    icon_color: "text-success",
  },
  error: {
    icon: XCircle,
    bg: "bg-navy-800",
    border: "border-danger/40",
    text: "text-foreground",
    icon_color: "text-danger",
  },
  warning: {
    icon: TriangleAlert,
    bg: "bg-navy-800",
    border: "border-warning/40",
    text: "text-foreground",
    icon_color: "text-warning",
  },
  info: {
    icon: Info,
    bg: "bg-navy-800",
    border: "border-accent-blue/40",
    text: "text-foreground",
    icon_color: "text-accent-blue-bright",
  },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const s = STYLES[toast.type];
  const Icon = s.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
        "w-80 max-w-[calc(100vw-2rem)]",
        s.bg,
        s.border,
        s.text,
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon_color)} aria-hidden />
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        className="shrink-0 rounded p-0.5 text-muted hover:text-foreground"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Renders active toast notifications in a fixed bottom-right stack. */
export function Toaster() {
  const toasts = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
