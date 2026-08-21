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
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold tracking-[0.03em]">
      {label}
    </span>
  );
}
