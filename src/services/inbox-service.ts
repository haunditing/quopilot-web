import { apiRequest } from "../lib/api.js";
import type {
  ChatConversationListResponse,
  ChatMessage,
  ChatReplyResponse,
  ConversationChannel,
  ConversationStatus,
} from "../types/agent-conversation.js";

export interface GetInboxConversationsParams {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  channel?: ConversationChannel;
}

export async function getInboxConversations({
  page = 1,
  limit = 50,
  status,
  channel,
}: GetInboxConversationsParams = {}): Promise<ChatConversationListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  if (channel) {
    params.set("channel", channel);
  }

  return apiRequest<ChatConversationListResponse>(
    `/api/conversations?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function getConversationMessages(
  conversationId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(
    `/api/conversations/${conversationId}/messages?limit=${limit}`,
    {
      method: "GET",
    },
  );
}

export async function replyToConversation(
  conversationId: string,
  content: string,
): Promise<ChatReplyResponse> {
  return apiRequest<ChatReplyResponse>(
    `/api/conversations/${conversationId}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

export async function claimConversation(
  conversationId: string,
): Promise<{ claimed: boolean }> {
  return apiRequest<{ claimed: boolean }>(
    `/api/conversations/${conversationId}/claim`,
    {
      method: "POST",
    },
  );
}

export async function reopenConversation(
  conversationId: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/api/conversations/${conversationId}/reopen`,
    {
      method: "POST",
    },
  );
}

export interface ConversationTypingStatus {
  isTyping: boolean;
  senderType?: "CUSTOMER" | "AGENT";
  escalated: boolean;
}

export async function getConversationTyping(
  conversationId: string,
): Promise<ConversationTypingStatus> {
  return apiRequest<ConversationTypingStatus>(
    `/api/conversations/${conversationId}/typing`,
    {
      method: "GET",
    },
  );
}

export async function setConversationTyping(
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  return apiRequest<void>(`/api/conversations/${conversationId}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  });
}
