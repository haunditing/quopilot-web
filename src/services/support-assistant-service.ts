import { apiRequest } from "../lib/api.js";
import type {
  SendSupportMessageResponse,
  SupportAssistantConfig,
  SupportAssistantConfigInput,
  SupportCase,
  SupportKnowledgeDoc,
  SupportMessage,
  SupportMetrics,
  Plan,
  PlanAppFeature,
  PlanCapabilityMatrix,
  PlanInput,
  ToolPermission,
  AppCapability,
  AppUsageLimit,
} from "../types/support-assistant.js";

export const SUPPORT_ASSISTANT_ENDPOINT = "/api/support/assistant";
export const SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT = "/api/super-admin/support/assistant";
export const SUPER_ADMIN_PLANS_ENDPOINT = "/api/super-admin/plans";
export const SUPER_ADMIN_ASSISTANT_CAPABILITIES_ENDPOINT = "/api/super-admin/assistant-capabilities";
export const SUPER_ADMIN_FEATURES_ENDPOINT = "/api/admin/features";
export const SUPER_ADMIN_CAPABILITIES_ENDPOINT = "/api/admin/capabilities";

export async function getSupportMessages(): Promise<SupportMessage[]> {
  return apiRequest<SupportMessage[]>(`${SUPPORT_ASSISTANT_ENDPOINT}/messages`, {
    method: "GET",
  });
}

export async function sendSupportMessage(
  content: string,
): Promise<SendSupportMessageResponse> {
  return apiRequest<SendSupportMessageResponse>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export async function resetSupportConversation(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`${SUPPORT_ASSISTANT_ENDPOINT}/reset`, {
    method: "POST",
  });
}

export async function getSupportMetrics(): Promise<SupportMetrics> {
  return apiRequest<SupportMetrics>(`${SUPPORT_ASSISTANT_ENDPOINT}/metrics`, {
    method: "GET",
  });
}

export async function getSupportConfig(): Promise<SupportAssistantConfig> {
  return apiRequest<SupportAssistantConfig>(
    `${SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT}/config`,
    { method: "GET" },
  );
}

export async function updateSupportConfig(
  input: SupportAssistantConfigInput,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`${SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT}/config`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function listKnowledgeDocs(): Promise<SupportKnowledgeDoc[]> {
  return apiRequest<SupportKnowledgeDoc[]>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge`,
    { method: "GET" },
  );
}

export async function createKnowledgeDoc(input: {
  title: string;
  module: string;
  summary?: string;
  content: string;
  keywords?: string[];
  enabled?: boolean;
}): Promise<SupportKnowledgeDoc> {
  return apiRequest<SupportKnowledgeDoc>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function updateKnowledgeDoc(
  docId: string,
  input: {
    title?: string;
    module?: string;
    summary?: string;
    content?: string;
    keywords?: string[];
    enabled?: boolean;
  },
): Promise<SupportKnowledgeDoc> {
  return apiRequest<SupportKnowledgeDoc>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge/${docId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export async function deleteKnowledgeDoc(docId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge/${docId}`,
    { method: "DELETE" },
  );
}

export async function listSupportCases(): Promise<SupportCase[]> {
  return apiRequest<SupportCase[]>(`${SUPPORT_ASSISTANT_ENDPOINT}/cases`, {
    method: "GET",
  });
}

