import type { MeCapabilities, CapabilityDomain } from "../services/me-capabilities-service";
import type {
  AgentDashboardSummary,
  SuperAdminDashboardSummary,
  TenantDashboardSummary,
} from "../types/dashboard";
import type { ChatConversation, ChatMessage } from "../types/agent-conversation";
import type { Quote } from "../types/quote";
import type { Channel } from "../types/channel";
import type { Banner } from "../types/banner";

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
 * - Listados → envoltorio `{ data, pagination }` (igual que el backend).
 * - Conversaciones → `{ data, pagination }` + mensajes como array.
 * - Cualquier otra ruta → `[]` (listas vacías / EmptyState).
 */

export const REVIEW_COOKIE = "quopilot_review";

export function isReviewMode(): boolean {
  // Forzamos el modo mock automáticamente solo si estamos en AI Studio (.run.app)
  const isAIStudio = typeof window !== "undefined" && window.location.hostname.includes(".run.app");
  return isAIStudio || document.cookie.includes(`${REVIEW_COOKIE}=1`);
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
  _id: string;
  id?: string;
  name: string;
  email?: string;
  status?: string;
  role?: string;
  price?: number;
  currency?: string;
  plan?: string;
  channel?: string;
  createdAt: string;
}

const MOCK_ROWS: Row[] = [
  { _id: "1", id: "1", name: "Cliente Demo 1", email: "cliente1@demo.com", status: "ACTIVE", role: "AGENT", price: 1250000, currency: "COP", plan: "PRO", channel: "WHATSAPP", createdAt: "2026-01-12" },
  { _id: "2", id: "2", name: "Cliente Demo 2", email: "cliente2@demo.com", status: "ACTIVE", role: "TENANT_ADMIN", price: 450000, currency: "COP", plan: "STARTER", channel: "WEB_CHAT", createdAt: "2026-02-03" },
  { _id: "3", id: "3", name: "Cliente Demo 3", email: "cliente3@demo.com", status: "INACTIVE", role: "AGENT", price: 890000, currency: "COP", plan: "FREE", channel: "INSTAGRAM", createdAt: "2026-03-21" },
];

function paginated<T>(rows: T[]): { data: T[]; pagination: { page: number; limit: number; total: number; pages: number } } {
  return {
    data: rows,
    pagination: { page: 1, limit: 50, total: rows.length, pages: rows.length ? 1 : 0 },
  };
}

function chatConversations(): ChatConversation[] {
  return [
    {
      _id: "c1",
      tenantId: "t-1",
      customerId: "cust-1",
      channel: "WHATSAPP",
      status: "OPEN",
      assignedTo: "user-1",
      assignedAgentName: "Agente Comercial",
      lastMessageAt: "2026-08-24T10:00:00.000Z",
      customer: { id: "cust-1", name: "Carlos Pérez", phone: "+57 300 123 4567" },
      lastMessage: { content: "Hola, necesito una cotización", direction: "INBOUND", senderType: "CUSTOMER", createdAt: "2026-08-24T09:55:00.000Z" },
      createdAt: "2026-08-24T09:54:00.000Z",
      updatedAt: "2026-08-24T10:00:00.000Z",
    },
    {
      _id: "c2",
      tenantId: "t-1",
      customerId: "cust-2",
      channel: "WEB_CHAT",
      status: "OPEN",
      assignedTo: "user-2",
      assignedAgentName: "Agente Soporte",
      lastMessageAt: "2026-08-24T09:30:00.000Z",
      customer: { id: "cust-2", name: "María Gómez", email: "maria@demo.com" },
      lastMessage: { content: "¿Pueden actualizar mi factura?", direction: "OUTBOUND", senderType: "AGENT", createdAt: "2026-08-24T09:30:00.000Z" },
      createdAt: "2026-08-24T09:20:00.000Z",
      updatedAt: "2026-08-24T09:30:00.000Z",
    },
  ];
}

function chatMessages(): ChatMessage[] {
  return [
    { _id: "m1", tenantId: "t-1", conversationId: "c1", customerId: "cust-1", direction: "INBOUND", senderType: "CUSTOMER", content: "Hola, necesito una cotización", status: "SENT", createdAt: "2026-08-24T09:55:00.000Z", updatedAt: "2026-08-24T09:55:00.000Z" },
    { _id: "m2", tenantId: "t-1", conversationId: "c1", customerId: "cust-1", direction: "OUTBOUND", senderType: "AI", content: "¡Hola Carlos! Con gusto. ¿Qué producto te interesa?", status: "SENT", createdAt: "2026-08-24T09:56:00.000Z", updatedAt: "2026-08-24T09:56:00.000Z" },
    { _id: "m3", tenantId: "t-1", conversationId: "c1", customerId: "cust-1", direction: "INBOUND", senderType: "CUSTOMER", content: "El plan PRO, por favor", status: "SENT", createdAt: "2026-08-24T09:57:00.000Z", updatedAt: "2026-08-24T09:57:00.000Z" },
  ];
}

