import { X } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/utils/cn";

export type ToastVariant = "info" | "success" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  variant?: ToastVariant;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue-bright",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const variant = toast.variant ?? "info";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-right-5 fade-in duration-200",
        VARIANT_STYLES[variant],
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="mt-0.5 shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

/** Fixed-position toast container rendered at the bottom-right of the viewport. */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

let _counter = 0;

/** Create a unique toast id. */
export function toastId() {
  return `toast-${++_counter}`;
}
