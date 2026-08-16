import DashboardRenderer from "../components/dashboard/DashboardRenderer.js";
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

  if (loading) {
    return <PageState kind="loading" title="Cargando dashboard..." />;
  }

  if (error) {
    return <PageState kind="error" title="Error en dashboard" message={error} />;
  }

  if (!data) {
    return <PageState title="No hay datos disponibles" />;
  }

  return <DashboardRenderer config={buildConfig(data)} />;
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
