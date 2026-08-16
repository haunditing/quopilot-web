import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import PageState from "../components/PageState.js";
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
import { isValidEmail, isValidPhone, normalizePhoneInput } from "../lib/validation.js";

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
  } as CSSProperties;
}

export type ChatTopic = "PRICING" | "PRODUCT_INFO" | "SUPPORT" | "DEMO" | "OTHER";

const TOPIC_OPTIONS: Array<{ value: ChatTopic; label: string }> = [
  { value: "PRICING", label: "Precios y planes" },
  { value: "PRODUCT_INFO", label: "Información de productos" },
  { value: "SUPPORT", label: "Soporte" },
  { value: "DEMO", label: "Agendar demostración" },
  { value: "OTHER", label: "Otro asunto" },
];

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
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState<ChatTopic | "">("");
  const [initialMessage, setInitialMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [topicError, setTopicError] = useState("");
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
        const result = await getPublicMessages(
          tenantId,
          conversationId,
          token,
        );

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
              typingResult.isTyping &&
                typingResult.senderType === "AGENT",
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
        error instanceof Error ? error.message : "No fue posible iniciar el chat",
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

    if (!window.confirm("¿Deseas terminar este chat?")) {
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
      <div className="public-chat__card">
        <header className="public-chat__header">
          <Icon name="brand" size={22} className="public-chat__brand" />

          <div className="public-chat__header-info">
            <strong>
              {chatConfig?.widget?.title ??
                chat?.tenantName ??
                "QuoPilot"}
            </strong>

            <small>
              {chat?.channelName
                ? chat.channelName
                : (chatConfig?.channelName ?? "Asistente virtual")}
            </small>
          </div>

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

        {!chat ? (
          <form className="public-chat__form" onSubmit={handleStart}>
            <p className="public-chat__intro">{DEFAULT_INTRO}</p>

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

            <div className="form-field">
              <label
                className="form-field__label"
                htmlFor="public-chat-topic"
              >
                Asunto
              </label>

              <select
                id="public-chat-topic"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value as ChatTopic);
                  setTopicError("");
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
              </select>

              {topicError && (
                <span className="form-field__error">{topicError}</span>
              )}
            </div>

            <div className="form-field">
              <label className="form-field__label" htmlFor="public-chat-message">
                Mensaje
              </label>

              <textarea
                id="public-chat-message"
                className="form-field__input"
                rows={3}
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="Cuéntanos brevemente en qué te podemos ayudar"
              />
            </div>

            {startError && <FormMessage kind="error">{startError}</FormMessage>}

            <Button
              type="submit"
              variant="primary"
              icon="send"
              iconOnly
              disabled={starting}
            >
              {starting ? "Iniciando..." : "Iniciar conversación"}
            </Button>
          </form>
        ) : (
          <>
            {loading ? (
              <PageState
                kind="loading"
                title="Cargando conversación..."
                message="Esto puede tomar unos segundos"
              />
            ) : loadError ? (
              <PageState
                kind="error"
                title="No fue posible cargar"
                message={loadError}
              />
            ) : (
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
                      className={
                        message.direction === "INBOUND"
                          ? "public-chat__bubble public-chat__bubble--user"
                          : "public-chat__bubble public-chat__bubble--ai"
                      }
                    >
                      <p>{message.content}</p>
                    </div>
                  ))
                )}

                {agentTyping && !sending && (
                  <div className="public-chat__bubble public-chat__bubble--advisor">
                    <span className="public-chat__advisor-typing">
                      <span className="public-chat__typing" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>

                      El asesor está escribiendo...
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
            )}

            {closed && (
              <p className="public-chat__closed">
                Esta conversación ha sido cerrada. ¡Gracias por escribirnos!
              </p>
            )}

            <form
              className="public-chat__composer"
              onSubmit={(event) => {
                void handleSend(event);
              }}
            >
              {sendError && (
                <FormMessage kind="error">{sendError}</FormMessage>
              )}

              <div className="public-chat__composer-row">
                <input
                  type="text"
                  value={draft}
                  placeholder="Escribe tu mensaje..."
                  aria-label="Tu mensaje"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    notifyTyping();
                  }}
                  disabled={sending || closed}
                />

                <Button
                  type="submit"
                  variant="primary"
                  icon="send"
                  iconOnly
                  disabled={sending || closed || !draft.trim()}
                >
                  Enviar
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
