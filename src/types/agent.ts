export type AgentTone =
  | "PROFESSIONAL"
  | "FRIENDLY"
  | "FORMAL"
  | "CASUAL"
  | "EMPATHETIC";

export type AgentTool =
  | "PRODUCT_SEARCH"
  | "PRODUCT_DETAILS"
  | "CUSTOMER_LOOKUP"
  | "CUSTOMER_HISTORY"
  | "QUOTE_HISTORY"
  | "QUOTE_DRAFT"
  | "SALES_HISTORY"
  | "HUMAN_HANDOFF";

export type AgentProductScope = "ALL" | "SELECTED";

export type AgentStatus = "ACTIVE" | "INACTIVE";

export interface AgentEscalationConfig {
  enabled: boolean;
  keywords: string[];
  fallbackMessage?: string;
}

export interface AgentMemoryConfig {
  enabled: boolean;
  messageWindow: number;
  maxContextTokens: number;
  summarizationEnabled: boolean;
}

export interface AgentLLMConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AgentConfig {
  _id: string;
  tenantId: string;

  name: string;
  avatarData?: string;
  description?: string;
  personality?: string;
  systemInstructions?: string;
  language: string;
  tone: AgentTone;
  commercialObjective?: string;
  welcomeMessage?: string;
  behaviorRules: string[];

  productScope: AgentProductScope;
  allowedProductIds: string[];

  enabledTools: AgentTool[];
  status: AgentStatus;

  escalation: AgentEscalationConfig;
  memory: AgentMemoryConfig;
  llm?: AgentLLMConfig;

  createdAt: string;
  updatedAt: string;
}

export interface AgentConfigInput {
  name?: string;
  avatarData?: string;
  description?: string;
  personality?: string;
  systemInstructions?: string;
  language?: string;
  tone?: AgentTone;
  commercialObjective?: string;
  welcomeMessage?: string;
  behaviorRules?: string[];
  productScope?: AgentProductScope;
  allowedProductIds?: string[];
  enabledTools?: AgentTool[];
  status?: AgentStatus;
  escalation?: {
    enabled?: boolean;
    keywords?: string[];
    fallbackMessage?: string;
  };
  memory?: {
    enabled?: boolean;
    messageWindow?: number;
    maxContextTokens?: number;
    summarizationEnabled?: boolean;
  };
  llm?: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    timeoutMs?: number;
  };
}