function mockQuotes(): Quote[] {
  return [
    {
      _id: "q1",
      tenantId: "t-1",
      customerId: "cust-1",
      documentType: "QUOTE",
      number: "COT-2026-001",
      items: [],
      subtotal: 1250000,
      totalDiscount: 0,
      totalTax: 190000,
      total: 1440000,
      currency: "COP",
      status: "DRAFT",
      createdAt: "2026-08-10",
      updatedAt: "2026-08-10",
    },
    {
      _id: "q2",
      tenantId: "t-1",
      customerId: "cust-2",
      documentType: "QUOTE",
      number: "COT-2026-002",
      items: [],
      subtotal: 450000,
      totalDiscount: 0,
      totalTax: 85500,
      total: 535500,
      currency: "COP",
      status: "SENT",
      createdAt: "2026-08-11",
      updatedAt: "2026-08-11",
    },
  ] as unknown as Quote[];
}

function mockChannels(): Channel[] {
  return [
    {
      id: "ch1",
      type: "WHATSAPP",
      name: "WhatsApp Comercial",
      status: "ACTIVE",
      agentId: "a1",
      config: { phoneNumber: "+573001234567", companyName: "QuoPilot" },
      credentialsConfigured: { accessToken: true, webhookSecret: false, verifyToken: false },
      createdAt: "2026-07-01",
      updatedAt: "2026-07-05",
    },
    {
      id: "ch2",
      type: "WEB_CHAT",
      name: "Chat Web",
      status: "ACTIVE",
      agentId: "a1",
      config: { companyName: "QuoPilot", primaryColor: "#6366f1" },
      credentialsConfigured: { accessToken: true, webhookSecret: false, verifyToken: false },
      createdAt: "2026-07-02",
      updatedAt: "2026-07-06",
    },
  ] as unknown as Channel[];
}

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

const REVIEW_BANNERS: Banner[] = [
  {
    id: "b-promo",
    slot: "header_global",
    type: "InlineNotice",
    priority: 50,
    conditions: [],
    props: { message: "🎉 Promoción: 20% en el primer mes con el código QUOP20" },
    active: true,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
  {
    id: "b-free",
    slot: "dashboard_top",
    type: "AlertBanner",
    priority: 100,
    conditions: [{ field: "plan", op: "eq", value: "FREE" }],
    props: {
      variant: "info",
      title: "Modo Free",
      message: "Estás en el plan gratuito. Mejora a PRO para desbloquear agentes autónomos.",
      ctaText: "Conocer planes",
      ctaUrl: "/settings/plans",
    },
    active: true,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
];

const LIST_RE = /\/api\/(customers|products|sales|users)$/;

export async function reviewResponse<T>(path: string): Promise<T> {
  const p = path.split("?")[0];

  if (p === "/api/branding") return {} as T;
  if (p === "/api/me/capabilities") return capabilities() as T;
  if (p === "/api/banners") return { banners: REVIEW_BANNERS } as T;
  if (p === "/api/super-admin/dashboard/summary") return superAdminSummary() as T;
  if (p === "/api/tenant/dashboard/summary") return tenantSummary() as T;
  if (p === "/api/agent/dashboard/summary") return agentSummary() as T;
  if (p.endsWith("/tenants/me")) return tenantMe() as T;
  if (p === "/api/agent/config") return agentConfig() as T;

  // Mensajes de una conversación (array plano)
  if (/\/api\/conversations\/[^/]+\/messages$/.test(p)) {
    return chatMessages() as T;
  }

  // Listado de conversaciones → envoltorio con forma del backend
  if (p === "/api/conversations") {
    return paginated(chatConversations()) as T;
  }

  // Cotizaciones → envoltorio con Quote[] (requieren `items`)
  if (p === "/api/quotes") {
    return paginated(mockQuotes()) as T;
  }

  // Canales → envoltorio con Channel[] (requieren `config`/`credentialsConfigured`)
  if (p === "/api/channels") {
    return paginated(mockChannels()) as T;
  }

  // Listados principales → envoltorio { data, pagination }
  if (LIST_RE.test(p)) {
    const rows = MOCK_ROWS.slice(0, 4);
    return paginated(rows) as T;
  }

  // Cualquier otra ruta → array vacío (listas vacías / EmptyState).
  return [] as T;
}
