import { apiRequest } from "../lib/api.js";
import type {
  AssistantMessage,
  SendAssistantMessageResponse,
} from "../types/agent-assistant.js";

export const AGENT_ASSISTANT_ENDPOINT = "/api/agent/assistant";
export const INTERNAL_ASSISTANT_ENDPOINT = "/api/internal/assistant";

export async function getAssistantMessages(
  endpoint = AGENT_ASSISTANT_ENDPOINT,
): Promise<AssistantMessage[]> {
  return apiRequest<AssistantMessage[]>(`${endpoint}/messages`, {
    method: "GET",
  });
}

export async function sendAssistantMessage(
  content: string,
  endpoint = AGENT_ASSISTANT_ENDPOINT,
): Promise<SendAssistantMessageResponse> {
  return apiRequest<SendAssistantMessageResponse>(
    `${endpoint}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
      }),
    },
  );
}

export async function resetAssistantConversation(
  endpoint = AGENT_ASSISTANT_ENDPOINT,
): Promise<{
  ok: boolean;
}> {
  return apiRequest<{ ok: boolean }>(`${endpoint}/reset`, {
    method: "POST",
  });
}
