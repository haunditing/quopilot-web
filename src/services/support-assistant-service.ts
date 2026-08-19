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

export async function getSupportConfig(): Promise<SupportAssistantConfig> {
  return apiRequest<SupportAssistantConfig>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/config`,
    {
      method: "GET",
    },
  );
}

export async function updateSupportConfig(
  input: SupportAssistantConfigInput,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`${SUPPORT_ASSISTANT_ENDPOINT}/config`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function listKnowledgeDocs(): Promise<SupportKnowledgeDoc[]> {
  return apiRequest<SupportKnowledgeDoc[]>(
    `${SUPPORT_ASSISTANT_ENDPOINT}/knowledge`,
    {
      method: "GET",
    },
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