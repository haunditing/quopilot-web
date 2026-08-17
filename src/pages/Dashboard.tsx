import DashboardRenderer from "../components/dashboard/DashboardRenderer.js";
import EmptyState from "../components/EmptyState.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import { createAgentDashboard } from "../config/agent-dashboard.js";
import { createSuperAdminDashboard } from "../config/super-admin-dashboard.js";
import { createTenantDashboard } from "../config/tenant-dashboard.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { getUser } from "../services/auth-storage.js";
import {
  getAgentDashboardSummary,
  getSuperAdminDashboardSummary,
  getTenantDashboardSummary,
} from "../services/dashboard-service.js";
import type { DashboardConfig } from "../types/dashboard-ui.js";

interface DashboardViewProps<T> {
  fetcher: () => Promise<T>;
  buildConfig: (summary: T) => DashboardConfig;
}

function DashboardView<T>({ fetcher, buildConfig }: DashboardViewProps<T>) {
  const { data, loading, error } = useAsyncData(fetcher);

  return (
    <main>
      {loading ? (
        <LoadingOverlay
          title="Cargando panel administrativo..."
          message="Esto puede tomar unos segundos"
        />
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : !data ? (
        <EmptyState
          title="No hay datos"
          message="Todavía no existen datos para mostrar con los filtros actuales."
        />
      ) : (
        <DashboardRenderer config={buildConfig(data)} />
      )}
    </main>
  );
}

export default function Dashboard() {
  const user = getUser();

  switch (user?.role) {
    case "SUPER_ADMIN":
      return (
        <DashboardView
          fetcher={getSuperAdminDashboardSummary}
          buildConfig={createSuperAdminDashboard}
        />
      );

    case "TENANT_ADMIN":
      return (
        <DashboardView
          fetcher={getTenantDashboardSummary}
          buildConfig={createTenantDashboard}
        />
      );

    case "AGENT":
      return (
        <DashboardView
          fetcher={getAgentDashboardSummary}
          buildConfig={createAgentDashboard}
        />
      );

    default:
      return (
        <PageState
          title="Acceso no disponible"
          message="No se pudo determinar el rol del usuario."
        />
      );
  }
}
