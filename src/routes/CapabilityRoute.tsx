import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { CapabilityDomain } from "../services/me-capabilities-service.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import LoadingOverlay from "../components/LoadingOverlay.js";

interface CapabilityRouteProps {
  requireAny?: string[];
  requireAll?: string[];
  requireDomains?: CapabilityDomain[];
  children: React.ReactNode;
}

/**
 * Guard de ruta basado en el registro de capacidades del backend.
 * Redirige a /unauthorized si el usuario no cumple los requisitos.
 */
export default function CapabilityRoute({
  requireAny,
  requireAll,
  requireDomains,
  children,
}: CapabilityRouteProps) {
  const { loading, hasCapability, hasAnyCapability, hasDomain } =
    useCapabilities();
  const location = useLocation();

  if (loading) {
    return <LoadingOverlay title="Verificando acceso…" />;
  }

  const domainOk =
    !requireDomains ||
    requireDomains.length === 0 ||
    requireDomains.some((d) => hasDomain(d));
  const anyOk =
    !requireAny || requireAny.length === 0 || hasAnyCapability(requireAny);
  const allOk = !requireAll || requireAll.every((c) => hasCapability(c));

  if (!domainOk || !anyOk || !allOk) {
    // Telemetría ligera de autorización: evidencia para soporte/auditoría.
    const denied = {
      route: location.pathname,
      at: new Date().toISOString(),
      required: { any: requireAny, all: requireAll, domains: requireDomains },
    };
    console.warn("[Authz] Acceso denegado:", denied);
    try {
      localStorage.setItem("last-denied-access", JSON.stringify(denied));
    } catch {
      // almacenamiento no disponible: ignorar
    }
    return (
      <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />
    );
  }

  return <>{children}</>;
}
