import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Button from "./Button.js";
import FormMessage from "./FormMessage.js";
import Icon from "./Icon.js";
import Loading from "./Loading.js";
import { useBranding } from "../context/BrandingProvider.js";
import {
  AGENT_ASSISTANT_ENDPOINT,
  getAssistantMessages,
  resetAssistantConversation,
  sendAssistantMessage,
} from "../services/agent-assistant-service.js";
import type { AssistantMessage } from "../types/agent-assistant.js";
import { renderMarkdown } from "../lib/sanitize.js";

let assistantOptimisticId = 0;

function nextAssistantOptimisticId(prefix: string): string {
  assistantOptimisticId += 1;

  return `${prefix}-${assistantOptimisticId}`;
}

const DEFAULT_SUGGESTIONS: string[] = [
  "Ver la configuración actual del agente",
  "Configura la API key del modelo del agente",
  "Configura el modelo a gpt-4o-mini",
  "Cambia el tono a amigable",
  "Cambia el idioma a inglés",
  "Desactiva la herramienta de búsqueda de productos",
  "Agrega la regla: siempre saludar al cliente por su nombre",
  "Haz que el agente se llame Asistente Comercial",
];

function buildMessage(
  role: AssistantMessage["role"],
  content: string,
): AssistantMessage {
  const now = new Date().toISOString();

  return {
    _id: nextAssistantOptimisticId(role.toLowerCase()),
    tenantId: "",
    conversationId: "",
    role,
    content,
    createdAt: now,
    updatedAt: now,
  };
}

interface AssistantChatProps {
  className?: string;
  embedded?: boolean;
  endpoint?: string;
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
  placeholder?: string;
  suggestions?: string[];
}

export default function AssistantChat({
  className,
  embedded = false,
  endpoint = AGENT_ASSISTANT_ENDPOINT,
  title = "Asistente de configuración",
  subtitle = "Configura tu agente con lenguaje natural",
  welcomeMessage = "Hola, soy tu asistente de configuración. Pregúntame sobre tu agente de IA o pide cambios con lenguaje natural.",
  placeholder = "Ej.: cambia el tono del agente a amigable",
  suggestions = DEFAULT_SUGGESTIONS,
}: AssistantChatProps) {
  const { logoUrl, brandName } = useBranding();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const result = await getAssistantMessages(endpoint);

        if (!cancelled) {
          setMessages(result);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "No fue posible cargar el chat",
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
  }, [endpoint]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || sending) {
      return;
    }

    const optimisticMessage = buildMessage("USER", content);

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSendError("");
    setSending(true);

    try {
      const response = await sendAssistantMessage(content, endpoint);

      setMessages((current) => [
        ...current,
        buildMessage("ASSISTANT", response.reply),
      ]);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "No fue posible enviar",
      );
      setDraft(content);
      setMessages((current) =>
        current.filter((message) => message._id !== optimisticMessage._id),
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSuggestion(suggestion: string) {
    if (sending) {
      return;
    }

    const optimisticMessage = buildMessage("USER", suggestion);

    setMessages((current) => [...current, optimisticMessage]);
    setSendError("");
    setSending(true);

    try {
      const response = await sendAssistantMessage(suggestion, endpoint);

      setMessages((current) => [
        ...current,
        buildMessage("ASSISTANT", response.reply),
      ]);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "No fue posible enviar",
      );
      setMessages((current) =>
        current.filter((message) => message._id !== optimisticMessage._id),
      );
    } finally {
      setSending(false);
    }
  }

  async function handleReset() {
    if (resetting || sending) {
      return;
    }

    setResetting(true);
    setResetError("");

    try {
      await resetAssistantConversation(endpoint);

      setMessages([]);
    } catch (error) {
      setResetError(
        error instanceof Error ? error.message : "No fue posible limpiar",
      );
    } finally {
      setResetting(false);
    }
  }

  const cardClassName = [
    "flex flex-col border border-line rounded-2xl overflow-hidden bg-surface-card shadow-card",
    "h-[min(640px,calc(100vh-220px))]",
    className || "",
    embedded
      ? "h-auto flex-1 min-h-0 border-0 rounded-none shadow-none"
      : "mt-6",
  ];

  return (
    <section className={cardClassName.filter(Boolean).join(" ")}>
      <header className="flex items-center gap-3 px-4 py-3 bg-accent text-white">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brandName}
            className="w-9 h-9 object-contain shrink-0 rounded-lg bg-white p-0.5"
          />
        ) : (
          <span className="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-white/15">
            <Icon name="bot" size={18} />
          </span>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <strong className="text-sm font-semibold leading-snug truncate">
            {title}
          </strong>

          {subtitle && (
            <small className="text-xs text-white/85 leading-snug line-clamp-2">
              {subtitle}
            </small>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border border-white/45 bg-transparent text-white cursor-pointer transition-colors hover:bg-white/15 disabled:opacity-50 disabled:cursor-default"
          aria-label="Limpiar conversación"
          title="Limpiar conversación"
          disabled={resetting || sending || messages.length === 0}
          onClick={() => {
            void handleReset();
          }}
        >
          <Icon name="trash" size={16} />
        </button>
      </header>

      {resetError && <FormMessage kind="error">{resetError}</FormMessage>}

      {loading ? (
        <div className="flex items-center justify-center flex-1 p-6 text-sm text-center text-ink-muted">
          <Loading variant="inline" label="Cargando conversación…" />
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-center flex-1 p-6 text-sm text-center text-ink-muted">
          <p>{loadError}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1 min-h-0 p-4 overflow-y-auto bg-surface-light">
          {messages.length === 0 && !sending ? (
            <div className="flex flex-col gap-3 items-center max-w-[420px] mx-auto text-sm leading-normal text-center text-ink-muted">
              <Icon
                name="bot"
                size={32}
                className="text-accent"
              />

              <p>{welcomeMessage}</p>

              <div className="flex flex-col gap-2 w-full">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-[10px] border border-line bg-surface-card text-ink-strong font-[inherit] text-[13px] px-3 py-2.5 text-left cursor-pointer transition-colors hover:border-accent hover:text-accent disabled:opacity-60 disabled:cursor-default"
                    disabled={sending}
                    onClick={() => {
                      void handleSuggestion(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                className={
                  message.role === "USER"
                    ? "public-chat__bubble public-chat__bubble--user"
                    : "public-chat__bubble public-chat__bubble--ai"
                }
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(message.content),
                  }}
                />{" "}
              </div>
            ))
          )}

          {sending && (
            <div className="public-chat__bubble public-chat__bubble--ai public-chat__bubble--typing">
              <span className="public-chat__typing" aria-label="Escribiendo...">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>
      )}

      <form
        className="public-chat__composer"
        onSubmit={(event) => {
          void handleSend(event);
        }}
      >
        {sendError && <FormMessage kind="error">{sendError}</FormMessage>}

        <div className="public-chat__composer-row">
          <input
            type="text"
            value={draft}
            placeholder={placeholder}
            aria-label="Tu mensaje"
            onChange={(event) => setDraft(event.target.value)}
            disabled={sending || loading || Boolean(loadError)}
          />

          <Button
            type="submit"
            variant="primary"
            icon="send"
            iconOnly
            disabled={sending || !draft.trim() || loading || Boolean(loadError)}
          >
            Enviar
          </Button>
        </div>
      </form>
    </section>
  );
}
