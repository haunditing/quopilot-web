import React from "react";
import Icon from "./Icon.js";

interface PageStateProps {
  title: string;
  message?: string;
  kind?: "error" | "info";
  /** Acción opcional bajo el mensaje (p. ej. botón Reintentar). */
  children?: React.ReactNode;
}

export default function PageState({
  title,
  message,
  kind = "info",
  children,
}: PageStateProps) {
  const icon = kind === "error" ? "error" : "empty";
  const className = kind === "error" ? "page-state page-state--error" : "page-state";

  return (
    <main className={className}>
      <Icon name={icon} size={42} className="page-state__icon" />

      <h1>{title}</h1>

      {message && <p>{message}</p>}

      {children}
    </main>
  );
}