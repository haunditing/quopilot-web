import type { BannerProps } from "../../types/banner";

const VARIANT_CLASS: Record<string, string> = {
  info: "border-sky-500/40 bg-sky-500/10 text-sky-100",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  error: "border-rose-500/40 bg-rose-500/10 text-rose-100",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
};

/** Barra de alerta contextual (Server-Driven). */
export function AlertBanner({ props }: { props: BannerProps }) {
  const tone = VARIANT_CLASS[props.variant ?? "info"] ?? VARIANT_CLASS.info;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}
      role="alert"
    >
      <div className="min-w-0 flex-1">
        {props.title && <strong className="block font-semibold">{props.title}</strong>}
        <span>{props.message}</span>
      </div>
      {props.ctaText && props.ctaUrl && (
        <a
          href={props.ctaUrl}
          className="shrink-0 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
        >
          {props.ctaText}
        </a>
      )}
    </div>
  );
}
