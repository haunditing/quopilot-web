import { useEffect } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  panelClassName?: string;
  children: ReactNode;
}

export default function Modal({
  open,
  title,
  onClose,
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

  const panelClasses = ["modal__panel"];

  if (panelClassName) {
    panelClasses.push(panelClassName);
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className={panelClasses.join(" ")}>
        <header className="modal__header">
          <h2>{title}</h2>

          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
