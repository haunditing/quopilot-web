import { apiRequest } from "../lib/api.js";
import type {
  ChatConversation,
  ChatConversationListResponse,
  ChatMessage,
  ConversationStatus,
  SendChatMessageResponse,
} from "../types/agent-conversation.js";

export interface GetConversationsParams {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
}

export async function getConversations({
  page = 1,
  limit = 50,
  status,
}: GetConversationsParams = {}): Promise<ChatConversationListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  return apiRequest<ChatConversationListResponse>(
    `/api/agent/conversations?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function openConversation(
  customerId: string,
): Promise<ChatConversation> {
  return apiRequest<ChatConversation>("/api/agent/conversations", {
    method: "POST",
    body: JSON.stringify({
      customerId,
      channel: "WEB_CHAT",
    }),
  });
}

export async function getConversationMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(
    `/api/agent/conversations/${conversationId}/messages`,
    {
      method: "GET",
    },
  );
}

export async function sendConversationMessage(
  conversationId: string,
  content: string,
): Promise<SendChatMessageResponse> {
  return apiRequest<SendChatMessageResponse>(
    `/api/agent/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
      }),
    },
  );
}
