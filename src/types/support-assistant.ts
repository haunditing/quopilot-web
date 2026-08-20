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

export type AssistantCapability =
  | "consult"
  | "explain"
  | "create"
  | "modify"
  | "delete"
  | "execute";

export type AIExecutionLevel = "READ_ONLY" | "ASSISTED_DRAFT" | "FULL_AUTOMATION";

export type AIToolAction = "consult" | "explain" | "create" | "modify" | "delete" | "execute";

export interface FunctionalityCapabilities {
  functionalityKey: string;
  capabilities: Record<AssistantCapability, boolean>;
}

export interface ToolPermission {
  toolKey: string;
  allowedActions: AIToolAction[];
  executionLevel: AIExecutionLevel;
  requiresConfirmation: boolean;
  conditions?: Record<string, unknown>;
}

export interface AssistantPlanCapabilities {
  _id: string;
  planKey: string;
  toolPermissions: ToolPermission[];
  globalDefaults: {
    defaultExecutionLevel: AIExecutionLevel;
    requireConfirmationFor: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIAssistantTool {
  _id: string;
  key: string;
  label: string;
  description: string;
  category: string;
  defaultExecutionLevel: AIExecutionLevel;
  availableActions: AIToolAction[];
  requiresConfirmation: boolean;
  isActive: boolean;
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

export interface Plan {
  _id: string;
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  enabledFeatures: string[];
  enabledCapabilities: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanInput {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  enabledFeatures?: string[];
  enabledCapabilities?: string[];
  sortOrder?: number;
}

export type CapabilityDependencyType = "OBLIGATORIA" | "OPCIONAL";

export type CapabilityStatus = "ACTIVE" | "POR_CONFIRMAR";

export type CapabilityKind =
  | "VISUALIZACION"
  | "BUSQUEDA"
  | "CONSULTA"
  | "CREACION"
  | "EDICION"
  | "ELIMINACION"
  | "CAMBIO_ESTADO"
  | "OPERACION_COMERCIAL"
  | "DOCUMENTO"
  | "COMUNICACION"
  | "CONFIGURACION"
  | "ANALISIS"
  | "IA"
  | "TECNICA"
  | "ADMINISTRACION"
  | "SEGURIDAD"
  | "AUTENTICACION";

export interface CapabilityDependency {
  code: string;
  type: CapabilityDependencyType;
}

export interface AppCapability {
  _id: string;
  module: string;
  code: string;
  name: string;
  description: string;
  kind: CapabilityKind;
  configurableByPlan: boolean;
  nonConfigurableReason?: string;
  dependencies: CapabilityDependency[];
  evidence: string;
  status: CapabilityStatus;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CapabilityEffectivenessReason =
  | "ok"
  | "feature_disabled"
  | "capability_disabled"
  | "dependency_missing"
  | "non_configurable";

export interface CapabilityMatrixEntry {
  code: string;
  module: string;
  name: string;
  description: string;
  kind: string;
  configurableByPlan: boolean;
  nonConfigurableReason?: string;
  status: string;
  dependencies: CapabilityDependency[];
  evidence: string;
  effective: boolean;
  reason: CapabilityEffectivenessReason;
}

export interface PlanCapabilityMatrix {
  planKey: string;
  featureKeys: string[];
  capabilityCodes: string[];
  entries: CapabilityMatrixEntry[];
}