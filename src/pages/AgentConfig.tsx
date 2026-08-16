import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AssistantChat from "../components/AssistantChat.js";
import Button from "../components/Button.js";
import FloatingPanel from "../components/FloatingPanel.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import Section from "../components/Section.js";
import { useToast } from "../hooks/useToast.js";
import { getProducts } from "../services/product-service.js";
import {
  getAgentConfig,
  updateAgentConfig,
} from "../services/agent-service.js";
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
}

const TOOL_OPTIONS: ToolOption[] = [
  {
    value: "PRODUCT_SEARCH",
    label: "Búsqueda de productos",
    description: "Buscar y recomendar productos del catálogo",
  },
  {
    value: "PRODUCT_DETAILS",
    label: "Detalles de producto",
    description: "Consultar precios, descripciones y disponibilidad",
  },
  {
    value: "CUSTOMER_LOOKUP",
    label: "Identificar cliente",
    description: "Buscar clientes por nombre, email o teléfono",
  },
  {
    value: "CUSTOMER_HISTORY",
    label: "Historial del cliente",
    description: "Consultar compras y cotizaciones del cliente",
  },
  {
    value: "QUOTE_HISTORY",
    label: "Historial de cotizaciones",
    description: "Revisar cotizaciones previas del cliente",
  },
  {
    value: "QUOTE_DRAFT",
    label: "Crear cotización",
    description: "Elaborar cotizaciones en borrador",
  },
  {
    value: "SALES_HISTORY",
    label: "Historial de ventas",
    description: "Consultar ventas realizadas",
  },
  {
    value: "HUMAN_HANDOFF",
    label: "Transferir a un humano",
    description: "Derivar la conversación a un asesor",
  },
];

const TONE_OPTIONS: { value: AgentTone; label: string }[] = [
  { value: "PROFESSIONAL", label: "Profesional" },
  { value: "FRIENDLY", label: "Amigable" },
  { value: "FORMAL", label: "Formal" },
  { value: "CASUAL", label: "Casual" },
  { value: "EMPATHETIC", label: "Empático" },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
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
      maxContextTokens:
        maxContextTokens >= 1000 ? maxContextTokens : undefined,
      summarizationEnabled: form.summarizationEnabled,
    },
  };
}

