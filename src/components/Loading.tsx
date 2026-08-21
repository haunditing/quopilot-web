
/**
 * Primitiva de carga única de la aplicación.
 *
 * - variant="overlay": página/sección completa (usa el sistema page-state).
 * - variant="inline": carga en flujo, dentro de paneles o listas.
 *
 * Accesibilidad siempre activa: role="status" + aria-live + aria-busy.
 * El glifo del spinner vive aquí; ningún otro componente debe dibujarlo.
 */

export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";
export type LoadingVariant = "overlay" | "inline";

const sizeMap: Record<LoadingSize, number> = {
  xs: 20,
  sm: 28,
  md: 48,
  lg: 64,
  xl: 80,
};

interface GlyphProps {
  size: LoadingSize;
  className?: string;
}

/** Glifo puro (aria-hidden) para micro-contextos con CSS propio. */
export function LoadingGlyph({ size, className }: GlyphProps) {
  const s = sizeMap[size];
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 5.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5Zm0 2a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z"
      />
      <path
        fill="currentColor"
        d="M12 18.25a5.75 5.75 0 1 1 0-11.5 5.75 5.75 0 0 1 0 11.5Z"
      />
      <path
        fill="currentColor"
        d="M12 9.75v3.5m0 0h3.5m-3.5-3.5V9.75a2.75 2.75 0 1 0-5.5 0 2.75 2.75 0 0 0 5.5 0Z"
      />
    </svg>
  );
}

export interface LoadingProps {
  variant?: LoadingVariant;
  label?: string;
  /** Texto secundario; solo aplica en variante overlay. */
  message?: string;
  size?: LoadingSize;
  className?: string;
}

export default function Loading({
  variant = "inline",
  label,
  message,
  size,
  className,
}: LoadingProps) {
  const resolvedSize: LoadingSize =
    size ?? (variant === "overlay" ? "md" : "sm");

  if (variant === "inline") {
    return (
      <span
        className={`loading-inline ${className || ""}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingGlyph size={resolvedSize} className="loading-inline__spinner" />
        {label && <span className="loading-inline__label">{label}</span>}
      </span>
    );
  }

  return (
    <main
      className={`page-state page-state--loading ${className || ""}`}
      style={{
        width: "100%",
        display: "block",
        margin: "0 auto",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingGlyph size={resolvedSize} className="page-state__spinner" />

      {label && <h1>{label}</h1>}

      {message && <p>{message}</p>}
    </main>
  );
}
