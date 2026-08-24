import Badge from "./Badge.js";
import type { BadgeTone } from "./Badge.js";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  VIEWED: "Vista",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SENT: "neutral",
  VIEWED: "neutral",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
  CONFIRMED: "success",
  CANCELLED: "danger",
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "neutral",
  OPEN: "warning",
  CLOSED: "neutral",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status;

  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label}</Badge>;
}