export default function AgentConfig() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<AgentForm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const [agent, productResponse] = await Promise.all([
          getAgentConfig(),
          loadAllProducts(),
        ]);

        if (!cancelled) {
          setForm(agentToForm(agent));
          setProducts(productResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "No fue posible cargar la configuración",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof AgentForm>(
    key: K,
    value: AgentForm[K],
  ): void {
    setForm((current) =>
      current ? { ...current, [key]: value } : current,
    );
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
      await updateAgentConfig(formToInput(form));

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

  if (loading) {
    return (
      <PageState
        kind="loading"
        title="Cargando configuración..."
        message="Obteniendo los datos del agente de IA"
      />
    );
  }

  if (loadError || !form) {
    return (
      <PageState
        kind="error"
        title="No fue posible cargar"
        message={loadError}
      />
    );
  }

  return (
    <main className="agent-config">
      <PageHeader
        title="Agente de IA"
        description="Configura el asistente comercial virtual de tu empresa"
        actions={
          <Button
            type="submit"
            form="agent-config-form"
            icon="check"
            iconOnly
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        }
      />

      {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

      <form id="agent-config-form" className="agent-config__form" onSubmit={handleSubmit}>
        <Section
          title="Modelo de IA"
          description="Clave de API y modelo que usa el agente de este tenant"
        >
          <Field
            id="agent-llm-key"
            label="API Key"
            type="password"
            value={form.llmApiKey}
            onChange={(event) => setField("llmApiKey", event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />

          <div className="form-card__grid">
            <Field
              id="agent-llm-model"
              label="Modelo"
              type="text"
              value={form.llmModel}
              onChange={(event) => setField("llmModel", event.target.value)}
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
          </div>

          <Field
            id="agent-llm-base-url"
            label="URL base de la API"
            type="text"
            value={form.llmBaseUrl}
            onChange={(event) => setField("llmBaseUrl", event.target.value)}
            placeholder="Ej.: https://api.openai.com/v1"
          />

          <FormMessage kind="info">
            Si la clave está vacía, el agente funciona en modo demo sin
            conexión. Para respuestas reales debes configurar la API Key de tu
            tenant (no se usa una clave global del servidor).
          </FormMessage>
        </Section>

        <Section
          title="Información general"
          description="Nombre, idioma y tono del asistente"
        >
          <div className="form-card__grid">
            <Field
              id="agent-name"
              label="Nombre"
              type="text"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              required
            />

            <div className="form-field">
              <label htmlFor="agent-language">Idioma</label>

              <select
                id="agent-language"
                value={form.language}
                onChange={(event) => setField("language", event.target.value)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="agent-tone">Tono</label>

              <select
                id="agent-tone"
                value={form.tone}
                onChange={(event) =>
                  setField("tone", event.target.value as AgentTone)
                }
              >
                {TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="agent-status">Estado</label>

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
            </div>
          </div>

          <Field
            id="agent-description"
            label="Descripción"
            type="text"
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            placeholder="Breve descripción del asistente"
          />
        </Section>

        <Section
          title="Comportamiento"
          description="Personalidad, objetivos y reglas que sigue el agente"
        >
          <Field
            id="agent-personality"
            label="Personalidad"
            type="text"
            value={form.personality}
            onChange={(event) => setField("personality", event.target.value)}
            placeholder="Ej.: cercano y orientado a soluciones"
          />

          <div className="form-field">
            <label htmlFor="agent-welcome">Mensaje de bienvenida</label>

            <textarea
              id="agent-welcome"
              rows={2}
              value={form.welcomeMessage}
              onChange={(event) =>
                setField("welcomeMessage", event.target.value)
              }
              placeholder="Ej.: Hola, ¿en qué puedo ayudarte hoy?"
            />
          </div>

          <div className="form-field">
            <label htmlFor="agent-objective">Objetivo comercial</label>

            <textarea
              id="agent-objective"
              rows={2}
              value={form.commercialObjective}
              onChange={(event) =>
                setField("commercialObjective", event.target.value)
              }
              placeholder="Ej.: guiar al cliente hacia la compra o la cotización"
            />
          </div>

          <div className="form-field">
            <label htmlFor="agent-instructions">Instrucciones del sistema</label>

            <textarea
              id="agent-instructions"
              rows={4}
              value={form.systemInstructions}
              onChange={(event) =>
                setField("systemInstructions", event.target.value)
              }
              placeholder="Reglas avanzadas que el modelo debe seguir siempre"
            />
          </div>

          <div className="agent-config__rules">
            <div className="section-heading">
              <h3>Reglas de comportamiento</h3>

              <p>Reglas adicionales que debe respetar el agente</p>
            </div>

            {form.behaviorRules.length === 0 && (
              <FormMessage kind="info">Aún no hay reglas definidas</FormMessage>
            )}

            {form.behaviorRules.map((rule, index) => (
              <div key={index} className="agent-config__rule-row">
                <input
                  type="text"
                  value={rule}
                  onChange={(event) => updateRule(index, event.target.value)}
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
          </div>
        </Section>

        <Section
          title="Herramientas"
          description="Capacidades que el agente puede usar para atender clientes"
        >
          <div className="agent-config__options">
            {TOOL_OPTIONS.map((option) => (
              <label key={option.value} className="agent-config__option">
                <input
                  type="checkbox"
                  checked={form.enabledTools.includes(option.value)}
                  onChange={() => toggleTool(option.value)}
                />

                <span>
                  <strong>{option.label}</strong>

                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>

          <FormMessage kind="info">
            Si no seleccionas ninguna herramienta, todas quedan habilitadas.
          </FormMessage>

          <div className="form-field">
            <label htmlFor="agent-scope">Catálogo</label>

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

              <option value="SELECTED">Solo productos seleccionados</option>
            </select>
          </div>

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
        </Section>

        <Section
          title="Escalación"
          description="Transferencia automática de la conversación a un asesor humano"
        >
          <label className="agent-config__switch">
            <input
              type="checkbox"
              checked={form.escalationEnabled}
              onChange={(event) =>
                setField("escalationEnabled", event.target.checked)
              }
            />

            <span>Habilitar escalación</span>
          </label>

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

          <div className="form-field">
            <label htmlFor="agent-escalation-fallback">
              Mensaje de escalación
            </label>

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
          </div>
        </Section>

        <Section
          title="Memoria"
          description="Contexto que el agente recuerda de la conversación"
        >
          <label className="agent-config__switch">
            <input
              type="checkbox"
              checked={form.memoryEnabled}
              onChange={(event) => setField("memoryEnabled", event.target.checked)}
            />

            <span>Habilitar memoria</span>
          </label>

          <div className="form-card__grid">
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

          <label className="agent-config__switch">
            <input
              type="checkbox"
              checked={form.summarizationEnabled}
              onChange={(event) =>
                setField("summarizationEnabled", event.target.checked)
              }
              disabled={!form.memoryEnabled}
            />

            <span>Resumir conversaciones largas</span>
          </label>
        </Section>
      </form>

      <FloatingPanel
        icon="bot"
        ariaLabel="Abrir asistente de configuración"
      >
        <AssistantChat embedded />
      </FloatingPanel>
    </main>
  );
}
