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

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const variant = status.toLowerCase();
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className={`status-badge status-badge--${variant}`}>{label}</span>
  );
}
