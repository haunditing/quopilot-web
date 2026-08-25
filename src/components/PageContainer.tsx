import type { ReactNode } from "react";

/**
 * Envoltorio común de página de contenido.
 * Centraliza el fondo (`surface-light`) y la altura mínima para que las
 * páginas no repitan el `<main>`. El padding horizontal/vertical lo aporta
 * el contenedor del shell (AppLayout), fuente única de espaciado.
 */
export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-full bg-surface-light ${className}`}>
      {children}
    </main>
  );
}
