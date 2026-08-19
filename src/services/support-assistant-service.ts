import { apiRequest } from "../lib/api.js";
import type {
  SendSupportMessageResponse,
  SupportAssistantConfig,
  SupportAssistantConfigInput,
  SupportCase,
  SupportKnowledgeDoc,
  SupportMessage,
  SupportMetrics,
} from "../types/support-assistant.js";

export const SUPPORT_ASSISTANT_ENDPOINT = "/api/support/assistant";
export const SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT = "/api/super-admin/support/assistant";

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
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
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

export async function getSupportConfig(tenantId?: string): Promise<SupportAssistantConfig> {
  const url = tenantId
    ? `${SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT}/config?tenantId=${encodeURIComponent(tenantId)}`
    : `${SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT}/config`;
  return apiRequest<SupportAssistantConfig>(url, {
    method: "GET",
  });
}

export async function updateSupportConfig(
  input: SupportAssistantConfigInput,
  tenantId?: string,
): Promise<{ ok: boolean }> {
  const url = tenantId
    ? `${SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT}/config?tenantId=${encodeURIComponent(tenantId)}`
    : `${SUPER_ADMIN_SUPPORT_ASSISTANT_ENDPOINT}/config`;
  return apiRequest<{ ok: boolean }>(url, {
    method: "PUT",
    body: JSON.stringify({ ...input, tenantId }),
  });
}

export async function listKnowledgeDocs(tenantId?: string): Promise<SupportKnowledgeDoc[]> {
  const url = tenantId
    ? `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge?tenantId=${encodeURIComponent(tenantId)}`
    : `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge`;
  return apiRequest<SupportKnowledgeDoc[]>(url, {
    method: "GET",
  });
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
    {
      method: "POST",
      body: JSON.stringify(input),
    },
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
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteKnowledgeDoc(
  docId: string,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge/${docId}`,
    {
      method: "DELETE",
    },
  );
}

export async function listSupportCases(tenantId?: string): Promise<SupportCase[]> {
  const url = tenantId
    ? `${SUPPORT_ASSISTANT_ENDPOINT}/cases?tenantId=${encodeURIComponent(tenantId)}`
    : `${SUPPORT_ASSISTANT_ENDPOINT}/cases`;
  return apiRequest<SupportCase[]>(url, {
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
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function confirmSupportCase(
  caseId: string,
): Promise<SupportCase> {
  return apiRequest<SupportCase>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/cases/${caseId}/confirm`,
    {
      method: "POST",
    },
  );
}

export async function deleteSupportCase(
  caseId: string,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/cases/${caseId}`,
    {
      method: "DELETE",
    },
  );
}