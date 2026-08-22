import { useEffect, useMemo, useState } from "react";
import FormField from "../components/FormField.js";
import type { FormEvent } from "react";
import AgentConfigCard from "../components/AgentConfigCard.js";
import Button from "../components/Button.js";
import Combobox from "../components/Combobox.js";
import type { ComboboxOption } from "../components/Combobox.js";
import EmptyState from "../components/EmptyState.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import type { IconName } from "../components/Icon.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import SettingsTabs from "../components/SettingsTabs.js";
import Switch from "../components/Switch.js";
import { useAgentConfig } from "../hooks/useAgentConfig.js";
import { useSectionScrollSpy } from "../hooks/useSectionScrollSpy.js";
import { useToast } from "../hooks/useToast.js";
import { getProducts } from "../services/product-service.js";
import type {
  AgentConfig,
  AgentConfigInput,
  AgentProductScope,
  AgentStatus,
  AgentTone,
  AgentTool,
} from "../types/agent.js";
import type { Product } from "../types/product.js";

interface AgentForm {
  name: string;
  description: string;
  personality: string;
  systemInstructions: string;
  language: string;
  tone: AgentTone;
  commercialObjective: string;
  welcomeMessage: string;
  behaviorRules: string[];
  productScope: AgentProductScope;
  allowedProductIds: string[];
  enabledTools: AgentTool[];
  status: AgentStatus;
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  llmMaxTokens: number;
  escalationEnabled: boolean;
  escalationKeywords: string;
  escalationFallback: string;
  memoryEnabled: boolean;
  messageWindow: number;
  maxContextTokens: number;
  summarizationEnabled: boolean;
}

interface ToolOption {
  value: AgentTool;
  label: string;
  description: string;
  icon: IconName;
}

const TOOL_OPTIONS: ToolOption[] = [
  {
    value: "PRODUCT_SEARCH",
    label: "Búsqueda de productos",
    description: "Buscar y recomendar productos del catálogo",
    icon: "cart",
  },
  {
    value: "PRODUCT_DETAILS",
    label: "Detalles de producto",
    description: "Consultar precios, descripciones y disponibilidad",
    icon: "tag",
  },
  {
    value: "CUSTOMER_LOOKUP",
    label: "Identificar cliente",
    description: "Buscar clientes por nombre, email o teléfono",
    icon: "user-check",
  },
  {
    value: "CUSTOMER_HISTORY",
    label: "Historial del cliente",
    description: "Consultar compras y cotizaciones del cliente",
    icon: "history",
  },
  {
    value: "QUOTE_HISTORY",
    label: "Historial de cotizaciones",
    description: "Revisar cotizaciones previas del cliente",
    icon: "quotes",
  },
  {
    value: "QUOTE_DRAFT",
    label: "Crear cotización",
    description: "Elaborar cotizaciones en borrador",
    icon: "edit",
  },
  {
    value: "SALES_HISTORY",
    label: "Historial de ventas",
    description: "Consultar ventas realizadas",
    icon: "sales",
  },
  {
    value: "HUMAN_HANDOFF",
    label: "Transferir a un humano",
    description: "Derivar la conversación a un asesor",
    icon: "phone",
  },
];

const TONE_OPTIONS: ComboboxOption[] = [
  { value: "PROFESSIONAL", label: "Profesional", icon: "briefcase" },
  { value: "FRIENDLY", label: "Amigable", icon: "smile" },
  { value: "FORMAL", label: "Formal", icon: "star" },
  { value: "CASUAL", label: "Casual", icon: "coffee" },
  { value: "EMPATHETIC", label: "Empático", icon: "heart" },
];

const LANGUAGE_OPTIONS: ComboboxOption[] = [
  { value: "es", label: "Español", icon: "globe" },
  { value: "en", label: "Inglés", icon: "globe" },
  { value: "pt", label: "Portugués", icon: "globe" },
  { value: "fr", label: "Francés", icon: "globe" },
];

const PROVIDER_OPTIONS: ComboboxOption[] = [
  { value: "openai", label: "OpenAI", icon: "cpu" },
  { value: "google", label: "Google Gemini", icon: "cpu" },
  { value: "openrouter", label: "OpenRouter", icon: "cpu" },
  { value: "custom", label: "Custom (OpenAI compatible)", icon: "cpu" },
];

interface SectionTab {
  id: string;
  label: string;
}

