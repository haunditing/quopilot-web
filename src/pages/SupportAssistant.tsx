import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import StatCard from "../components/StatCard.js";
import Tabs from "../components/Tabs.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  confirmSupportCase,
  createKnowledgeDoc,
  createSupportCase,
  deleteKnowledgeDoc,
  deleteSupportCase,
  getSupportConfig,
  getSupportMetrics,
  listKnowledgeDocs,
  listSupportCases,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  setDefaultPlan,
  updateKnowledgeDoc,
  updateSupportCase,
  updateSupportConfig,
} from "../services/support-assistant-service.js";
import type {
  SupportAssistantConfig,
  SupportCase,
  SupportKnowledgeDoc,
  SupportMetrics,
  AgentToolConfig,
  Plan,
  PlanFeature,
} from "../types/support-assistant.js";
import { useToast } from "../hooks/useToast.js";
import { formatDate } from "../lib/format.js";

const LLM_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google (Gemini)" },
  { value: "openrouter", label: "OpenRouter" },
];

const PLAN_OPTIONS = [
  { value: "FREE", label: "Free" },
  { value: "STARTER", label: "Starter" },
  { value: "PRO", label: "Pro" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const CASE_STATUS_LABEL: Record<string, string> = {
  RESOLVED: "Resuelto",
  VERIFIED: "Verificado",
};

const CASE_STATUS_CLASS: Record<string, string> = {
  RESOLVED: "badge badge-success",
  VERIFIED: "badge badge-neutral",
};

const TOOL_LABELS: Record<string, string> = {
  getTenantSummary: "Resumen del tenant",
  getAgentConfig: "Configuración del agente",
  getSystemStatus: "Estado del sistema",
  getQuotes: "Consulta Cotizaciones",
  getSales: "Consulta Ventas",
  getProducts: "Consulta Productos",
  getCustomers: "Consulta Clientes",
  getChannels: "Consulta Canales",
};

const FEATURE_KEYS = [
  "support_assistant",
  "troubleshooting",
  "history",
  "knowledge_base",
  "cases",
  "tools_quotes",
  "tools_sales",
  "tools_products",
  "tools_customers",
  "tools_channels",
];

const FEATURE_LABELS: Record<string, string> = {
  support_assistant: "Asistente de Soporte",
  troubleshooting: "Troubleshooting",
  history: "Historial",
  knowledge_base: "Base de Conocimiento",
  cases: "Casos (CBR)",
  tools_quotes: "Consulta Cotizaciones",
  tools_sales: "Consulta Ventas",
  tools_products: "Consulta Productos",
  tools_customers: "Consulta Clientes",
  tools_channels: "Consulta Canales",
};

interface ConfigFormState {
  status: "ACTIVE" | "INACTIVE";
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: string;
  timeoutMs: string;
  systemPrompt: string;
  caseThreshold: string;
  ragMaxDocs: string;
  ragMinScore: string;
  memoryWindow: string;
  maxContextTokens: string;
  agentTools: AgentToolConfig[];
}

interface KnowledgeFormState {
  title: string;
  module: string;
  summary: string;
  content: string;
  keywords: string;
  enabled: boolean;
}

interface CaseFormState {
  title: string;
  module: string;
  problem: string;
  solution: string;
  keywords: string;
}

interface PlanFormState {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: string;
  features: PlanFeature[];
}

function emptyKnowledgeForm(): KnowledgeFormState {
  return { title: "", module: "", summary: "", content: "", keywords: "", enabled: true };
}

function emptyCaseForm(): CaseFormState {
  return { title: "", module: "", problem: "", solution: "", keywords: "" };
}

function emptyPlanForm(): PlanFormState {
  return {
    key: "",
    name: "",
    description: "",
    isActive: true,
    isDefault: false,
    sortOrder: "0",
    features: FEATURE_KEYS.map((key) => ({
      key,
      label: FEATURE_LABELS[key] ?? key,
      description: "",
      enabled: false,
      config: {},
    })),
  };
}

function defaultAgentTools(): AgentToolConfig[] {
  return [
    { name: "getTenantSummary", enabled: true },
    { name: "getAgentConfig", enabled: true },
    { name: "getSystemStatus", enabled: true },
    { name: "getQuotes", enabled: true, planRequired: ["PRO", "ENTERPRISE"] },
    { name: "getSales", enabled: true, planRequired: ["PRO", "ENTERPRISE"] },
    { name: "getProducts", enabled: true, planRequired: ["STARTER", "PRO", "ENTERPRISE"] },
    { name: "getCustomers", enabled: true, planRequired: ["STARTER", "PRO", "ENTERPRISE"] },
    { name: "getChannels", enabled: true, planRequired: ["PRO", "ENTERPRISE"] },
  ];
}

function keywordsToArray(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function SupportAssistant() {
  const role = getUserRole();

  if (role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <SupportAssistantPanel />;
}

function SupportAssistantPanel() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("config");

  const [config, setConfig] = useState<SupportAssistantConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");

  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);

  const [docs, setDocs] = useState<SupportKnowledgeDoc[] | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState("");

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");

  const [configForm, setConfigForm] = useState<ConfigFormState>({
    status: "ACTIVE",
    provider: "",
    apiKey: "",
    model: "",
    baseUrl: "",
    maxTokens: "1024",
    timeoutMs: "30000",
    systemPrompt: "",
    caseThreshold: "0.55",
    ragMaxDocs: "3",
    ragMinScore: "0.3",
    memoryWindow: "8",
    maxContextTokens: "6000",
    agentTools: defaultAgentTools(),
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaveError, setConfigSaveError] = useState("");

  const [knowledgeModalOpen, setKnowledgeModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SupportKnowledgeDoc | null>(null);
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeFormState>(emptyKnowledgeForm());
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");

  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<SupportCase | null>(null);
  const [caseForm, setCaseForm] = useState<CaseFormState>(emptyCaseForm());
  const [caseSaving, setCaseSaving] = useState(false);
  const [caseError, setCaseError] = useState("");

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm());
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState("");

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError("");

    try {
      const data = await getSupportConfig();

      setConfig(data);
      setConfigForm({
        status: data.status,
        provider: data.llm.provider,
        apiKey: data.llm.hasApiKey ? "••••••••" : "",
        model: data.llm.model,
        baseUrl: data.llm.baseUrl,
        maxTokens: String(data.llm.maxTokens),
        timeoutMs: String(data.llm.timeoutMs),
        systemPrompt: data.systemPrompt,
        caseThreshold: String(data.caseThreshold),
        ragMaxDocs: String(data.ragMaxDocs),
        ragMinScore: String(data.ragMinScore),
        memoryWindow: String(data.memoryWindow),
        maxContextTokens: String(data.maxContextTokens),
        agentTools: data.agentTools ?? defaultAgentTools(),
      });
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "No fue posible cargar la config");
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      setMetrics(await getSupportMetrics());
    } catch {
      setMetrics(null);
    }
  }, []);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    setDocsError("");

    try {
      setDocs(await listKnowledgeDocs());
    } catch (error) {
      setDocsError(error instanceof Error ? error.message : "No fue posible cargar la KB");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadCases = useCallback(async () => {
    setCasesLoading(true);
    setCasesError("");

    try {
      setCases(await listSupportCases());
    } catch (error) {
      setCasesError(error instanceof Error ? error.message : "No fue posible cargar los casos");
    } finally {
      setCasesLoading(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError("");

    try {
      setPlans(await listPlans());
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "No fue posible cargar los planes");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      await loadConfig();
      await loadMetrics();
      await loadDocs();
      await loadCases();
      await loadPlans();
    }
    void loadAll();
  }, [loadConfig, loadMetrics, loadDocs, loadCases, loadPlans]);

  function handleTabChange(id: string) {
    setActiveTab(id);
  }

  function updateToolConfig(name: string, enabled: boolean) {
    setConfigForm((current) => ({
      ...current,
      agentTools: current.agentTools.map((tool) =>
        tool.name === name ? { ...tool, enabled } : tool
      ),
    }));
  }

  function updateToolPlanRequired(name: string, plans: string[]) {
    setConfigForm((current) => ({
      ...current,
      agentTools: current.agentTools.map((tool) =>
        tool.name === name ? { ...tool, planRequired: plans } : tool
      ),
    }));
  }

  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigSaving(true);
    setConfigSaveError("");

    try {
      await updateSupportConfig({
        status: configForm.status,
        llm: {
          provider: configForm.provider || undefined,
          apiKey: configForm.apiKey && configForm.apiKey !== "••••••••" ? configForm.apiKey : undefined,
          model: configForm.model || undefined,
          baseUrl: configForm.baseUrl || undefined,
          maxTokens: configForm.maxTokens ? Number(configForm.maxTokens) : undefined,
          timeoutMs: configForm.timeoutMs ? Number(configForm.timeoutMs) : undefined,
        },
        systemPrompt: configForm.systemPrompt || undefined,
        caseThreshold: configForm.caseThreshold ? Number(configForm.caseThreshold) : undefined,
        ragMaxDocs: configForm.ragMaxDocs ? Number(configForm.ragMaxDocs) : undefined,
        ragMinScore: configForm.ragMinScore ? Number(configForm.ragMinScore) : undefined,
        memoryWindow: configForm.memoryWindow ? Number(configForm.memoryWindow) : undefined,
        maxContextTokens: configForm.maxContextTokens ? Number(configForm.maxContextTokens) : undefined,
        agentTools: configForm.agentTools,
      });

      toast.success("Configuración actualizada");
      await loadConfig();
    } catch (error) {
      setConfigSaveError(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setConfigSaving(false);
    }
  }

  function openKnowledgeModal(doc?: SupportKnowledgeDoc) {
    setEditingDoc(doc ?? null);
    setKnowledgeError("");
    setKnowledgeForm(
      doc
        ? {
            title: doc.title,
            module: doc.module,
            summary: doc.summary,
            content: doc.content,
            keywords: doc.keywords.join(", "),
            enabled: doc.enabled,
          }
        : emptyKnowledgeForm(),
    );
    setKnowledgeModalOpen(true);
  }

  async function handleSaveKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKnowledgeSaving(true);
    setKnowledgeError("");

    const payload = {
      title: knowledgeForm.title.trim(),
      module: knowledgeForm.module.trim(),
      summary: knowledgeForm.summary.trim() || undefined,
      content: knowledgeForm.content,
      keywords: keywordsToArray(knowledgeForm.keywords),
      enabled: knowledgeForm.enabled,
    };

    try {
      if (editingDoc) {
        await updateKnowledgeDoc(editingDoc._id, payload);
        toast.success("Documento actualizado");
      } else {
        await createKnowledgeDoc(payload);
        toast.success("Documento creado");
      }

      setKnowledgeModalOpen(false);
      await loadDocs();
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setKnowledgeSaving(false);
    }
  }

  async function handleDeleteKnowledge(doc: SupportKnowledgeDoc) {
    try {
      await deleteKnowledgeDoc(doc._id);
      toast.success("Documento eliminado");
      await loadDocs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar");
    }
  }

  function openCaseModal(caseDoc?: SupportCase) {
    setEditingCase(caseDoc ?? null);
    setCaseError("");
    setCaseForm(
      caseDoc
        ? {
            title: caseDoc.title,
            module: caseDoc.module,
            problem: caseDoc.problem,
            solution: caseDoc.solution,
            keywords: caseDoc.keywords.join(", "),
          }
        : emptyCaseForm(),
    );
    setCaseModalOpen(true);
  }

  async function handleSaveCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCaseSaving(true);
    setCaseError("");

    const payload = {
      title: caseForm.title.trim(),
      module: caseForm.module.trim(),
      problem: caseForm.problem,
      solution: caseForm.solution,
      keywords: keywordsToArray(caseForm.keywords),
    };

    try {
      if (editingCase) {
        await updateSupportCase(editingCase._id, payload);
        toast.success("Caso actualizado");
      } else {
        await createSupportCase(payload);
        toast.success("Caso creado");
      }

      setCaseModalOpen(false);
      await loadCases();
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setCaseSaving(false);
    }
  }

  async function handleConfirmCase(caseDoc: SupportCase) {
    try {
      await confirmSupportCase(caseDoc._id);
      toast.success("Caso verificado");
      await loadCases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible verificar");
    }
  }

  async function handleDeleteCase(caseDoc: SupportCase) {
    try {
      await deleteSupportCase(caseDoc._id);
      toast.success("Caso eliminado");
      await loadCases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar");
    }
  }

  function openPlanModal(plan?: Plan) {
    setEditingPlan(plan ?? null);
    setPlanError("");
    setPlanForm(
      plan
        ? {
            key: plan.key,
            name: plan.name,
            description: plan.description,
            isActive: plan.isActive,
            isDefault: plan.isDefault,
            sortOrder: String(plan.sortOrder),
            features: plan.features.map((f) => ({
              key: f.key,
              label: f.label,
              description: f.description,
              enabled: f.enabled,
              config: f.config ?? {},
            })),
          }
        : emptyPlanForm(),
    );
    setPlanModalOpen(true);
  }

  function updatePlanFeature(featureKey: string, updates: Partial<PlanFeature>) {
    setPlanForm((current) => ({
      ...current,
      features: current.features.map((f) =>
        f.key === featureKey ? { ...f, ...updates } : f
      ),
    }));
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaving(true);
    setPlanError("");

    const payload = {
      key: planForm.key.trim().toUpperCase(),
      name: planForm.name.trim(),
      description: planForm.description.trim() || undefined,
      isActive: planForm.isActive,
      isDefault: planForm.isDefault,
      sortOrder: Number(planForm.sortOrder),
      features: planForm.features.map((f) => ({
        key: f.key,
        label: f.label,
        description: f.description,
        enabled: f.enabled,
        config: f.config,
      })),
    };

    try {
      if (editingPlan) {
        await updatePlan(editingPlan.key, payload);
        toast.success("Plan actualizado");
      } else {
        await createPlan(payload);
        toast.success("Plan creado");
      }

      setPlanModalOpen(false);
      await loadPlans();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setPlanSaving(false);
    }
  }

  async function handleDeletePlan(plan: Plan) {
    try {
      await deletePlan(plan.key);
      toast.success("Plan eliminado");
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar");
    }
  }

  async function handleSetDefaultPlan(plan: Plan) {
    try {
      await setDefaultPlan(plan.key);
      toast.success("Plan predeterminado actualizado");
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar");
    }
  }

  const activeConfigStatus = config?.status === "ACTIVE" ? "Asistente activo" : "Asistente inactivo";

  const tabs = [
    { id: "config", label: "Configuración" },
    { id: "plans", label: "Planes" },
    { id: "knowledge", label: "Base de conocimiento", count: docs?.length },
    { id: "cases", label: "Casos", count: cases?.length },
    { id: "metrics", label: "Métricas" },
  ];

  return (
    <main className="assistant-chat">
      <PageHeader
        title="Asistente de soporte"
        description="Centro de control del asistente interno (SUPER_ADMIN)"
      />

      <Tabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

      <div className="assistant-chat__tab-content">
        {activeTab === "config" && (
          configLoading ? (
            <LoadingOverlay title="Cargando configuración..." message="Esto puede tomar unos segundos" />
          ) : configError ? (
            <PageState kind="error" title="Error" message={configError} />
          ) : (
            <form className="settings-card settings-card__form" onSubmit={handleSaveConfig}>
              <section className="settings-card__section">
                <header className="settings-card__header">
                  <div>
                    <h2>Estado y proveedor de IA</h2>
                    <p>Activa/desactiva el asistente y configura el modelo.</p>
                  </div>
                  <span className="settings-card__badge">{activeConfigStatus}</span>
                </header>

                <div className="settings-card__grid">
                  <div className="form-field">
                    <label htmlFor="support-status">Estado</label>
                    <select
                      id="support-status"
                      value={configForm.status}
                      onChange={(event) =>
                        setConfigForm((current) => ({
                          ...current,
                          status: event.target.value as "ACTIVE" | "INACTIVE",
                        }))
                      }
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="support-provider">Proveedor</label>
                    <select
                      id="support-provider"
                      value={configForm.provider}
                      onChange={(event) =>
                        setConfigForm((current) => ({
                          ...current,
                          provider: event.target.value,
                        }))
                      }
                    >
                      <option value="">Sin proveedor (modo offline)</option>
                      {LLM_PROVIDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Field
                    id="support-model"
                    label="Modelo"
                    type="text"
                    value={configForm.model}
                    placeholder="Ej.: gpt-4o-mini"
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        model: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-api-key"
                    label="API key"
                    type="password"
                    value={configForm.apiKey}
                    placeholder="sk-..."
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        apiKey: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-base-url"
                    label="Base URL"
                    type="text"
                    value={configForm.baseUrl}
                    placeholder="Ej.: https://api.openai.com/v1"
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        baseUrl: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-max-tokens"
                    label="Máx. tokens"
                    type="number"
                    value={configForm.maxTokens}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        maxTokens: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-timeout"
                    label="Timeout (ms)"
                    type="number"
                    value={configForm.timeoutMs}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        timeoutMs: event.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="settings-card__section">
                <header className="settings-card__header">
                  <div>
                    <h2>Prompt del sistema</h2>
                    <p>Instrucciones de comportamiento del asistente.</p>
                  </div>
                </header>

                <div className="form-field">
                  <textarea
                    id="support-system-prompt"
                    rows={10}
                    value={configForm.systemPrompt}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        systemPrompt: event.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="settings-card__section">
                <header className="settings-card__header">
                  <div>
                    <h2>Razonamiento (CBR + RAG + memoria)</h2>
                    <p>Ajustes de búsqueda de casos, documentación y memoria conversacional.</p>
                  </div>
                </header>

                <div className="settings-card__grid">
                  <Field
                    id="support-case-threshold"
                    label="Umbral de caso (CBR)"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={configForm.caseThreshold}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        caseThreshold: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-rag-docs"
                    label="Docs RAG (máx.)"
                    type="number"
                    min="1"
                    max="10"
                    value={configForm.ragMaxDocs}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        ragMaxDocs: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-rag-score"
                    label="Puntaje RAG mínimo"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={configForm.ragMinScore}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        ragMinScore: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-memory-window"
                    label="Ventana de memoria (mensajes)"
                    type="number"
                    min="2"
                    max="30"
                    value={configForm.memoryWindow}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        memoryWindow: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="support-max-context"
                    label="Máx. tokens de contexto"
                    type="number"
                    min="500"
                    max="20000"
                    value={configForm.maxContextTokens}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...current,
                        maxContextTokens: event.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="settings-card__section">
                <header className="settings-card__header">
                  <div>
                    <h2>Tools del agente (por plan)</h2>
                    <p>Configura qué herramientas puede usar el asistente. Las herramientas con plan requerido solo estarán disponibles si el tenant tiene ese plan.</p>
                  </div>
                </header>

                <div className="tools-config-grid">
                  {configForm.agentTools.map((tool) => (
                    <div key={tool.name} className="tool-config-item">
                      <label className="tool-config-label">
                        <input
                          type="checkbox"
                          checked={tool.enabled}
                          onChange={(event) => updateToolConfig(tool.name, event.target.checked)}
                        />
                        <span>
                          <strong>{TOOL_LABELS[tool.name] ?? tool.name}</strong>
                          {tool.planRequired && tool.planRequired.length > 0 && (
                            <span className="tool-config-plan">
                              Requiere: {tool.planRequired.join(", ")}
                            </span>
                          )}
                        </span>
                      </label>

                      {tool.planRequired && tool.planRequired.length > 0 && (
                        <div className="tool-config-plans">
                          <label>Planes habilitados:</label>
                          {PLAN_OPTIONS.map((plan) => (
                            <label key={plan.value} className="plan-checkbox">
                              <input
                                type="checkbox"
                                checked={tool.planRequired!.includes(plan.value)}
                                onChange={(event) => {
                                  const currentPlans = tool.planRequired ?? [];
                                  const newPlans = event.target.checked
                                    ? [...currentPlans, plan.value]
                                    : currentPlans.filter((p) => p !== plan.value);
                                  updateToolPlanRequired(tool.name, newPlans);
                                }}
                              />
                              {plan.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {configSaveError && <FormMessage kind="error">{configSaveError}</FormMessage>}

              <div className="settings-card__footer">
                <Button type="submit" variant="primary" disabled={configSaving}>
                  {configSaving ? "Guardando..." : "Guardar configuración"}
                </Button>
              </div>
            </form>
          )
        )}

        {activeTab === "plans" && (
          <section className="settings-card">
            <header className="settings-card__header">
              <div>
                <h2>Administrador de Planes</h2>
                <p>Define planes con funcionalidades atómicas. Cada funcionalidad se habilita por plan.</p>
              </div>
              <Button icon="plus" iconOnly onClick={() => openPlanModal()}>Nuevo plan</Button>
            </header>

            {plansLoading ? (
              <p className="assistant-chat__state">Cargando planes...</p>
            ) : plansError ? (
              <FormMessage kind="error">{plansError}</FormMessage>
            ) : plans && plans.length > 0 ? (
              <ul className="support-admin__list">
                {plans.map((plan) => (
                  <li key={plan._id} className="support-admin__item">
                    <div className="support-admin__item-main">
                      <strong>{plan.name}</strong>
                      <span className="cell-sub">{plan.key}</span>
                      {plan.description && <span className="cell-sub">{plan.description}</span>}
                    </div>

                    <div className="support-admin__item-meta">
                      {plan.isActive ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-danger">Inactivo</span>
                      )}
                      {plan.isDefault && <span className="badge badge-info">Predeterminado</span>}
                      <span className="cell-sub">{plan.features.filter((f) => f.enabled).length} funcionalidades</span>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon-action"
                          title={plan.isDefault ? "Es predeterminado" : "Establecer como predeterminado"}
                          aria-label={plan.isDefault ? "Es predeterminado" : "Establecer como predeterminado"}
                          onClick={() => void handleSetDefaultPlan(plan)}
                          disabled={plan.isDefault}
                        >
                          {plan.isDefault ? "✓ Predeterminado" : "★ Predeterminado"}
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => openPlanModal(plan)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action btn-danger"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => void handleDeletePlan(plan)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin planes" message="Crea planes para definir las funcionalidades disponibles por tenant." />
            )}
          </section>
        )}

        {activeTab === "knowledge" && (
          <section className="settings-card">
            <header className="settings-card__header">
              <div>
                <h2>Base de conocimiento</h2>
                <p>Documentación que el asistente consulta cuando no existe un caso.</p>
              </div>
              <Button icon="plus" iconOnly onClick={() => openKnowledgeModal()}>Nuevo documento</Button>
            </header>

            {docsLoading ? (
              <p className="assistant-chat__state">Cargando documentación...</p>
            ) : docsError ? (
              <FormMessage kind="error">{docsError}</FormMessage>
            ) : docs && docs.length > 0 ? (
              <ul className="support-admin__list">
                {docs.map((doc) => (
                  <li key={doc._id} className="support-admin__item">
                    <div className="support-admin__item-main">
                      <strong>{doc.title}</strong>
                      <span className="cell-sub">{doc.module} · {doc.keywords.join(", ")}</span>
                      {doc.summary && <span className="cell-sub">{doc.summary}</span>}
                    </div>

                    <div className="support-admin__item-meta">
                      {doc.enabled ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-danger">Inactivo</span>
                      )}
                      <span className="cell-sub">{formatDate(doc.updatedAt)}</span>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon-action"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => openKnowledgeModal(doc)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action btn-danger"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => void handleDeleteKnowledge(doc)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin documentación" message="Agrega documentos para que el asistente pueda responder con conocimiento verificado." />
            )}
          </section>
        )}

        {activeTab === "cases" && (
          <section className="settings-card">
            <header className="settings-card__header">
              <div>
                <h2>Casos de soporte (CBR)</h2>
                <p>Soluciones verificadas que el asistente consulta primero.</p>
              </div>
              <Button icon="plus" iconOnly onClick={() => openCaseModal()}>Nuevo caso</Button>
            </header>

            {casesLoading ? (
              <p className="assistant-chat__state">Cargando casos...</p>
            ) : casesError ? (
              <FormMessage kind="error">{casesError}</FormMessage>
            ) : cases && cases.length > 0 ? (
              <ul className="support-admin__list">
                {cases.map((caseDoc) => (
                  <li key={caseDoc._id} className="support-admin__item">
                    <div className="support-admin__item-main">
                      <strong>{caseDoc.title}</strong>
                      <span className="cell-sub">{caseDoc.module}</span>
                      <span className="cell-sub">{caseDoc.problem}</span>
                    </div>

                    <div className="support-admin__item-meta">
                      <span className={CASE_STATUS_CLASS[caseDoc.status]}>
                        {CASE_STATUS_LABEL[caseDoc.status]}
                      </span>
                      <span className="cell-sub">{caseDoc.confirmedCount} confirmaciones</span>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon-action"
                          title="Verificar"
                          aria-label="Verificar"
                          onClick={() => void handleConfirmCase(caseDoc)}
                        >
                          Verificar
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => openCaseModal(caseDoc)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action btn-danger"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => void handleDeleteCase(caseDoc)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin casos" message="Agrega casos resueltos para que el asistente los reutilice como fuente primaria." />
            )}
          </section>
        )}

        {activeTab === "metrics" && (
          <section className="support-admin__metrics">
            {metrics ? (
              <div className="stats-grid">
                <StatCard label="Conversaciones abiertas" value={String(metrics.openConversations)} />
                <StatCard label="Mensajes totales" value={String(metrics.totalMessages)} />
                <StatCard label="Casos registrados" value={String(metrics.totalCases)} />
                <StatCard label="Casos verificados" value={String(metrics.confirmedCases)} />
                <StatCard label="Documentos KB" value={String(metrics.totalDocs)} highlight />
              </div>
            ) : (
              <FormMessage kind="info">No fue posible cargar las métricas.</FormMessage>
            )}
          </section>
        )}
      </div>

      <Modal open={knowledgeModalOpen} title={editingDoc ? "Editar documento" : "Nuevo documento"} onClose={() => setKnowledgeModalOpen(false)} panelClassName="modal__panel--wide">
        <form className="modal__form" onSubmit={handleSaveKnowledge}>
          <div className="form-card__grid">
            <Field id="kb-title" label="Título" type="text" value={knowledgeForm.title} onChange={(event) => setKnowledgeForm((current) => ({ ...current, title: event.target.value }))} required />
            <Field id="kb-module" label="Módulo" type="text" value={knowledgeForm.module} placeholder="Ej.: pdf, quotes, channels" onChange={(event) => setKnowledgeForm((current) => ({ ...current, module: event.target.value }))} required />
            <Field id="kb-keywords" label="Palabras clave" type="text" value={knowledgeForm.keywords} placeholder="separadas por coma" onChange={(event) => setKnowledgeForm((current) => ({ ...current, keywords: event.target.value }))} />
            <div className="form-field">
              <label htmlFor="kb-enabled">Estado</label>
              <select id="kb-enabled" value={knowledgeForm.enabled ? "1" : "0"} onChange={(event) => setKnowledgeForm((current) => ({ ...current, enabled: event.target.value === "1" }))}>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="kb-summary">Resumen</label>
            <textarea id="kb-summary" rows={2} value={knowledgeForm.summary} onChange={(event) => setKnowledgeForm((current) => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="kb-content">Contenido</label>
            <textarea id="kb-content" rows={8} value={knowledgeForm.content} onChange={(event) => setKnowledgeForm((current) => ({ ...current, content: event.target.value }))} required />
          </div>
          {knowledgeError && <FormMessage kind="error">{knowledgeError}</FormMessage>}
          <Button type="submit" icon="check" iconOnly disabled={knowledgeSaving}>{knowledgeSaving ? "Guardando..." : "Guardar documento"}</Button>
        </form>
      </Modal>

      <Modal open={caseModalOpen} title={editingCase ? "Editar caso" : "Nuevo caso"} onClose={() => setCaseModalOpen(false)} panelClassName="modal__panel--wide">
        <form className="modal__form" onSubmit={handleSaveCase}>
          <div className="form-card__grid">
            <Field id="case-title" label="Título" type="text" value={caseForm.title} onChange={(event) => setCaseForm((current) => ({ ...current, title: event.target.value }))} required />
            <Field id="case-module" label="Módulo" type="text" value={caseForm.module} placeholder="Ej.: pdf, quotes, users" onChange={(event) => setCaseForm((current) => ({ ...current, module: event.target.value }))} required />
            <Field id="case-keywords" label="Palabras clave" type="text" value={caseForm.keywords} placeholder="separadas por coma" onChange={(event) => setCaseForm((current) => ({ ...current, keywords: event.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="case-problem">Problema</label>
            <textarea id="case-problem" rows={4} value={caseForm.problem} onChange={(event) => setCaseForm((current) => ({ ...current, problem: event.target.value }))} required />
          </div>
          <div className="form-field">
            <label htmlFor="case-solution">Solución verificada</label>
            <textarea id="case-solution" rows={6} value={caseForm.solution} onChange={(event) => setCaseForm((current) => ({ ...current, solution: event.target.value }))} required />
          </div>
          {caseError && <FormMessage kind="error">{caseError}</FormMessage>}
          <Button type="submit" icon="check" iconOnly disabled={caseSaving}>{caseSaving ? "Guardando..." : "Guardar caso"}</Button>
        </form>
      </Modal>

      <Modal open={planModalOpen} title={editingPlan ? "Editar plan" : "Nuevo plan"} onClose={() => setPlanModalOpen(false)} panelClassName="modal__panel--wide">
        <form className="modal__form" onSubmit={handleSavePlan}>
          <div className="form-card__grid">
            <Field id="plan-key" label="Key" type="text" value={planForm.key} onChange={(event) => setPlanForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))} required disabled={!!editingPlan} />
            <Field id="plan-name" label="Nombre" type="text" value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} required />
            <Field id="plan-sort" label="Orden" type="number" value={planForm.sortOrder} onChange={(event) => setPlanForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            <div className="form-field">
              <label htmlFor="plan-active">Estado</label>
              <select id="plan-active" value={planForm.isActive ? "1" : "0"} onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.value === "1" }))}>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="plan-default">Predeterminado</label>
              <select id="plan-default" value={planForm.isDefault ? "1" : "0"} onChange={(event) => setPlanForm((current) => ({ ...current, isDefault: event.target.value === "1" }))}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="plan-desc">Descripción</label>
            <textarea id="plan-desc" rows={2} value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} />
          </div>

          <section className="settings-card__section">
            <header className="settings-card__header">
              <div>
                <h2>Funcionalidades atómicas</h2>
                <p>Configura cada funcionalidad independientemente para este plan.</p>
              </div>
            </header>

            <div className="tools-config-grid">
              {planForm.features.map((feature) => (
                <div key={feature.key} className="tool-config-item">
                  <label className="tool-config-label">
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={(event) => updatePlanFeature(feature.key, { enabled: event.target.checked })}
                    />
                    <span>
                      <strong>{feature.label}</strong>
                      {feature.description && <span className="tool-config-plan">{feature.description}</span>}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {planError && <FormMessage kind="error">{planError}</FormMessage>}
          <Button type="submit" icon="check" iconOnly disabled={planSaving}>{planSaving ? "Guardando..." : "Guardar plan"}</Button>
        </form>
      </Modal>
    </main>
  );
}