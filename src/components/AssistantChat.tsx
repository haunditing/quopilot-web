import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Button from "./Button.js";
import FormMessage from "./FormMessage.js";
import Icon from "./Icon.js";
import Loading from "./Loading.js";
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

  const cardClassName = ["assistant-chat__card"];

  if (className) {
    cardClassName.push(className);
  }

  if (embedded) {
    cardClassName.push("assistant-chat__card--embedded");
  }

  return (
    <section className={cardClassName.join(" ")}>
      <header className="assistant-chat__header">
        <Icon name="bot" size={20} className="assistant-chat__header-icon" />

        <div className="assistant-chat__header-info">
          <strong>{title}</strong>

          <small>{subtitle}</small>
        </div>

        <button
          type="button"
          className="assistant-chat__header-reset"
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
        <div className="assistant-chat__state">
          <Loading variant="inline" label="Cargando conversación…" />
        </div>
      ) : loadError ? (
        <div className="assistant-chat__state">
          <p>{loadError}</p>
        </div>
      ) : (
        <div className="assistant-chat__messages">
          {messages.length === 0 && !sending ? (
            <div className="assistant-chat__welcome">
              <Icon
                name="bot"
                size={32}
                className="assistant-chat__welcome-icon"
              />

              <p>{welcomeMessage}</p>

              <div className="assistant-chat__suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="assistant-chat__suggestion"
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
