import type { ReactNode } from "react";

/**
 * Envoltorio común de página de contenido.
 * Centraliza la altura mínima para que las
 * páginas no repitan el `<main>`. El padding horizontal/vertical y fondo lo aporta
 * el contenedor del shell (AppLayout), fuente única de espaciado y tema.
 */
export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-full ${className}`}>
      {children}
    </main>
  );
}
