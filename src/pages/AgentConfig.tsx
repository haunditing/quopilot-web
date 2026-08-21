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
    <main className="agent-config">
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
        <div className="agent-config__body">
          <div className="agent-config__main">
            <form
              id="agent-config-form"
              className="agent-config__form"
              onSubmit={handleSubmit}
            >
              <AgentConfigCard
                id="agent-modelo"
                icon="cpu"
                title="Modelo de IA"
                description="Clave de API y modelo que usa el agente de este tenant"
              >
                <div className="agent-config__grid-2">
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

                    <div className="agent-config__password">
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
                        className="agent-config__password-toggle"
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

                <div className="agent-config__grid-3">
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
                <div className="agent-config__grid-2">
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

                  <span className="agent-config__counter">
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

                  <span className="agent-config__counter">
                    {form.systemInstructions.length} / 500
                  </span>
                </FormField>

                <div className="agent-config__rules">
                  <div className="section-heading">
                    <h3>Reglas de comportamiento</h3>

                    <p>Reglas adicionales que debe respetar el agente</p>
                  </div>

                  {form.behaviorRules.length === 0 ? (
                    <div className="agent-config__rules-empty">
                      <span className="agent-config__rules-empty__icon">
                        <Icon name="settings" size={26} />
                      </span>

                      <div className="agent-config__rules-empty__text">
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
                        <div key={index} className="agent-config__rule-row">
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
                <div className="agent-config__tools">
                  {TOOL_OPTIONS.map((option) => {
                    const enabled = form.enabledTools.includes(option.value);

                    return (
                      <div
                        key={option.value}
                        className={
                          enabled
                            ? "agent-config__tool agent-config__tool--active"
                            : "agent-config__tool"
                        }
                        onClick={() => toggleTool(option.value)}
                      >
                        <span className="agent-config__tool-icon">
                          <Icon name={option.icon} size={20} />
                        </span>

                        <span className="agent-config__tool-text">
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
                  <div className="agent-config__options">
                    {products.length === 0 && (
                      <FormMessage kind="info">
                        No hay productos disponibles para seleccionar.
                      </FormMessage>
                    )}

                    {products.map((product) => (
                      <label key={product._id} className="agent-config__option">
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
                <div className="agent-config__toggle-row">
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
                <div className="agent-config__toggle-row">
                  <span>Habilitar memoria</span>

                  <Switch
                    checked={form.memoryEnabled}
                    onChange={(checked) => setField("memoryEnabled", checked)}
                    label="Habilitar memoria"
                  />
                </div>

                <div className="agent-config__grid-2">
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

                <div className="agent-config__toggle-row">
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

          <aside className="agent-config__panel">
            <nav
              className="agent-config__nav"
              aria-label="Secciones del agente"
            >
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    activeSection === tab.id
                      ? "agent-config__tab agent-config__tab--active"
                      : "agent-config__tab"
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
              className="agent-config__panel-save"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </aside>
        </div>
      )}
    </main>
  );
}
