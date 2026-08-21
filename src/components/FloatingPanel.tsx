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
    position === "bottom-left" ? "left-6 right-auto" : "";

  const label = open ? "Cerrar panel" : ariaLabel;

  return (
    <>
      <button
        type="button"
        className={"fixed bottom-6 right-6 z-60 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent text-white shadow-card cursor-pointer transition-transform duration-150 hover:brightness-110 active:scale-95 " + positionClass}
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name={open ? "close" : icon} size={22} />
      </button>

      {open && (
        <div
          className={"fixed bottom-24 right-6 z-60 flex flex-col w-[min(400px,calc(100vw-48px))] h-[min(600px,calc(100vh-140px))] rounded-2xl overflow-hidden bg-surface-card shadow-card " + positionClass}
          role="dialog"
          aria-label={ariaLabel}
        >
          <div className="flex flex-col flex-1 min-h-0">{children}</div>
        </div>
      )}
    </>
  );
}
