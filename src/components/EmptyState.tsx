import type { ReactNode } from "react";
import Icon from "./Icon.js";

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: "empty" | "error";
  children?: ReactNode;
}

export default function EmptyState({
  title,
  message,
  icon = "empty",
  children,
}: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-1 border border-dashed border-line rounded-xl px-5 py-10 text-center">
      <Icon name={icon} size={40} className="text-accent mb-2" />

      <h2>{title}</h2>

      {message && <p className="mt-2">{message}</p>}

      {children}
    </section>
  );
}