const SECTION_TABS: SectionTab[] = [
  { id: "agent-modelo", label: "Modelo" },
  { id: "agent-informacion", label: "Información general" },
  { id: "agent-comportamiento", label: "Comportamiento" },
  { id: "agent-herramientas", label: "Herramientas" },
  { id: "agent-escalacion", label: "Escalación" },
  { id: "agent-memoria", label: "Memoria" },
];

function agentToForm(agent: AgentConfig): AgentForm {
  return {
    name: agent.name,
    description: agent.description ?? "",
    personality: agent.personality ?? "",
    systemInstructions: agent.systemInstructions ?? "",
    language: agent.language,
    tone: agent.tone,
    commercialObjective: agent.commercialObjective ?? "",
    welcomeMessage: agent.welcomeMessage ?? "",
    behaviorRules: agent.behaviorRules ?? [],
    productScope: agent.productScope,
    allowedProductIds: agent.allowedProductIds ?? [],
    enabledTools: agent.enabledTools ?? [],
    status: agent.status,
    llmProvider: agent.llm?.provider ?? "openai",
    llmApiKey: agent.llm?.apiKey ?? "",
    llmModel: agent.llm?.model ?? "",
    llmBaseUrl: agent.llm?.baseUrl ?? "",
    llmMaxTokens: agent.llm?.maxTokens ?? 1024,
    escalationEnabled: agent.escalation?.enabled ?? true,
    escalationKeywords: (agent.escalation?.keywords ?? []).join(", "),
    escalationFallback: agent.escalation?.fallbackMessage ?? "",
    memoryEnabled: agent.memory?.enabled ?? true,
    messageWindow: agent.memory?.messageWindow ?? 30,
    maxContextTokens: agent.memory?.maxContextTokens ?? 12000,
    summarizationEnabled: agent.memory?.summarizationEnabled ?? true,
  };
}

function splitKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

async function loadAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let page = 1;

  while (true) {
    const response = await getProducts({ page, limit: 100 });

    all.push(...response.data);

    if (all.length >= response.pagination.total) {
      break;
    }

    page += 1;
  }

  return all;
}

function formToInput(form: AgentForm): AgentConfigInput {
  const messageWindow = Number(form.messageWindow);
  const maxContextTokens = Number(form.maxContextTokens);

  return {
    name: form.name,
    description: form.description || undefined,
    personality: form.personality || undefined,
    systemInstructions: form.systemInstructions || undefined,
    language: form.language,
    tone: form.tone,
    commercialObjective: form.commercialObjective || undefined,
    welcomeMessage: form.welcomeMessage || undefined,
    behaviorRules: form.behaviorRules
      .map((rule) => rule.trim())
      .filter(Boolean),
    productScope: form.productScope,
    allowedProductIds: form.allowedProductIds,
    enabledTools: form.enabledTools,
    status: form.status,
    escalation: {
      enabled: form.escalationEnabled,
      keywords: splitKeywords(form.escalationKeywords),
      ...(form.escalationFallback
        ? { fallbackMessage: form.escalationFallback }
        : {}),
    },
    llm: {
      provider: form.llmProvider,
      ...(form.llmApiKey.trim() ? { apiKey: form.llmApiKey.trim() } : {}),
      ...(form.llmModel.trim() ? { model: form.llmModel.trim() } : {}),
      ...(form.llmBaseUrl.trim() ? { baseUrl: form.llmBaseUrl.trim() } : {}),
      ...(Number(form.llmMaxTokens) > 0
        ? { maxTokens: Number(form.llmMaxTokens) }
        : {}),
    },
    memory: {
      enabled: form.memoryEnabled,
      messageWindow: messageWindow > 0 ? messageWindow : undefined,
      maxContextTokens: maxContextTokens >= 1000 ? maxContextTokens : undefined,
      summarizationEnabled: form.summarizationEnabled,
    },
  };
}