export async function createSupportCase(input: {
  title: string;
  module: string;
  problem: string;
  solution: string;
  keywords?: string[];
  status?: "RESOLVED" | "VERIFIED";
}): Promise<SupportCase> {
  return apiRequest<SupportCase>(`${SUPPORT_ASSISTANT_ENDPOINT}/cases`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSupportCase(
  caseId: string,
  input: {
    title?: string;
    module?: string;
    problem?: string;
    solution?: string;
    keywords?: string[];
    status?: "RESOLVED" | "VERIFIED";
  },
): Promise<SupportCase> {
  return apiRequest<SupportCase>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/cases/${caseId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export async function confirmSupportCase(caseId: string): Promise<SupportCase> {
  return apiRequest<SupportCase>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/cases/${caseId}/confirm`,
    { method: "POST" },
  );
}

export async function deleteSupportCase(caseId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/cases/${caseId}`,
    { method: "DELETE" },
  );
}

export async function listPlans(): Promise<Plan[]> {
  return apiRequest<Plan[]>(`${SUPER_ADMIN_PLANS_ENDPOINT}`, { method: "GET" });
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  return apiRequest<Plan>(`${SUPER_ADMIN_PLANS_ENDPOINT}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePlan(key: string, input: PlanInput): Promise<Plan> {
  return apiRequest<Plan>(`${SUPER_ADMIN_PLANS_ENDPOINT}/${key}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deletePlan(key: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`${SUPER_ADMIN_PLANS_ENDPOINT}/${key}`, {
    method: "DELETE",
  });
}

export async function setDefaultPlan(key: string): Promise<Plan> {
  return apiRequest<Plan>(`${SUPER_ADMIN_PLANS_ENDPOINT}/${key}/default`, {
    method: "POST",
  });
}

export async function getPlan(key: string): Promise<Plan> {
  return apiRequest<Plan>(`${SUPER_ADMIN_PLANS_ENDPOINT}/${key}`, { method: "GET" });
}

export async function getPlanEnabledFeatures(key: string): Promise<string[]> {
  return apiRequest<string[]>(`${SUPER_ADMIN_PLANS_ENDPOINT}/${key}/features`, { method: "GET" });
}

export async function getPlanCapabilities(key: string): Promise<PlanCapabilityMatrix> {
  return apiRequest<PlanCapabilityMatrix>(
    `${SUPER_ADMIN_PLANS_ENDPOINT}/${key}/capabilities`,
    { method: "GET" },
  );
}

export async function updatePlanCapabilities(
  key: string,
  enabledCapabilities: string[],
): Promise<Plan> {
  return apiRequest<Plan>(
    `${SUPER_ADMIN_PLANS_ENDPOINT}/${key}/capabilities`,
    { method: "PUT", body: JSON.stringify({ enabledCapabilities }) },
  );
}

export async function getAppFeatures(): Promise<PlanAppFeature[]> {
  return apiRequest<PlanAppFeature[]>(`${SUPER_ADMIN_FEATURES_ENDPOINT}`, { method: "GET" });
}

export async function getAppCapabilities(): Promise<AppCapability[]> {
  return apiRequest<AppCapability[]>(`${SUPER_ADMIN_CAPABILITIES_ENDPOINT}`, { method: "GET" });
}

export async function getAssistantCapabilities(planKey: string): Promise<ToolPermission[]> {
  return apiRequest<ToolPermission[]>(
    `${SUPER_ADMIN_ASSISTANT_CAPABILITIES_ENDPOINT}/${planKey}`,
    { method: "GET" },
  );
}

export async function updateAssistantCapabilities(
  planKey: string,
  toolPermissions: ToolPermission[],
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `${SUPER_ADMIN_ASSISTANT_CAPABILITIES_ENDPOINT}/${planKey}`,
    { method: "PUT", body: JSON.stringify({ toolPermissions }) },
  );
}

export async function updateToolPermission(
  planKey: string,
  toolKey: string,
  updates: {
    allowedActions?: string[];
    executionLevel?: "READ_ONLY" | "ASSISTED_DRAFT" | "FULL_AUTOMATION";
    requiresConfirmation?: boolean;
    conditions?: Record<string, unknown>;
  },
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `${SUPER_ADMIN_ASSISTANT_CAPABILITIES_ENDPOINT}/${planKey}/tools/${toolKey}`,
    { method: "PUT", body: JSON.stringify(updates) },
  );
}

export const SUPER_ADMIN_USAGE_LIMITS_ENDPOINT = "/api/admin/usage-limits";

export async function getUsageLimits(): Promise<AppUsageLimit[]> {
  return apiRequest<AppUsageLimit[]>(SUPER_ADMIN_USAGE_LIMITS_ENDPOINT, { method: "GET" });
}