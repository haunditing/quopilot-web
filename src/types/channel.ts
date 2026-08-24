export type ChannelType = "WHATSAPP" | "WEB_CHAT" | "INSTAGRAM";

export type ChannelStatus = "ACTIVE" | "INACTIVE";

export type ChatWidgetPosition = "bottom-right" | "bottom-left";

export interface ChatWidgetConfig {
  title?: string;
  greetingMessage?: string;
  primaryColor?: string;
  position?: ChatWidgetPosition;
}

export interface ChannelConfig {
  phoneNumber?: string;
  businessAccountId?: string;
  phoneNumberId?: string;
  instagramAccountId?: string;
  igUserId?: string;
  facebookPageId?: string;
  widget?: ChatWidgetConfig;
}

export interface ChannelCredentialsConfigured {
  accessToken: boolean;
  webhookSecret: boolean;
  verifyToken: boolean;
}

export interface Channel {
  id: string;
  publicToken?: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  agentId: string;
  config: ChannelConfig;
  credentialsConfigured: ChannelCredentialsConfigured;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ChannelListResponse {
  data: Channel[];
  pagination: ChannelPagination;
}

export interface ChannelCredentialsInput {
  accessToken?: string;
  webhookSecret?: string;
  verifyToken?: string;
}
