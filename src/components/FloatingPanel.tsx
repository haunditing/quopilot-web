import { useState } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";

export type FloatingPanelPosition = "bottom-right" | "bottom-left";

interface FloatingPanelProps {
  icon?: IconName;
  ariaLabel?: string;
  children: ReactNode;
  position?: FloatingPanelPosition;
}

export default function FloatingPanel({
  icon = "chat",
  ariaLabel = "Panel flotante",
  children,
  position = "bottom-right",
}: FloatingPanelProps) {
  const [open, setOpen] = useState(false);

  const positionClass =
    position === "bottom-left"
      ? "floating-panel--left"
      : "floating-panel--right";

  const label = open ? "Cerrar panel" : ariaLabel;

  return (
    <>
      <button
        type="button"
        className={`floating-panel__fab ${positionClass}`}
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name={open ? "close" : icon} size={22} />
      </button>

      {open && (
        <div
          className={`floating-panel ${positionClass}`}
          role="dialog"
          aria-label={ariaLabel}
        >
          <div className="floating-panel__body">{children}</div>
        </div>
      )}
    </>
  );
}
