import { useCallback, useEffect, useRef, useState } from "react";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { CSSProperties, FormEvent } from "react";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import {
  closePublicChat,
  getPublicChatConfig,
  getPublicMessages,
  getPublicTyping,
  sendPublicMessage,
  setPublicTyping,
  startPublicChat,
} from "../services/agent-public-service.js";
import type {
  ChatMessage,
  PublicChatConfigResponse,
} from "../types/agent-conversation.js";
import {
  isValidEmail,
  isValidPhone,
  normalizePhoneInput,
} from "../lib/validation.js";
import { renderMarkdown } from "../lib/sanitize.js";
import { contrastTextFor } from "../lib/contrast.js";
import { useConfirm } from "../hooks/useConfirm.js";

interface StoredChat {
  conversationId: string;
  token: string;
  tenantName: string;
  channelName?: string;
}

interface PublicChatProps {
  tenantId: string;
}

let publicOptimisticId = 0;

function nextPublicOptimisticId(prefix: string): string {
  publicOptimisticId += 1;

  return `${prefix}-${publicOptimisticId}`;
}

const POLL_INTERVAL_MS = 5000;

const DEFAULT_INTRO =
  "Hola, cuéntanos quién eres y escríbenos tu mensaje. Un asistente virtual te atenderá de inmediato.";

function isOptimisticMessageId(id: string): boolean {
  return id.startsWith("optimistic-") || id.startsWith("seeded-");
}

const SENDER_LABELS: Record<
  ChatMessage["senderType"],
  { name: string; initial: string; role: string }
> = {
  AI: { name: "Demito", initial: "D", role: "Asistente virtual" },
  AGENT: { name: "Agente humano", initial: "M", role: "Atención humana" },
  CUSTOMER: { name: "Tú", initial: "", role: "Tú" },
  SYSTEM: { name: "Sistema", initial: "", role: "Notificación" },
};

function bubbleClassName(senderType: ChatMessage["senderType"]): string {
  switch (senderType) {
    case "CUSTOMER":
      return "public-chat__bubble public-chat__bubble--user";
    case "AGENT":
      return "public-chat__bubble public-chat__bubble--agent";
    case "SYSTEM":
      return "public-chat__bubble public-chat__bubble--system";
    default:
      return "public-chat__bubble public-chat__bubble--ai";
  }
}

function widgetAccentStyle(color?: string): CSSProperties | undefined {
  const trimmed = color?.trim();

  if (!trimmed || !/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return undefined;
  }

  const hex = trimmed.toLowerCase();
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return {
    "--accent": hex,
    "--accent-bg": `rgba(${r}, ${g}, ${b}, 0.1)`,
    "--accent-text": contrastTextFor(hex),
  } as CSSProperties;
}

export type ChatTopic =
  | "PRICING"
  | "PRODUCT_INFO"
  | "SUPPORT"
  | "DEMO"
  | "OTHER";

const TOPIC_OPTIONS: Array<{ value: ChatTopic; label: string }> = [
  { value: "PRICING", label: "Precios y planes" },
  { value: "PRODUCT_INFO", label: "Información de productos" },
  { value: "SUPPORT", label: "Soporte" },
  { value: "DEMO", label: "Agendar demostración" },
  { value: "OTHER", label: "Otro asunto" },
];

const TOPIC_MESSAGE_TEMPLATES: Partial<Record<ChatTopic, string>> = {
  PRICING: "Quiero información sobre precios y planes.",
  PRODUCT_INFO: "Quiero información sobre los productos y servicios.",
  SUPPORT: "Necesito soporte o ayuda con un tema.",
  DEMO: "Me gustaría agendar una demostración.",
};

function storageKey(tenantId: string): string {
  return `public-chat:${tenantId}`;
}

function readStoredChat(tenantId: string): StoredChat | null {
  try {
    const raw = sessionStorage.getItem(storageKey(tenantId));

    return raw ? (JSON.parse(raw) as StoredChat) : null;
  } catch {
    return null;
  }
}

