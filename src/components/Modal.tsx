import { useEffect } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";

type ModalSize = "sheet" | "confirm" | "wide";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Variante de ancho/alto del panel. Default: bottom-sheet fluido. */
  size?: ModalSize;
  /** Clases extra para el panel (temas por página, p. ej. product-modal). */
  panelClassName?: string;
  children: ReactNode;
}

const panelSizeClass: Record<ModalSize, string> = {
  sheet: "",
  confirm: "max-w-[440px]",
  wide: "max-w-[720px] h-[min(680px,88svh)] flex flex-col",
};

export default function Modal({
  open,
  title,
  onClose,
  size = "sheet",
  panelClassName,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isWide = size === "wide";

  const panelClasses = [
    "relative w-full max-h-[92svh] overflow-y-auto",
    "pt-5 px-4 pb-[calc(20px+env(safe-area-inset-bottom))]",
    "bg-surface-card rounded-t-2xl",
    "animate-[modal-slide-up_200ms_ease]",
    panelSizeClass[size],
    panelClassName || "",
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-[rgba(8,6,13,0.5)]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={panelClasses.join(" ")}>
        <header className="flex items-center justify-between gap-3 mb-5">
          <h2>{title}</h2>

          <button
            type="button"
            className="inline-flex items-center justify-center w-10 h-10 border-0 rounded-lg bg-transparent text-ink-strong transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div
          className={
            isWide ? "flex-1 min-h-0 overflow-hidden flex" : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
