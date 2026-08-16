import type { ChatWidgetConfig } from "./channel.js";

export type ConversationChannel = "WHATSAPP" | "WEB_CHAT" | "INSTAGRAM";

export type ConversationStatus = "OPEN" | "CLOSED";

export interface PublicChatConfigResponse {
  tenantId: string;
  tenantName: string;
  channelName?: string;
  widget?: ChatWidgetConfig;
}

export interface ChatCustomer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface ChatMessagePreview {
  content: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: "CUSTOMER" | "AI" | "AGENT" | "SYSTEM";
  createdAt: string;
}

export interface ChatConversation {
  _id: string;
  tenantId: string;
  customerId: string;
  channel: ConversationChannel;
  channelId?: string;
  status: ConversationStatus;
  assignedTo?: string;
  assignedAgentName?: string;
  lastMessageAt?: string;
  customer?: ChatCustomer;
  lastMessage?: ChatMessagePreview;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ChatConversationListResponse {
  data: ChatConversation[];
  pagination: ChatConversationPagination;
}

export interface ChatMessage {
  _id: string;
  tenantId: string;
  conversationId: string;
  customerId: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: "CUSTOMER" | "AI" | "AGENT" | "SYSTEM";
  content: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatMessageResponse {
  reply: string;
  conversationId: string;
  status: ConversationStatus;
}

export interface ChatReplyMessage {
  id: string;
  content: string;
  createdAt: string;
}

export interface ChatReplyResponse {
  message: ChatReplyMessage;
  delivered: boolean;
}

export interface PublicChatStartResponse {
  tenantId: string;
  tenantName: string;
  channelId?: string;
  channelName?: string;
  conversationId: string;
  customerId: string;
  token: string;
  reply?: string;
  conversation: ChatConversation;
}
