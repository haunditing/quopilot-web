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
      className="back-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name="back" size={18} />

      <span className="visually-hidden">{children}</span>
    </button>
  );
}
