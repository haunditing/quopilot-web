import type { ReactNode } from "react";

interface FormMessageProps {
  kind: "error" | "success" | "info";
  children: ReactNode;
}

export default function FormMessage({ kind, children }: FormMessageProps) {
  const role = kind === "error" ? "alert" : "status";

  return (
    <p
      className={`p-3 rounded-lg text-sm ${
        kind === "error"
          ? "bg-red-50 text-danger"
          : kind === "success"
            ? "bg-emerald-50 text-success"
            : "bg-slate-100 text-ink-muted"
      }`}
      role={role}
    >
      {children}
    </p>
  );
}
