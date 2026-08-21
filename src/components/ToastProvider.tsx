import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";
import { ToastContext } from "../hooks/useToast.js";
import type { ToastItem, ToastKind } from "../hooks/useToast.js";

const TOAST_DURATION = 4000;

export default function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: ReactNode) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;

    setToasts((current) => [...current, { id, kind, message }]);
  }, []);

  const success = useCallback(
    (message: ReactNode) => push("success", message),
    [push],
  );

  const error = useCallback(
    (message: ReactNode) => push("error", message),
    [push],
  );

  const info = useCallback(
    (message: ReactNode) => push("info", message),
    [push],
  );

  const value = useMemo(
    () => ({ success, error, info }),
    [success, error, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-viewport" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const toastIcons: Record<ToastKind, IconName> = {
  success: "check",
  error: "error",
  info: "info",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_DURATION);

    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-60 flex flex-col gap-2.5 w-[calc(100%-24px)] max-w-[420px] pointer-events-none"
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <span className="inline-flex items-center justify-center shrink-0 w-7 h-7 rounded-lg">
        <Icon name={toastIcons[toast.kind]} size={18} />
      </span>

      <p className="flex-1 text-sm leading-[1.45] text-ink-strong [overflow-wrap:anywhere]">
        {toast.message}
      </p>

      <button
        type="button"
        className="inline-flex items-center justify-center shrink-0 w-7 h-7 border-0 rounded-lg bg-transparent text-slate-500 cursor-pointer transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
