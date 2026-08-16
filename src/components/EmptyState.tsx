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
    <section className="empty-state">
      <Icon name={icon} size={40} className="empty-state__icon" />

      <h2>{title}</h2>

      {message && <p>{message}</p>}

      {children}
    </section>
  );
}
