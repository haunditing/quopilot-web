export type AssistantMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface AssistantMessage {
  _id: string;
  tenantId: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendAssistantMessageResponse {
  conversationId: string;
  reply: string;
}
