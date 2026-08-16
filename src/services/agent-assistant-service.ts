import { apiRequest } from "../lib/api.js";
import type {
  AssistantMessage,
  SendAssistantMessageResponse,
} from "../types/agent-assistant.js";

export async function getAssistantMessages(): Promise<AssistantMessage[]> {
  return apiRequest<AssistantMessage[]>("/api/agent/assistant/messages", {
    method: "GET",
  });
}

export async function sendAssistantMessage(
  content: string,
): Promise<SendAssistantMessageResponse> {
  return apiRequest<SendAssistantMessageResponse>(
    "/api/agent/assistant/messages",
    {
      method: "POST",
      body: JSON.stringify({
        content,
      }),
    },
  );
}

export async function resetAssistantConversation(): Promise<{
  ok: boolean;
}> {
  return apiRequest<{ ok: boolean }>("/api/agent/assistant/reset", {
    method: "POST",
  });
}
