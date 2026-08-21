import React from "react";
import Loading from "./Loading.js";
import PageState from "./PageState.js";
import EmptyState from "./EmptyState.js";
import Button from "./Button.js";

/**
 * Patrón declarativo de estados asíncronos.
 *
 * Posee el árbol de decisión loading → error → vacío → contenido,
 * eliminando los ternarios manuales duplicados en cada página:
 *
 *   <AsyncBoundary
 *     loading={loading} error={error} empty={!data}
 *     loadingLabel="Cargando panel…" errorTitle="No fue posible cargar"
 *     onRetry={reload}
 *   >
 *     <Contenido />
 *   </AsyncBoundary>
 *
 * Compone los primitivos existentes (Loading / PageState / EmptyState).
 */
export interface AsyncBoundaryProps {
  loading: boolean;
  /** Mensaje de error; truthy activa el estado de error. */
  error?: string | null;
  /** Truthy activa el estado de vacío (solo si no hay error). */
  empty?: boolean;
  loadingLabel?: string;
  loadingMessage?: string;
  errorTitle?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Acción opcional "Reintentar" mostrada en el estado de error. */
  onRetry?: () => void;
  children: React.ReactNode;
}

export default function AsyncBoundary({
  loading,
  error,
  empty = false,
  loadingLabel = "Cargando…",
  loadingMessage,
  errorTitle = "No fue posible cargar",
  emptyTitle = "No hay datos",
  emptyMessage,
  onRetry,
  children,
}: AsyncBoundaryProps) {
  if (loading) {
    return <Loading variant="overlay" label={loadingLabel} message={loadingMessage} />;
  }

  if (error) {
    return (
      <PageState kind="error" title={errorTitle} message={error}>
        {onRetry && (
          <Button type="button" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </PageState>
    );
  }

  if (empty) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return <>{children}</>;
}
