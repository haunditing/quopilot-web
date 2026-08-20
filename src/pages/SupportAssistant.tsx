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
import { formatDate } from "../lib/format.js";
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
  updateKnowledgeDoc,
  updateSupportCase,
  updateSupportConfig,
  getAssistantCapabilities,
  updateAssistantCapabilities,
} from "../services/support-assistant-service.js";
import type {
  SupportAssistantConfig,
  SupportCase,
  SupportKnowledgeDoc,
  SupportMetrics,
  Plan,
  ToolPermission,
  AIToolAction,
} from "../types/support-assistant.js";
import { useToast } from "../hooks/useToast.js";

const LLM_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google (Gemini)" },
  { value: "openrouter", label: "OpenRouter" },
];

const CASE_STATUS_LABEL: Record<string, string> = {
  RESOLVED: "Resuelto",
  VERIFIED: "Verificado",
};

const CASE_STATUS_CLASS: Record<string, string> = {
  RESOLVED: "badge badge-success",
  VERIFIED: "badge badge-neutral",
};

const CAPABILITY_KEYS: AIToolAction[] = ["consult", "explain", "create", "modify", "delete", "execute"];

const AI_TOOLS = [
  { key: "tools_dashboard", label: "Dashboard" },
  { key: "tools_customers", label: "Clientes" },
  { key: "tools_products", label: "Productos" },
  { key: "tools_quotes", label: "Cotizaciones" },
  { key: "tools_sales", label: "Ventas" },
  { key: "tools_channels", label: "Canales" },
  { key: "tools_agent", label: "Agente Comercial" },
  { key: "tools_reports", label: "Reportes" },
  { key: "tools_integrations", label: "Integraciones" },
  { key: "tools_settings", label: "Configuración" },
  { key: "tools_knowledge", label: "Base de Conocimiento" },
  { key: "tools_cases", label: "Casos CBR" },
];

