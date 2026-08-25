import type { BannerProps } from "../../types/banner";

/** Aviso inline discreto (Server-Driven). */
export function InlineNotice({ props }: { props: BannerProps }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-card px-3 py-2 text-xs text-ink-muted">
      <span aria-hidden="true">ℹ️</span>
      <span className="min-w-0 flex-1">{props.message}</span>
      {props.ctaText && props.ctaUrl && (
        <a
          href={props.ctaUrl}
          className="shrink-0 font-semibold text-accent hover:underline"
        >
          {props.ctaText}
        </a>
      )}
    </div>
  );
}
