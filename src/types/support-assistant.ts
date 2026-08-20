export type SupportMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface SupportMessage {
  _id: string;
  tenantId: string;
  userId: string;
  conversationId: string;
  role: SupportMessageRole;
  content: string;
  meta?: {
    intent?: string;
    module?: string;
    grounded?: boolean;
    sources?: string[];
    caseId?: string;
    docIds?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface SendSupportMessageResponse {
  conversationId: string;
  reply: string;
  meta?: {
    intent?: string;
    module?: string;
    grounded?: boolean;
  };
}

export interface SupportAssistantConfig {
  status: "ACTIVE" | "INACTIVE";
  llm: {
    provider: string;
    model: string;
    baseUrl: string;
    maxTokens: number;
    timeoutMs: number;
    hasApiKey: boolean;
  };
  systemPrompt: string;
  caseThreshold: number;
  ragMaxDocs: number;
  ragMinScore: number;
  memoryWindow: number;
  maxContextTokens: number;
}

export interface SupportAssistantConfigInput {
  status?: "ACTIVE" | "INACTIVE";
  llm?: {
    provider?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    timeoutMs?: number;
  };
  systemPrompt?: string;
  caseThreshold?: number;
  ragMaxDocs?: number;
  ragMinScore?: number;
  memoryWindow?: number;
  maxContextTokens?: number;
}

export interface SupportKnowledgeDoc {
  _id: string;
  tenantId: string;
  title: string;
  module: string;
  summary: string;
  content: string;
  keywords: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportCaseStatus = "RESOLVED" | "VERIFIED";

export interface SupportCase {
  _id: string;
  tenantId: string;
  title: string;
  module: string;
  problem: string;
  solution: string;
  keywords: string[];
  status: SupportCaseStatus;
  confirmedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMetrics {
  openConversations: number;
  totalMessages: number;
  totalCases: number;
  totalDocs: number;
  confirmedCases: number;
}

export type AssistantCapability = "consult" | "explain" | "create" | "modify" | "delete" | "execute";

export interface FunctionalityCapabilities {
  functionalityKey: string;
  capabilities: Record<AssistantCapability, boolean>;
}

export interface AssistantPlanCapabilities {
  _id: string;
  planKey: string;
  functionalities: FunctionalityCapabilities[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanAppFeature {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface Plan {
  _id: string;
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  features: PlanAppFeature[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanAppFeature {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface PlanInput {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  features?: PlanAppFeature[];
  sortOrder?: number;
}

export interface AgentToolConfig {
  name: string;
  enabled: boolean;
  planRequired?: string[];
}