const CAPABILITY_LABELS: Record<string, string> = {
  consult: "Consultar",
  explain: "Explicar",
  create: "Crear",
  modify: "Modificar",
  delete: "Eliminar",
  execute: "Ejecutar",
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

function emptyKnowledgeForm(): KnowledgeFormState {
  return { title: "", module: "", summary: "", content: "", keywords: "", enabled: true };
}

function emptyCaseForm(): CaseFormState {
  return { title: "", module: "", problem: "", solution: "", keywords: "" };
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

  

const [capabilitiesModalOpen, setCapabilitiesModalOpen] = useState(false);
  const [editingCapabilitiesPlan, setEditingCapabilitiesPlan] = useState<string | null>(null);
  const [capabilitiesForm, setCapabilitiesForm] = useState<Record<string, ToolPermission[]>>({});
  const [capabilitiesSaving, setCapabilitiesSaving] = useState(false);
  const [capabilitiesError, setCapabilitiesError] = useState("");

  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);

  const [assistantCapabilities, setAssistantCapabilities] = useState<Record<string, ToolPermission[]> | null>(null);

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
    try {
      setPlans(await listPlans());
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  }, []);

  const loadCapabilities = useCallback(async () => {
    setCapabilitiesLoading(true);
    setCapabilitiesError("");

    try {
      const allPlans = await listPlans();
      const capsMap: Record<string, ToolPermission[]> = {};

      for (const plan of allPlans) {
        const caps = await getAssistantCapabilities(plan.key);
        capsMap[plan.key] = caps;
      }

      setAssistantCapabilities(capsMap);
    } catch (error) {
      setCapabilitiesError(error instanceof Error ? error.message : "No fue posible cargar capacidades");
    } finally {
      setCapabilitiesLoading(false);
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
  }, [loadConfig, loadMetrics, loadDocs, loadCases, loadPlans, loadCapabilities]);

  function handleTabChange(id: string) {
    setActiveTab(id);
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

  function openCapabilitiesModal(planKey: string) {
    const caps = assistantCapabilities?.[planKey] ?? [];
    setEditingCapabilitiesPlan(planKey);
    setCapabilitiesError("");
    setCapabilitiesForm({ [planKey]: caps.map((p) => ({ ...p, allowedActions: [...p.allowedActions] })) });
    setCapabilitiesModalOpen(true);
  }

  function updateCapability(planKey: string, toolKey: string, capability: AIToolAction, value: boolean) {
    setCapabilitiesForm((current) => {
      const planCaps = current[planKey] ?? [];
      const permIndex = planCaps.findIndex((p) => p.toolKey === toolKey);
      if (permIndex === -1) {
        const perm: ToolPermission = {
          toolKey,
          allowedActions: value ? [capability] : [],
          executionLevel: "READ_ONLY",
          requiresConfirmation: true,
        };
        return { ...current, [planKey]: [...planCaps, perm] };
      }

      const newCaps = [...planCaps];
      const currentPerm = newCaps[permIndex];
      const allowedActions = new Set(currentPerm.allowedActions);
      if (value) {
        allowedActions.add(capability);
      } else {
        allowedActions.delete(capability);
      }
      newCaps[permIndex] = {
        ...currentPerm,
        allowedActions: Array.from(allowedActions),
      };
      return { ...current, [planKey]: newCaps };
    });
  }

  function updateCapabilityExecutionLevel(planKey: string, toolKey: string, executionLevel: string) {
    setCapabilitiesForm((current) => {
      const planCaps = current[planKey] ?? [];
      const permIndex = planCaps.findIndex((p) => p.toolKey === toolKey);
      if (permIndex === -1) return current;

      const newCaps = [...planCaps];
      newCaps[permIndex] = {
        ...newCaps[permIndex],
        executionLevel: executionLevel as "READ_ONLY" | "ASSISTED_DRAFT" | "FULL_AUTOMATION",
      };
      return { ...current, [planKey]: newCaps };
    });
  }

  function updateCapabilityRequiresConfirmation(planKey: string, toolKey: string, value: boolean) {
    setCapabilitiesForm((current) => {
      const planCaps = current[planKey] ?? [];
      const permIndex = planCaps.findIndex((p) => p.toolKey === toolKey);
      if (permIndex === -1) return current;

      const newCaps = [...planCaps];
      newCaps[permIndex] = {
        ...newCaps[permIndex],
        requiresConfirmation: value,
      };
      return { ...current, [planKey]: newCaps };
    });
  }

  async function handleSaveCapabilities(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCapabilitiesSaving(true);
    setCapabilitiesError("");

    try {
      const planKey = editingCapabilitiesPlan;
      if (!planKey) return;

      const toolPermissions = capabilitiesForm[planKey] ?? [];

      await updateAssistantCapabilities(planKey, toolPermissions);
      toast.success("Capacidades actualizadas");

      setCapabilitiesModalOpen(false);
      await loadCapabilities();
    } catch (error) {
      setCapabilitiesError(
        error instanceof Error ? error.message : "No fue posible guardar",
      );
    } finally {
      setCapabilitiesSaving(false);
    }
  }

  const activeConfigStatus = config?.status === "ACTIVE" ? "Asistente activo" : "Asistente inactivo";

const tabs = [
    { id: "config", label: "Configuración" },
    { id: "capabilities", label: "Capacidades IA", count: plans?.length },
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


              {configSaveError && <FormMessage kind="error">{configSaveError}</FormMessage>}

              <div className="settings-card__footer">
                <Button type="submit" variant="primary" disabled={configSaving}>
                  {configSaving ? "Guardando..." : "Guardar configuración"}
                </Button>
              </div>
            </form>
          )
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

        {activeTab === "capabilities" && (
          <section className="settings-card">
            <header className="settings-card__header">
              <div>
                <h2>Capacidades del Asistente por Plan</h2>
                <p>Configura atómicamente qué puede hacer el asistente sobre cada funcionalidad según el plan.</p>
              </div>
            </header>

            {capabilitiesLoading ? (
              <p className="assistant-chat__state">Cargando capacidades...</p>
            ) : capabilitiesError ? (
              <FormMessage kind="error">{capabilitiesError}</FormMessage>
            ) : plans && plans.length > 0 ? (
              <div className="capabilities-admin">
                {plans.map((plan) => (
                  <div key={plan.key} className="capability-plan-card">
                    <header className="capability-plan-header">
                      <div>
                        <strong>{plan.name}</strong>
                        <span className="cell-sub">{plan.key}</span>
                        {plan.isDefault && <span className="badge badge-info">Predeterminado</span>}
                      </div>
                      <Button
                        icon="edit"
                        iconOnly
                        onClick={() => openCapabilitiesModal(plan.key)}
                        title="Editar capacidades"
                      >
                        Editar
                      </Button>
                    </header>

                    <div className="capability-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Funcionalidad</th>
                            <th>Consultar</th>
                            <th>Explicar</th>
                            <th>Crear</th>
                            <th>Modificar</th>
                            <th>Eliminar</th>
                            <th>Ejecutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {AI_TOOLS.map((tool) => {
                            const perm = assistantCapabilities?.[plan.key]?.find((p) => p.toolKey === tool.key);
                            return (
                              <tr key={tool.key}>
                                <td>
                                  <strong>{tool.label}</strong>
                                  <span className="cell-sub">{tool.key}</span>
                                </td>
                                {CAPABILITY_KEYS.map((cap) => (
                                  <td key={cap}>
                                    <label className="capability-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={perm?.allowedActions?.includes(cap) ?? false}
                                        onChange={(event) => updateCapability(plan.key, tool.key, cap, event.target.checked)}
                                      />
                                      <span>{CAPABILITY_LABELS[cap]}</span>
                                    </label>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sin planes" message="Crea planes primero para definir capacidades." />
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

      <Modal open={capabilitiesModalOpen} title={editingCapabilitiesPlan ? "Editar capacidades" : "Capacidades IA"} onClose={() => setCapabilitiesModalOpen(false)} panelClassName="modal__panel--wide">
        <form className="modal__form" onSubmit={handleSaveCapabilities}>
          <div className="capabilities-modal-grid">
            {editingCapabilitiesPlan && AI_TOOLS.map((tool) => {
              const perm = capabilitiesForm[editingCapabilitiesPlan]?.find((p) => p.toolKey === tool.key);
              return (
                <div key={tool.key} className="capability-modal-item">
                  <label className="capability-modal-label">
                    <strong>{tool.label}</strong>
                    <span className="cell-sub">{tool.key}</span>
                  </label>
                  <div className="capability-modal-checkboxes">
                    {CAPABILITY_KEYS.map((cap) => (
                      <label key={cap} className="capability-checkbox">
                        <input
                          type="checkbox"
                          checked={perm?.allowedActions?.includes(cap) ?? false}
                          onChange={(event) => updateCapability(editingCapabilitiesPlan!, tool.key, cap, event.target.checked)}
                        />
                        <span>{CAPABILITY_LABELS[cap]}</span>
                      </label>
                    ))}
                  </div>
                  <div className="capability-modal-level">
                    <label>
                      Nivel de ejecución
                      <select
                        value={perm?.executionLevel ?? "READ_ONLY"}
                        onChange={(event) => updateCapabilityExecutionLevel(editingCapabilitiesPlan!, tool.key, event.target.value)}
                      >
                        <option value="READ_ONLY">Solo Lectura</option>
                        <option value="ASSISTED_DRAFT">Borrador Asistido</option>
                        <option value="FULL_AUTOMATION">Automatización Total</option>
                      </select>
                    </label>
                    <label className="capability-checkbox">
                      <input
                        type="checkbox"
                        checked={perm?.requiresConfirmation ?? true}
                        onChange={(event) => updateCapabilityRequiresConfirmation(editingCapabilitiesPlan!, tool.key, event.target.checked)}
                      />
                      <span>Requiere confirmación</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {capabilitiesError && <FormMessage kind="error">{capabilitiesError}</FormMessage>}

          <Button type="submit" icon="check" iconOnly disabled={capabilitiesSaving}>
            {capabilitiesSaving ? "Guardando..." : "Guardar capacidades"}
          </Button>
        </form>
      </Modal>
    </main>
  );
}