import type { MeCapabilities, CapabilityDomain } from "../services/me-capabilities-service";
import type {
  AgentDashboardSummary,
  SuperAdminDashboardSummary,
  TenantDashboardSummary,
} from "../types/dashboard";

/**
 * Capa de datos MOCK para la revisión de componentes.
 *
 * Cuando la sesión de "revisión" está activa (cookie `quopilot_review=1`,
 * seteada por el login front-only del gestor de contenido), `api.ts` NO llama
 * al backend: devuelve fixtures locales. Así se pueden revisar los componentes
 * y estilos reales de la app sin depender de la API.
 *
 * - `/api/me/capabilities` → concede todo para que las rutas se abran.
 * - Dashboards → resúmenes con la misma forma que `types/dashboard.ts`.
 * - Listas principales → arrays con datos representativos.
 * - Tenant / agent → objetos mínimos.
 * - Cualquier otra ruta → `[]` (renders de listas vacías / EmptyState).
 */

export const REVIEW_COOKIE = "quopilot_review";

export function isReviewMode(): boolean {
  return document.cookie.includes(`${REVIEW_COOKIE}=1`);
}

/** Desactiva el modo de revisión (elimina la cookie). */
export function clearReviewCookie(): void {
  document.cookie = `${REVIEW_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

const ALL_CODES = [
  "dashboard.view",
  "superAdmin.dashboard",
  "quotes.view", "quotes.create",
  "sales.view",
  "customers.view", "customers.create",
  "products.view", "products.create",
  "channels.view", "channels.create", "channels.update",
  "conversations.view",
  "users.view", "users.create", "users.update",
  "agent.chat", "agent.configure", "agent.assistant",
  "internalAssistant.chat",
  "tenants.updateMe",
] as const;

function capabilities(): MeCapabilities {
  const byDomain: Record<CapabilityDomain, { code: string; module: string; name: string; description: string; kind: string }[]> = {
    COMMERCIAL: ALL_CODES.map((code) => ({ code, module: "comercial", name: code, description: "Mock de revisión", kind: "feature" })),
    ADMINISTRATION: [],
    SUPER_ADMIN: [],
  };
  return {
    planKey: "ENTERPRISE",
    role: "TENANT_ADMIN",
    totalCapabilities: ALL_CODES.length,
    codes: [...ALL_CODES],
    byDomain,
  };
}

function superAdminSummary(): SuperAdminDashboardSummary {
  return {
    tenants: { total: 42, active: 31 },
    users: { total: 128 },
    sales: { total: 518, amount: 4500000 },
    quotes: { total: 86 },
  };
}

function tenantSummary(): TenantDashboardSummary {
  return {
    quotes: { total: 86, sent: 60, accepted: 22 },
    sales: { total: 74, amount: 1250000 },
    customers: { total: 312 },
    products: { total: 120 },
    agents: { total: 4 },
    conversionRate: 0.26,
  };
}

function agentSummary(): AgentDashboardSummary {
  return {
    quotes: { total: 86, pending: 30, accepted: 22 },
    sales: { total: 74, amount: 1250000 },
    customers: { total: 312 },
    conversionRate: 0.26,
  };
}

interface Row {
  id: string;
  name: string;
  email?: string;
  status?: string;
  createdAt: string;
  amount?: number;
  currency?: string;
  plan?: string;
}

const MOCK_ROWS: Row[] = [
  { id: "1", name: "Cliente Demo 1", email: "cliente1@demo.com", status: "ACTIVE", createdAt: "2026-01-12", amount: 1250000, currency: "COP", plan: "PRO" },
  { id: "2", name: "Cliente Demo 2", email: "cliente2@demo.com", status: "ACTIVE", createdAt: "2026-02-03", amount: 450000, currency: "COP", plan: "STARTER" },
  { id: "3", name: "Cliente Demo 3", email: "cliente3@demo.com", status: "INACTIVE", createdAt: "2026-03-21", amount: 890000, currency: "COP", plan: "FREE" },
];

function tenantMe(): Record<string, unknown> {
  return {
    id: "t-1",
    name: "Tenant de Revisión",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    currency: "COP",
    timezone: "America/Bogota",
    country: "CO",
  };
}

function agentConfig(): Record<string, unknown> {
  return {
    name: "Agente Comercial",
    model: "gpt-4o-mini",
    temperature: 0.4,
    prompt: "Eres el agente comercial de QuoPilot.",
  };
}

export async function reviewResponse<T>(path: string): Promise<T> {
  const p = path.split("?")[0];

  if (p === "/api/me/capabilities") return capabilities() as T;
  if (p === "/api/super-admin/dashboard/summary") return superAdminSummary() as T;
  if (p === "/api/tenant/dashboard/summary") return tenantSummary() as T;
  if (p === "/api/agent/dashboard/summary") return agentSummary() as T;
  if (p.endsWith("/tenants/me")) return tenantMe() as T;
  if (p === "/api/agent/config") return agentConfig() as T;

  // Listas principales → data representativa
  if (/\/api\/(quotes|sales|customers|products|channels|conversations|users)$/.test(p)) {
    return MOCK_ROWS.slice(0, p.includes("users") ? 6 : 4) as T;
  }

  // Cualquier otra ruta → array vacío (listas vacías / EmptyState).
  return [] as T;
}
