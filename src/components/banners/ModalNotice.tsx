import { useState } from "react";
import type { BannerProps } from "../../types/banner";

/** Modal de aviso (Server-Driven) para flujos tipo checkout. */
export function ModalNotice({ props }: { props: BannerProps }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface-card p-6 shadow-card">
        {props.title && (
          <h2 className="mb-2 text-lg font-bold text-ink-strong">{props.title}</h2>
        )}
        <p className="text-sm text-ink-muted">{props.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-accent-soft"
          >
            Cerrar
          </button>
          {props.ctaText && props.ctaUrl && (
            <a
              href={props.ctaUrl}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {props.ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
