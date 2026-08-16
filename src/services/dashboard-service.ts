import { apiRequest } from "../lib/api.js";
import type {
  AgentDashboardSummary,
  SuperAdminDashboardSummary,
  TenantDashboardSummary,
} from "../types/dashboard.js";

export async function getTenantDashboardSummary(): Promise<TenantDashboardSummary> {
  return apiRequest<TenantDashboardSummary>("/api/tenant/dashboard/summary", {
    method: "GET",
  });
}

export async function getAgentDashboardSummary(): Promise<AgentDashboardSummary> {
  return apiRequest<AgentDashboardSummary>("/api/agent/dashboard/summary", {
    method: "GET",
  });
}

export async function getSuperAdminDashboardSummary(): Promise<SuperAdminDashboardSummary> {
  return apiRequest<SuperAdminDashboardSummary>(
    "/api/super-admin/dashboard/summary",
    {
      method: "GET",
    },
  );
}
