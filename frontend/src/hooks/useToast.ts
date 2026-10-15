/**
 * Module-level toast store — no React context required.
 * Call toast.success() / toast.error() / toast.info() / toast.warning() from anywhere.
 * Subscribe with useToastStore() inside a component to get the current list.
 */
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let _toasts: ToastItem[] = [];
const _listeners = new Set<Listener>();

function _notify() {
  const snapshot = [..._toasts];
  _listeners.forEach((l) => l(snapshot));
}

function _add(type: ToastType, message: string) {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  _toasts = [..._toasts.slice(-4), { id, type, message }]; // max 5 toasts
  _notify();
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id);
    _notify();
  }, 3600);
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id);
  _notify();
}

/** Call from anywhere — no hook required. */
export const toast = {
  success: (message: string) => _add("success", message),
  error: (message: string) => _add("error", message),
  info: (message: string) => _add("info", message),
  warning: (message: string) => _add("warning", message),
};

/** Use inside a component to read the live toast list. */
export function useToastStore(): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>([..._toasts]);

  useEffect(() => {
    _listeners.add(setItems);
    return () => {
      _listeners.delete(setItems);
    };
  }, []);

  return items;
}