export default function PublicChat({ tenantId }: PublicChatProps) {
  const [chat, setChat] = useState<StoredChat | null>(() =>
    readStoredChat(tenantId),
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { confirm } = useConfirm();
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState<ChatTopic | "">("");
  const [initialMessage, setInitialMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [topicError, setTopicError] = useState("");
  const [initialMessageError, setInitialMessageError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [chatConfig, setChatConfig] = useState<PublicChatConfigResponse | null>(
    null,
  );

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [closed, setClosed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<StoredChat | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  function resizeComposer() {
    const element = composerRef.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }

  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  useEffect(() => {
    let cancelled = false;

    void getPublicChatConfig(tenantId)
      .then((config) => {
        if (!cancelled) {
          setChatConfig(config);
        }
      })
      .catch(() => {
        // silencioso: la página funciona con los textos por defecto
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }

      const current = chatRef.current;

      if (current) {
        void setPublicTyping(
          tenantId,
          current.conversationId,
          current.token,
          false,
        );
      }
    };
  }, [tenantId]);

  function notifyTyping() {
    const current = chatRef.current;

    if (!current) {
      return;
    }

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = window.setTimeout(() => {
      const latest = chatRef.current;

      if (latest) {
        void setPublicTyping(
          tenantId,
          latest.conversationId,
          latest.token,
          true,
        );
      }
    }, 400);
  }

  useEffect(() => {
    if (!chat) {
      return;
    }

    const { conversationId, token } = chat;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const result = await getPublicMessages(tenantId, conversationId, token);

        if (!cancelled) {
          setMessages(result);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "No fue posible cargar la conversación",
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
  }, [chat, tenantId]);

  const reloadThread = useCallback(
    async (conversationId: string, token: string) => {
      try {
        const result = await getPublicMessages(tenantId, conversationId, token);

        setMessages(result);
      } catch {
        // silencioso: evita interrumpir la UI con errores de polling
      }
    },
    [tenantId],
  );

  useEffect(() => {
    if (!chat || sending || loading || closed) {
      return;
    }

    const { conversationId, token } = chat;

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const [result, typingResult] = await Promise.all([
            getPublicMessages(tenantId, conversationId, token),
            getPublicTyping(tenantId, conversationId, token),
          ]);

          setMessages((current) => {
            const known = new Set(
              current
                .filter((message) => !isOptimisticMessageId(message._id))
                .map((message) => message._id),
            );

            const incoming = result.filter(
              (message) => !known.has(message._id),
            );

            if (incoming.length === 0) {
              return current;
            }

            const incomingKeys = new Set(
              incoming.map(
                (message) => `${message.direction}:${message.content}`,
              ),
            );

            const reconciled = current.filter(
              (message) =>
                !isOptimisticMessageId(message._id) ||
                !incomingKeys.has(`${message.direction}:${message.content}`),
            );

            return [...reconciled, ...incoming].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
          });

          if (typingResult.status === "CLOSED") {
            setClosed(true);
            setAgentTyping(false);
            setEscalated(false);
          } else {
            setAgentTyping(
              typingResult.isTyping && typingResult.senderType === "AGENT",
            );

            setEscalated(typingResult.escalated);
          }
        } catch {
          // silencioso: el polling no debe interrumpir la UI
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [chat, tenantId, sending, loading, closed]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending, agentTyping, escalated]);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasError = false;

    if (name.trim().length < 2) {
      setNameError("Escribe tu nombre completo");
      hasError = true;
    }

    if (!isValidEmail(email.trim())) {
      setEmailError("Email inválido");
      hasError = true;
    }

    if (!isValidPhone(phone.trim())) {
      setPhoneError("Incluye el indicativo de país, ej: +573001234567");
      hasError = true;
    }

    if (!topic) {
      setTopicError("Selecciona un asunto");
      hasError = true;
    }

    if (topic === "OTHER" && !initialMessage.trim()) {
      setInitialMessageError("Escribe tu mensaje");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setStarting(true);
    setStartError("");

    try {
      const result = await startPublicChat(tenantId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim() || undefined,
        topic: topic || undefined,
        initialMessage: initialMessage.trim() || undefined,
      });

      const nextChat: StoredChat = {
        conversationId: result.conversationId,
        token: result.token,
        tenantName: result.tenantName,
        channelName: result.channelName,
      };

      sessionStorage.setItem(storageKey(tenantId), JSON.stringify(nextChat));

      const seeded: ChatMessage[] = [];

      const greetingTemplate = chatConfig?.widget?.greetingMessage?.trim();

      if (greetingTemplate) {
        seeded.push({
          _id: nextPublicOptimisticId("seeded-greeting"),
          tenantId,
          conversationId: result.conversationId,
          customerId: result.customerId,
          direction: "OUTBOUND",
          senderType: "AI",
          content: greetingTemplate.replace(/\{name\}/gi, name.trim()),
          status: "SENT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (initialMessage.trim()) {
        seeded.push({
          _id: nextPublicOptimisticId("seeded-customer"),
          tenantId,
          conversationId: result.conversationId,
          customerId: result.customerId,
          direction: "INBOUND",
          senderType: "CUSTOMER",
          content: initialMessage.trim(),
          status: "SENT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (result.reply) {
        seeded.push({
          _id: nextPublicOptimisticId("seeded-ai"),
          tenantId,
          conversationId: result.conversationId,
          customerId: result.customerId,
          direction: "OUTBOUND",
          senderType: "AI",
          content: result.reply,
          status: "SENT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setMessages(seeded);
      setChat(nextChat);
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar el chat",
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !chat || sending || closed) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      _id: nextPublicOptimisticId("optimistic"),
      tenantId,
      conversationId: chat.conversationId,
      customerId: "",
      direction: "INBOUND",
      senderType: "CUSTOMER",
      content,
      status: "SENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSendError("");
    setSending(true);

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    void setPublicTyping(tenantId, chat.conversationId, chat.token, false);

    try {
      const response = await sendPublicMessage(
        tenantId,
        chat.conversationId,
        chat.token,
        content,
      );

      if (response.status === "CLOSED") {
        setClosed(true);
      }

      await reloadThread(chat.conversationId, chat.token);
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

  async function handleClose() {
    if (!chat || closed || sending) {
      return;
    }
    const confirmed = await confirm({
      title: "Salir",
      message: "¿Desea finalizar el chat?",
      confirmLabel: "Finalizar",
    });

    if (!confirmed) {
      return;
    }

    setClosing(true);
    setSendError("");

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    void setPublicTyping(tenantId, chat.conversationId, chat.token, false);

    try {
      await closePublicChat(tenantId, chat.conversationId, chat.token);

      setClosed(true);
      setAgentTyping(false);
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "No fue posible terminar el chat",
      );
    } finally {
      setClosing(false);
    }
  }

  const accentStyle = widgetAccentStyle(chatConfig?.widget?.primaryColor);

  return (
    <div className="public-chat" style={accentStyle}>
      {!chat ? (
        <div className="public-chat__landing">
          <aside className="public-chat__hero">
            <div className="public-chat__hero-brand">
              <span className="public-chat__hero-logo" aria-hidden="true">
                <Icon name="brand" size={22} />
              </span>

              <strong>
                {chatConfig?.widget?.title ??
                  chatConfig?.tenantName ??
                  "QuoPilot"}
              </strong>
            </div>

            <h1 className="public-chat__hero-title">
              Cuéntanos quién eres y en qué te ayudamos
            </h1>

            <p className="public-chat__intro">{DEFAULT_INTRO}</p>

            <ul className="public-chat__hero-points">
              <li>
                <Icon name="check" size={16} />
                <span>Asistente virtual disponible 24/7</span>
              </li>

              <li>
                <Icon name="check" size={16} />
                <span>Respuesta inmediata a tu consulta</span>
              </li>

              <li>
                <Icon name="check" size={16} />
                <span>Un agente humano se une si lo necesitas</span>
              </li>
            </ul>

            <div className="public-chat__hero-presence">
              <i aria-hidden="true" />
              <span>
                En línea · {chatConfig?.channelName ?? "Asistente virtual"}
              </span>
            </div>
          </aside>

          <form className="public-chat__form" onSubmit={handleStart}>
            <div className="public-chat__form-head">
              <div className="public-chat__form-avatar" aria-hidden="true">
                <Icon name="brand" size={20} />
              </div>

              <div>
                <h2 className="public-chat__form-title">Escríbenos ahora</h2>

                <p className="public-chat__form-subtitle">
                  Completa tus datos y te responderemos de inmediato.
                </p>
              </div>
            </div>

            <div className="public-chat__form-grid">
              <Field
                id="public-chat-name"
                label="Nombre"
                type="text"
                value={name}
                error={nameError}
                required
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError("");
                }}
                placeholder="Tu nombre y apellido"
                autoComplete="name"
              />

              <Field
                id="public-chat-email"
                label="Email"
                type="email"
                value={email}
                error={emailError}
                required
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError("");
                }}
                placeholder="tu@correo.com"
                autoComplete="email"
              />

              <Field
                id="public-chat-phone"
                label="Teléfono (WhatsApp)"
                type="tel"
                value={phone}
                error={phoneError}
                required
                helper="Con indicativo de país, ej: +57 300 000 0000"
                onChange={(event) => {
                  setPhone(normalizePhoneInput(event.target.value));
                  setPhoneError("");
                }}
                placeholder="+573001234567"
                autoComplete="tel"
              />

              <Field
                id="public-chat-company"
                label="Empresa (opcional)"
                type="text"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Nombre de tu empresa"
                autoComplete="organization"
              />
            </div>

            <Field
              id="public-chat-topic"
              label="Asunto"
              as="select"
              error={topicError || undefined}
              value={topic}
                onChange={(event) => {
                  const nextTopic = event.target.value as ChatTopic;

                  setTopic(nextTopic);
                  setTopicError("");

                  if (nextTopic === "OTHER") {
                    setInitialMessage("");
                    setInitialMessageError("");
                  } else {
                    setInitialMessage(TOPIC_MESSAGE_TEMPLATES[nextTopic] ?? "");
                    setInitialMessageError("");
                  }
                }}
              >
                <option value="" disabled>
                  ¿Sobre qué quieres hablar?
                </option>

              {TOPIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Field>

            <Field
              id="public-chat-message"
              label="Mensaje"
              as="textarea"
              rows={3}
              error={initialMessageError || undefined}
              value={initialMessage}
              readOnly={topic !== "" && topic !== "OTHER"}
              onChange={(event) => {
                setInitialMessage(event.target.value);
                setInitialMessageError("");
              }}
              placeholder={
                topic === "OTHER"
                  ? "Cuéntanos brevemente en qué te podemos ayudar"
                  : "Se generará un mensaje según el asunto seleccionado"
              }
            />

            {startError && <FormMessage kind="error">{startError}</FormMessage>}

            <Button
              type="submit"
              variant="primary"
              icon="send"
              className="public-chat__form-submit"
              disabled={starting}
            >
              {starting ? "Iniciando..." : "Iniciar conversación"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="public-chat__card">
          <header className="public-chat__header">
            <div className="public-chat__avatar" aria-hidden="true">
              <Icon name="brand" size={18} />
            </div>

            <div className="public-chat__header-info">
              <strong>
                {chatConfig?.widget?.title ?? chat?.tenantName ?? "QuoPilot"}
              </strong>

              <small>
                {chat?.channelName
                  ? chat.channelName
                  : (chatConfig?.channelName ?? "Asistente virtual")}
              </small>
            </div>

            {chat && (
              <div
                className={
                  closed
                    ? "public-chat__presence public-chat__presence--off"
                    : "public-chat__presence"
                }
                role="status"
              >
                <i aria-hidden="true" />
                <span>{closed ? "Cerrado" : "En línea"}</span>
              </div>
            )}

            {chat && !closed && (
              <button
                type="button"
                className="public-chat__close"
                onClick={() => void handleClose()}
                disabled={closing || sending}
                aria-label="Terminar chat"
                title="Terminar chat"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </header>
          <>
            <AsyncBoundary
              loading={loading}
              error={loadError}
              loadingLabel="Cargando conversación..."
              loadingMessage="Esto puede tomar unos segundos"
              errorTitle="No fue posible cargar"
            >
              <div className="public-chat__messages">
                {messages.length === 0 && !sending ? (
                  <p className="public-chat__empty">
                    Envía tu primer mensaje para empezar a hablar con el
                    asistente.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={bubbleClassName(message.senderType)}
                    >
                      {(message.senderType === "AI" ||
                        message.senderType === "AGENT") && (
                        <span
                          className="public-chat__sender"
                          aria-label={`${SENDER_LABELS[message.senderType].role}: ${SENDER_LABELS[message.senderType].name}`}
                        >
                          <i
                            className="public-chat__sender-avatar"
                            aria-hidden="true"
                          >
                            {SENDER_LABELS[message.senderType].initial}
                          </i>

                          <em>{SENDER_LABELS[message.senderType].name}</em>
                        </span>
                      )}

                      {message.senderType === "SYSTEM" ? (
                        <span className="public-chat__system">
                          <Icon name="brand" size={14} />

                          <span
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(message.content),
                            }}
                          />
                        </span>
                      ) : (
                        <p
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(message.content),
                          }}
                        />
                      )}
                    </div>
                  ))
                )}

                {agentTyping && !sending && (
                  <div className="public-chat__bubble public-chat__bubble--agent">
                    <span className="public-chat__sender">
                      <i
                        className="public-chat__sender-avatar"
                        aria-hidden="true"
                      >
                        {SENDER_LABELS.AGENT.initial}
                      </i>

                      <em>{SENDER_LABELS.AGENT.name}</em>
                    </span>

                    <span className="public-chat__advisor-typing">
                      <span
                        className="public-chat__typing"
                        aria-label="Escribiendo..."
                      >
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  </div>
                )}

                {sending && !escalated && (
                  <div className="public-chat__bubble public-chat__bubble--ai public-chat__bubble--typing">
                    <span
                      className="public-chat__typing"
                      aria-label="Escribiendo..."
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>
            </AsyncBoundary>

            {closed && (
              <div className="public-chat__closed" role="status">
                <Icon name="info" size={16} />

                <p>
                  Esta conversación ha sido cerrada. ¡Gracias por escribirnos!
                </p>
              </div>
            )}

            <form
              className={
                closed
                  ? "public-chat__composer public-chat__composer--closed"
                  : "public-chat__composer"
              }
              onSubmit={(event) => {
                void handleSend(event);
              }}
            >
              {sendError && <FormMessage kind="error">{sendError}</FormMessage>}

              <div className="public-chat__composer-row">
                <textarea
                  ref={composerRef}
                  value={draft}
                  rows={1}
                  placeholder="Escribe tu mensaje..."
                  aria-label="Tu mensaje"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    resizeComposer();
                    notifyTyping();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={sending || closed}
                />

                <Button
                  type="submit"
                  variant="primary"
                  icon="send"
                  iconOnly
                  disabled={sending || closed || !draft.trim()}
                  title={closed ? "La conversación está cerrada" : "Enviar"}
                >
                  Enviar
                </Button>
              </div>

              {closed && (
                <Button
                  type="button"
                  variant="secondary"
                  icon="plus"
                  onClick={() => {
                    sessionStorage.removeItem(storageKey(tenantId));
                    setChat(null);
                    setClosed(false);
                    setMessages([]);
                    setDraft("");
                    setSendError("");
                    setEscalated(false);
                    setAgentTyping(false);
                  }}
                >
                  Iniciar nueva conversación
                </Button>
              )}
            </form>
          </>
        </div>
      )}
    </div>
  );
}
