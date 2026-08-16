import type { ReactNode } from "react";

interface FormMessageProps {
  kind: "error" | "success" | "info";
  children: ReactNode;
}

export default function FormMessage({ kind, children }: FormMessageProps) {
  const role = kind === "error" ? "alert" : "status";

  return (
    <p className={`form-message form-message--${kind}`} role={role}>
      {children}
    </p>
  );
}
