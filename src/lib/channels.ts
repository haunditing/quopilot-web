import { API_URL } from "./api.js";
import type {
  Channel,
  ChannelConfig,
  ChannelCredentialsInput,
  ChannelType,
  ChatWidgetPosition,
} from "../types/channel.js";

export const TYPE_LABELS: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  WEB_CHAT: "Chat Web",
  INSTAGRAM: "Instagram",
};

export const POSITION_OPTIONS: Array<{
  value: ChatWidgetPosition;
  label: string;
}> = [
  { value: "bottom-right", label: "Inferior derecha" },
  { value: "bottom-left", label: "Inferior izquierda" },
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const COLOR_PRESETS = [
  "#2563eb",
  "#0ea5e9",
  "#0d9488",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#0f172a",
];

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

export function swatchColor(value: string): string {
  const trimmed = value.trim();

  return isValidHexColor(trimmed) ? trimmed.toLowerCase() : "#2563eb";
}

export interface ChannelFormFields {
  type: ChannelType;
  phoneNumber: string;
  businessAccountId: string;
  phoneNumberId: string;
  instagramAccountId: string;
  igUserId: string;
  facebookPageId: string;
  widgetTitle: string;
  widgetGreeting: string;
  widgetColor: string;
  widgetPosition: ChatWidgetPosition;
  accessToken: string;
  webhookSecret: string;
  verifyToken: string;
}

export function buildChannelConfig(fields: ChannelFormFields): ChannelConfig {
  if (fields.type === "WHATSAPP") {
    const config: ChannelConfig = {};

    if (fields.phoneNumber.trim()) {
      config.phoneNumber = fields.phoneNumber.trim();
    }

    if (fields.businessAccountId.trim()) {
      config.businessAccountId = fields.businessAccountId.trim();
    }

    if (fields.phoneNumberId.trim()) {
      config.phoneNumberId = fields.phoneNumberId.trim();
    }

    return config;
  }

  if (fields.type === "INSTAGRAM") {
    const config: ChannelConfig = {};

    if (fields.instagramAccountId.trim()) {
      config.instagramAccountId = fields.instagramAccountId.trim();
    }

    if (fields.igUserId.trim()) {
      config.igUserId = fields.igUserId.trim();
    }

    if (fields.facebookPageId.trim()) {
      config.facebookPageId = fields.facebookPageId.trim();
    }

    return config;
  }

  const widget: NonNullable<ChannelConfig["widget"]> = {};

  if (fields.widgetTitle.trim()) {
    widget.title = fields.widgetTitle.trim();
  }

  if (fields.widgetGreeting.trim()) {
    widget.greetingMessage = fields.widgetGreeting.trim();
  }

  if (fields.widgetColor.trim() && isValidHexColor(fields.widgetColor)) {
    widget.primaryColor = fields.widgetColor.trim().toLowerCase();
  }

  widget.position = fields.widgetPosition;

  return {
    widget,
  };
}

export function buildChannelCredentials(
  fields: Pick<ChannelFormFields, "accessToken" | "webhookSecret" | "verifyToken">,
): ChannelCredentialsInput | undefined {
  const credentials: ChannelCredentialsInput = {};

  if (fields.accessToken.trim()) {
    credentials.accessToken = fields.accessToken.trim();
  }

  if (fields.webhookSecret.trim()) {
    credentials.webhookSecret = fields.webhookSecret.trim();
  }

  if (fields.verifyToken.trim()) {
    credentials.verifyToken = fields.verifyToken.trim();
  }

  return Object.keys(credentials).length > 0 ? credentials : undefined;
}

export function webhookUrlFor(channel: Channel): string | undefined {
  if (channel.type === "WEB_CHAT") {
    return undefined;
  }

  return `${API_URL}/api/webhooks/${channel.type.toLowerCase()}/${channel.id}`;
}

export function publicChatUrl(tenantId: string | undefined): string | undefined {
  if (!tenantId) {
    return undefined;
  }

  return `${window.location.origin}/public/chat/${tenantId}`;
}