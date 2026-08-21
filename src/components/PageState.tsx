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
  const isError = kind === "error";

  return (
    <main
      className={`grid min-h-[50vh] place-items-center p-6 text-center ${
        isError ? "text-danger" : ""
      }`}
      role={isError ? "alert" : "status"}
    >
      <div className="flex flex-col items-center gap-4">
        <Icon
          name={isError ? "error" : "empty"}
          size={42}
          className="text-accent"
        />

        <h1 className="m-0 text-[28px] leading-[1.15] tracking-[-0.8px] font-bold text-ink-strong">
          {title}
        </h1>

        {message && <p className="m-0">{message}</p>}

        {children}
      </div>
    </main>
  );
}