export default function AgentConfig() {
  const toast = useToast();

  const { agent, loading, error, saveAgentConfig } = useAgentConfig();

  const [form, setForm] = useState<AgentForm | null>(null);
  const [seededAgent, setSeededAgent] = useState<AgentConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const formReady = form !== null;

  if (agent !== seededAgent) {
    setSeededAgent(agent);

    if (agent) {
      setForm(agentToForm(agent));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setProductsLoading(true);

      try {
        const productResponse = await loadAllProducts();

        if (!cancelled) {
          setProducts(productResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setSaveError(
            error instanceof Error
              ? error.message
              : "No fue posible cargar los productos",
          );
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const { activeSection, scrollToSection } = useSectionScrollSpy({
    sectionIds: useMemo(() => SECTION_TABS.map((tab) => tab.id), []),
    enabled: formReady,
  });

  function setField<K extends keyof AgentForm>(
    key: K,
    value: AgentForm[K],
  ): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleTool(tool: AgentTool): void {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const enabled = current.enabledTools.includes(tool);

      return {
        ...current,
        enabledTools: enabled
          ? current.enabledTools.filter((item) => item !== tool)
          : [...current.enabledTools, tool],
      };
    });
  }

  function toggleProduct(productId: string): void {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const allowed = current.allowedProductIds.includes(productId);

      return {
        ...current,
        allowedProductIds: allowed
          ? current.allowedProductIds.filter((item) => item !== productId)
          : [...current.allowedProductIds, productId],
      };
    });
  }

  function addRule(): void {
    setForm((current) =>
      current
        ? { ...current, behaviorRules: [...current.behaviorRules, ""] }
        : current,
    );
  }

  function updateRule(index: number, value: string): void {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const rules = [...current.behaviorRules];
      rules[index] = value;

      return { ...current, behaviorRules: rules };
    });
  }

  function removeRule(index: number): void {
    setForm((current) =>
      current
        ? {
            ...current,
            behaviorRules: current.behaviorRules.filter(
              (_rule, ruleIndex) => ruleIndex !== index,
            ),
          }
        : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    if (!form.name.trim()) {
      setSaveError("El nombre del agente es obligatorio");

      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await saveAgentConfig(formToInput(form));

      toast.success("Configuración del agente guardada");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la configuración",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="w-full max-w-none">
      <PageHeader
        title="Agente de IA"
        description="Configura el asistente comercial virtual de tu empresa"
      />

      <SettingsTabs />

      {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

      {loading || productsLoading ? (
        <LoadingOverlay
          title="Cargando configuración del agente..."
          message="Esto puede tomar unos segundos"
        />
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : !form ? (
        <EmptyState
          title="No hay canales"
          message="Conecta WhatsApp, Instagram o un chat web para atender a tus clientes"
        ></EmptyState>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6 mt-6">
          <div className="flex flex-col min-w-0">
            <form
              id="agent-config-form"
              className="flex flex-col gap-[18px]"
              onSubmit={handleSubmit}
            >
              <AgentConfigCard
                id="agent-modelo"
                icon="cpu"
                title="Modelo de IA"
                description="Clave de API y modelo que usa el agente de este tenant"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Proveedor" idFor="agent-llm-provider">

                    <Combobox
                      id="agent-llm-provider"
                      value={form.llmProvider}
                      options={PROVIDER_OPTIONS}
                      onChange={(value) => setField("llmProvider", value)}
                      placeholder="Selecciona un proveedor"
                    />
                  </FormField>

                  <FormField label="API Key" idFor="agent-llm-key">

                    <div className="relative [&>input]:pr-[92px]">
                      <input
                        id="agent-llm-key"
                        type={showApiKey ? "text" : "password"}
                        value={form.llmApiKey}
                        onChange={(event) =>
                          setField("llmApiKey", event.target.value)
                        }
                        placeholder="sk-..."
                        autoComplete="off"
                      />

                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 inline-flex items-center gap-1.5 px-3 border-0 bg-transparent text-[13px] font-semibold text-ink-muted cursor-pointer transition-colors duration-150 hover:text-accent"
                        aria-label={
                          showApiKey ? "Ocultar API Key" : "Mostrar API Key"
                        }
                        onClick={() => setShowApiKey((current) => !current)}
                      >
                        <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
                      </button>
                    </div>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field
                    id="agent-llm-model"
                    label="Modelo"
                    type="text"
                    value={form.llmModel}
                    onChange={(event) =>
                      setField("llmModel", event.target.value)
                    }
                    placeholder="Ej.: gpt-4o-mini"
                  />

                  <Field
                    id="agent-llm-max-tokens"
                    label="Máximo de tokens"
                    type="number"
                    min={1}
                    value={form.llmMaxTokens}
                    onChange={(event) =>
                      setField("llmMaxTokens", Number(event.target.value))
                    }
                  />

                  <Field
                    id="agent-llm-base-url"
                    label="URL base de la API"
                    type="text"
                    value={form.llmBaseUrl}
                    onChange={(event) =>
                      setField("llmBaseUrl", event.target.value)
                    }
                    placeholder="Ej.: https://api.openai.com/v1"
                  />
                </div>

                <FormMessage kind="info">
                  Si la clave está vacía, el agente funciona en modo demo sin
                  conexión. Para respuestas reales debes configurar la API Key
                  de tu tenant (no se usa una clave global del servidor).
                </FormMessage>
              </AgentConfigCard>

              <AgentConfigCard
                id="agent-informacion"
                icon="bot"
                title="Información general"
                description="Nombre, idioma y tono del asistente"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    id="agent-name"
                    label="Nombre"
                    type="text"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    required
                  />

                  <FormField label="Idioma" idFor="agent-language">

                    <Combobox
                      id="agent-language"
                      value={form.language}
                      options={LANGUAGE_OPTIONS}
                      onChange={(value) => setField("language", value)}
                      placeholder="Selecciona un idioma"
                    />
                  </FormField>

                  <FormField label="Tono" idFor="agent-tone">

                    <Combobox
                      id="agent-tone"
                      value={form.tone}
                      options={TONE_OPTIONS}
                      onChange={(value) => setField("tone", value as AgentTone)}
                      placeholder="Selecciona un tono"
                    />
                  </FormField>

                  <FormField label="Estado" idFor="agent-status">

                    <select
                      id="agent-status"
                      value={form.status}
                      onChange={(event) =>
                        setField("status", event.target.value as AgentStatus)
                      }
                    >
                      <option value="ACTIVE">Activo</option>

                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </FormField>
                </div>

                <Field
                  id="agent-description"
                  label="Descripción"
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    setField("description", event.target.value)
                  }
                  placeholder="Breve descripción del asistente"
                />
              </AgentConfigCard>

              <AgentConfigCard
                id="agent-comportamiento"
                icon="settings"
                title="Comportamiento"
                description="Personalidad, objetivos y reglas que sigue el agente"
              >
                <Field
                  id="agent-personality"
                  label="Personalidad"
                  type="text"
                  value={form.personality}
                  onChange={(event) =>
                    setField("personality", event.target.value)
                  }
                  placeholder="Ej.: cercano y orientado a soluciones"
                />

                <FormField label="Mensaje de bienvenida" idFor="agent-welcome">

                  <textarea
                    id="agent-welcome"
                    rows={2}
                    maxLength={500}
                    value={form.welcomeMessage}
                    onChange={(event) =>
                      setField("welcomeMessage", event.target.value)
                    }
                    placeholder="Ej.: Hola, ¿en qué puedo ayudarte hoy?"
                  />

                  <span className="self-end text-xs leading-snug text-ink-muted">
                    {form.welcomeMessage.length} / 500
                  </span>
                </FormField>

                <FormField label="Objetivo comercial" idFor="agent-objective">

                  <textarea
                    id="agent-objective"
                    rows={2}
                    value={form.commercialObjective}
                    onChange={(event) =>
                      setField("commercialObjective", event.target.value)
                    }
                    placeholder="Ej.: guiar al cliente hacia la compra o la cotización"
                  />
                </FormField>

                <FormField label="Instrucciones del sistema" idFor="agent-instructions">

                  <textarea
                    id="agent-instructions"
                    rows={4}
                    maxLength={500}
                    value={form.systemInstructions}
                    onChange={(event) =>
                      setField("systemInstructions", event.target.value)
                    }
                    placeholder="Reglas avanzadas que el modelo debe seguir siempre"
                  />

                  <span className="self-end text-xs leading-snug text-ink-muted">
                    {form.systemInstructions.length} / 500
                  </span>
                </FormField>

                <div className="flex flex-col gap-2.5 mt-5">
                  <div className="mb-4 [&>p]:mt-1 [&>p]:text-sm text-ink-muted">
                    <h3>Reglas de comportamiento</h3>

                    <p>Reglas adicionales que debe respetar el agente</p>
                  </div>

                  {form.behaviorRules.length === 0 ? (
                    <div className="flex flex-col items-start gap-4 p-5 rounded-xl border border-dashed border-line bg-accent-soft">
                      <span className="inline-flex items-center justify-center w-11 h-11 rounded-[10px] text-accent">
                        <Icon name="settings" size={26} />
                      </span>

                      <div className="flex flex-col gap-1 [&>strong]:text-[15px] [&>strong]:font-bold [&>strong]:text-ink-strong [&>p]:m-0 [&>p]:text-[13px] text-ink-muted">
                        <strong>No hay reglas de comportamiento</strong>

                        <p>
                          Agrega reglas para delimitar cómo responde el agente.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        icon="plus"
                        onClick={addRule}
                      >
                        Agregar regla
                      </Button>
                    </div>
                  ) : (
                    <>
                      {form.behaviorRules.map((rule, index) => (
                        <div key={index} className="flex flex-row items-center gap-2 [&>input]:flex-1 [&>input]:rounded-lg [&>input]:border [&>input]:border-line [&>input]:bg-surface-light [&>input]:px-2.5 [&>input]:py-2 [&>input]:text-sm [&>input]:text-ink-strong focus-within:[&>input]:outline-accent focus-within:[&>input]:outline-offset-[-1px]">
                          <input
                            type="text"
                            value={rule}
                            onChange={(event) =>
                              updateRule(index, event.target.value)
                            }
                            placeholder="Ej.: nunca inventar precios"
                            aria-label={`Regla ${index + 1}`}
                          />

                          <Button
                            type="button"
                            variant="danger"
                            icon="trash"
                            iconOnly
                            onClick={() => removeRule(index)}
                          >
                            Eliminar regla
                          </Button>
                        </div>
                      ))}

                      <div>
                        <Button
                          type="button"
                          variant="secondary"
                          icon="plus"
                          iconOnly
                          onClick={addRule}
                        >
                          Agregar regla
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </AgentConfigCard>

              <AgentConfigCard
                id="agent-herramientas"
                icon="channels"
                title="Herramientas"
                description="Capacidades que el agente puede usar para atender clientes"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TOOL_OPTIONS.map((option) => {
                    const enabled = form.enabledTools.includes(option.value);

                    return (
                      <div
                        key={option.value}
                        className={
                          enabled
                            ? "flex flex-row items-start gap-3 p-3.5 rounded-xl border border-sky-200 bg-sky-50 cursor-pointer transition-colors duration-150 hover:border-accent-border"
                            : "flex flex-row items-start gap-3 p-3.5 rounded-xl border border-line bg-surface-card cursor-pointer transition-colors duration-150 hover:border-accent-border"
                        }
                        onClick={() => toggleTool(option.value)}
                      >
                        <span className="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-accent-soft text-accent">
                          <Icon name={option.icon} size={20} />
                        </span>

                        <span className="flex flex-col gap-0.5 min-w-0 flex-1 [&>strong]:text-sm [&>strong]:font-semibold [&>strong]:text-ink-strong [&>small]:text-xs [&>small]:leading-snug text-ink-muted">
                          <strong>{option.label}</strong>

                          <small>{option.description}</small>
                        </span>

                        <span onClick={(event) => event.stopPropagation()}>
                          <Switch
                            checked={enabled}
                            onChange={() => toggleTool(option.value)}
                            label={option.label}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>

                <FormMessage kind="info">
                  Si no seleccionas ninguna herramienta, todas quedan
                  habilitadas.
                </FormMessage>

                <FormField label="Catálogo" idFor="agent-scope">

                  <select
                    id="agent-scope"
                    value={form.productScope}
                    onChange={(event) =>
                      setField(
                        "productScope",
                        event.target.value as AgentProductScope,
                      )
                    }
                  >
                    <option value="ALL">Todos los productos</option>

                    <option value="SELECTED">
                      Solo productos seleccionados
                    </option>
                  </select>
                </FormField>

                {form.productScope === "SELECTED" && (
                  <div className="grid grid-cols-1 gap-2 my-3 md:grid-cols-2">
                    {products.length === 0 && (
                      <FormMessage kind="info">
                        No hay productos disponibles para seleccionar.
                      </FormMessage>
                    )}

                    {products.map((product) => (
                      <label key={product._id} className="flex flex-row items-start gap-2.5 p-3 rounded-[10px] border border-line bg-surface-card cursor-pointer [&>input]:mt-[3px] [&>input]:accent-accent [&>span]:flex [&>span]:flex-col [&>span]:gap-0.5 [&>strong]:text-sm [&>strong]:font-semibold [&>strong]:text-ink-strong [&>small]:text-[13px] text-ink-muted">
                        <input
                          type="checkbox"
                          checked={form.allowedProductIds.includes(product._id)}
                          onChange={() => toggleProduct(product._id)}
                        />

                        <span>
                          <strong>{product.name}</strong>

                          <small>
                            {product.sku ? `${product.sku} · ` : ""}
                            {product.currency} {product.unitPrice}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </AgentConfigCard>

              <AgentConfigCard
                id="agent-escalacion"
                icon="phone"
                title="Escalación"
                description="Transferencia automática de la conversación a un asesor humano"
              >
                <div className="flex flex-row items-center justify-between gap-3 p-3.5 rounded-[10px] border border-line bg-surface-card [&>span]:text-sm [&>span]:font-semibold [&>span]:text-ink-strong">
                  <span>Habilitar escalación</span>

                  <Switch
                    checked={form.escalationEnabled}
                    onChange={(checked) =>
                      setField("escalationEnabled", checked)
                    }
                    label="Habilitar escalación"
                  />
                </div>

                <Field
                  id="agent-escalation-keywords"
                  label="Palabras clave (separadas por coma)"
                  type="text"
                  value={form.escalationKeywords}
                  onChange={(event) =>
                    setField("escalationKeywords", event.target.value)
                  }
                  placeholder="Ej.: asesor, humano, reclamar, gerente"
                  disabled={!form.escalationEnabled}
                />

                <FormField label="Mensaje de escalación" idFor="agent-escalation-fallback">

                  <textarea
                    id="agent-escalation-fallback"
                    rows={2}
                    value={form.escalationFallback}
                    onChange={(event) =>
                      setField("escalationFallback", event.target.value)
                    }
                    placeholder="Ej.: Un asesor te contactará en breve."
                    disabled={!form.escalationEnabled}
                  />
                </FormField>
              </AgentConfigCard>

              <AgentConfigCard
                id="agent-memoria"
                icon="history"
                title="Memoria"
                description="Contexto que el agente recuerda de la conversación"
              >
                <div className="flex flex-row items-center justify-between gap-3 p-3.5 rounded-[10px] border border-line bg-surface-card [&>span]:text-sm [&>span]:font-semibold [&>span]:text-ink-strong">
                  <span>Habilitar memoria</span>

                  <Switch
                    checked={form.memoryEnabled}
                    onChange={(checked) => setField("memoryEnabled", checked)}
                    label="Habilitar memoria"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    id="agent-memory-window"
                    label="Ventana de mensajes"
                    type="number"
                    min={1}
                    value={form.messageWindow}
                    onChange={(event) =>
                      setField("messageWindow", Number(event.target.value))
                    }
                    disabled={!form.memoryEnabled}
                  />

                  <Field
                    id="agent-memory-tokens"
                    label="Tope de contexto (tokens)"
                    type="number"
                    min={1000}
                    value={form.maxContextTokens}
                    onChange={(event) =>
                      setField("maxContextTokens", Number(event.target.value))
                    }
                    disabled={!form.memoryEnabled}
                  />
                </div>

                <div className="flex flex-row items-center justify-between gap-3 p-3.5 rounded-[10px] border border-line bg-surface-card [&>span]:text-sm [&>span]:font-semibold [&>span]:text-ink-strong">
                  <span>Resumir conversaciones largas</span>

                  <Switch
                    checked={form.summarizationEnabled}
                    onChange={(checked) =>
                      setField("summarizationEnabled", checked)
                    }
                    disabled={!form.memoryEnabled}
                    label="Resumir conversaciones largas"
                  />
                </div>
              </AgentConfigCard>
            </form>
          </div>

          <aside className="sticky top-5 flex flex-col gap-5 p-5 rounded-xl border border-line bg-surface-card shadow-card">
            <nav
              className="flex flex-col gap-1"
              aria-label="Secciones del agente"
            >
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    activeSection === tab.id
                      ? "flex items-center w-full px-3.5 py-2.5 rounded-lg text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 bg-accent-soft border border-accent-border !text-accent"
                      : "flex items-center w-full px-3.5 py-2.5 rounded-lg text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
                  }
                  onClick={() => scrollToSection(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <Button
              type="submit"
              form="agent-config-form"
              icon="check"
              disabled={saving}
              className="justify-center w-full"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </aside>
        </div>
      )}
    </main>
  );
}
