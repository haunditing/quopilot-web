import { useState } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";
import { useBranding } from "../context/BrandingProvider.js";

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
  const { assistantImageUrl, brandName, primaryColor, secondaryColor } = useBranding();
  const [open, setOpen] = useState(false);

  const positionClass = position === "bottom-left" ? "left-6 right-auto" : "";

  const label = open ? "Cerrar panel" : ariaLabel;

  const fabStyle =
    primaryColor && secondaryColor
      ? { background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }
      : primaryColor
        ? { background: primaryColor }
        : undefined;

  return (
    <>
      {/* FAB con bubble corporativo */}
      <div
        className={
          "fixed bottom-6 right-6 z-60 inline-flex items-center group " +
          positionClass
        }
      >
        {!open && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-[var(--accent)] text-[color:var(--accent-text)] px-4 py-2 rounded-full shadow-md whitespace-nowrap pointer-events-none">
            <span className="text-[13px] font-medium leading-none">¿Cómo te ayudo?</span>
          </div>
        )}

        <button
          type="button"
          className={
            open
              ? "inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent)] text-[color:var(--accent-text)] shadow-xl cursor-pointer transition-all duration-150 hover:opacity-90 hover:scale-105 active:scale-95 border border-white/15"
              : "inline-flex items-center justify-center w-14 h-14 rounded-full bg-white text-[var(--accent)] shadow-lg cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 border-2 border-[var(--accent)]"
          }
          style={open ? fabStyle : undefined}
          aria-label={label}
          aria-expanded={open}
          title={label}
          onClick={() => setOpen((current) => !current)}
        >
          {assistantImageUrl && !open ? (
            <img
              src={assistantImageUrl}
              alt={brandName}
              className="w-9 h-9 object-contain shrink-0"
            />
          ) : (
            <Icon
              name={open ? "close" : icon}
              size={22}
              className={open ? "text-[color:var(--accent-text)]" : "text-[var(--accent)]"}
            />
          )}
        </button>
      </div>

      {open && (
        <div
          className={
            "fixed bottom-24 right-6 z-60 flex flex-col w-[min(400px,calc(100vw-48px))] h-[min(560px,calc(100vh-140px))] rounded-2xl overflow-hidden bg-surface-card border border-line shadow-2xl " +
            positionClass
          }
          role="dialog"
          aria-label={ariaLabel}
        >
          <div className="flex flex-col flex-1 min-h-0">{children}</div>
        </div>
      )}
    </>
  );
}
