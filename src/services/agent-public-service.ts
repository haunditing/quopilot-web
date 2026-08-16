import { apiRequest } from "../lib/api.js";
import type {
  ChatMessage,
  PublicChatConfigResponse,
  PublicChatStartResponse,
  SendChatMessageResponse,
} from "../types/agent-conversation.js";

export interface StartPublicChatInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  topic?: "PRICING" | "PRODUCT_INFO" | "SUPPORT" | "DEMO" | "OTHER";
  initialMessage?: string;
}

export async function getPublicChatConfig(
  tenantId: string,
): Promise<PublicChatConfigResponse> {
  return apiRequest<PublicChatConfigResponse>(
    `/api/agent/public/chat/${tenantId}/config`,
  );
}

export async function startPublicChat(
  tenantId: string,
  input: StartPublicChatInput,
): Promise<PublicChatStartResponse> {
  return apiRequest<PublicChatStartResponse>(
    `/api/agent/public/chat/${tenantId}`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function getPublicMessages(
  tenantId: string,
  conversationId: string,
  token: string,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({
    token,
  });

  return apiRequest<ChatMessage[]>(
    `/api/agent/public/chat/${tenantId}/conversations/${conversationId}/messages?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function sendPublicMessage(
  tenantId: string,
  conversationId: string,
  token: string,
  content: string,
): Promise<SendChatMessageResponse> {
  const params = new URLSearchParams({
    token,
  });

  return apiRequest<SendChatMessageResponse>(
    `/api/agent/public/chat/${tenantId}/conversations/${conversationId}/messages?${params.toString()}`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
      }),
    },
  );
}

export interface PublicTypingStatus {
  isTyping: boolean;
  senderType?: "CUSTOMER" | "AGENT";
  escalated: boolean;
  status?: "OPEN" | "CLOSED";
}

export async function getPublicTyping(
  tenantId: string,
  conversationId: string,
  token: string,
): Promise<PublicTypingStatus> {
  const params = new URLSearchParams({
    token,
  });

  return apiRequest<PublicTypingStatus>(
    `/api/agent/public/chat/${tenantId}/conversations/${conversationId}/typing?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function setPublicTyping(
  tenantId: string,
  conversationId: string,
  token: string,
  isTyping: boolean,
): Promise<void> {
  const params = new URLSearchParams({
    token,
  });

  return apiRequest<void>(
    `/api/agent/public/chat/${tenantId}/conversations/${conversationId}/typing?${params.toString()}`,
    {
      method: "POST",
      body: JSON.stringify({ isTyping }),
    },
  );
}

export async function closePublicChat(
  tenantId: string,
  conversationId: string,
  token: string,
): Promise<void> {
  const params = new URLSearchParams({
    token,
  });

  return apiRequest<void>(
    `/api/agent/public/chat/${tenantId}/conversations/${conversationId}/close?${params.toString()}`,
    {
      method: "POST",
    },
  );
}
