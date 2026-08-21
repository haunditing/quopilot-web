import type { ReactNode } from "react";
import Icon from "./Icon.js";

interface BackButtonProps {
  onClick: () => void;
  children?: ReactNode;
}

export default function BackButton({
  onClick,
  children = "Volver",
}: BackButtonProps) {
  const label = typeof children === "string" ? children : "Volver";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center p-0 mb-5 rounded-lg border border-line bg-surface-card text-ink-muted transition-colors duration-150 hover:border-accent-border hover:text-accent"
    >
      <Icon name="back" size={18} />

      <span className="visually-hidden">{children}</span>
    </button>
  );
}
