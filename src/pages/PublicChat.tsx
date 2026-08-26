/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { CSSProperties, FormEvent, ReactElement } from "react";
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

export type PublicChatVariant = "page" | "embed";

interface PublicChatProps {
  tenantId: string;
  /**
   * "page": vista completa con landing y tarjeta centrada.
   * "embed": iframe del widget — sin marcos, 100% de la ventana.
   */
  variant?: PublicChatVariant;
  /** Cierra el widget desde fuera (postMessage al sitio padre). */
  onEmbedClose?: () => void;
  /** Plan de interés (desde la landing): precarga asunto + mensaje inicial. */
  presetPlan?: string;
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

function getAgentInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const SENDER_LABELS_BASE: Record<
  ChatMessage["senderType"],
  { role: string }
> = {
  AI: { role: "Asistente virtual" },
  AGENT: { role: "Atención humana" },
  CUSTOMER: { role: "Tú" },
  SYSTEM: { role: "Notificación" },
};

function bubbleClassName(senderType: ChatMessage["senderType"]): string {
  switch (senderType) {
    case "CUSTOMER":
      return "flex flex-col gap-1 max-w-[78%] px-3 py-2.5 rounded-xl leading-normal animate-[public-chat-fade-up_0.25s_ease-out] self-end bg-accent text-[color:var(--accent-text)] rounded-br-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]";
    case "AGENT":
      return "flex flex-col gap-1 max-w-[78%] px-3 py-2.5 rounded-xl leading-normal animate-[public-chat-fade-up_0.25s_ease-out] self-start bg-sky-50 border border-sky-200 text-sky-900 rounded-bl-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]";
    case "SYSTEM":
      return "flex flex-col gap-1 animate-[public-chat-fade-up_0.25s_ease-out] self-center max-w-[90%] px-3 py-1.5 bg-accent-soft border-none text-ink-muted text-xs rounded-full [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]";
    default:
      return "flex flex-col gap-1 max-w-[78%] px-3 py-2.5 rounded-xl leading-normal animate-[public-chat-fade-up_0.25s_ease-out] self-start bg-surface-light border border-line text-ink-strong rounded-bl-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]";
  }
}

function renderMessageBubble(
  message: ChatMessage,
  agentName: string,
  agentInitials: string,
): ReactElement {
  const isAI = message.senderType === "AI";
  const isAgent = message.senderType === "AGENT";

  return (
    <div
      key={message._id}
      className={bubbleClassName(message.senderType)}
    >
      {(isAI || isAgent) && (
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          aria-label={`${SENDER_LABELS_BASE[message.senderType].role}: ${isAI ? agentName : "Agente humano"}`}
        >
          <i
            className="inline-flex items-center justify-center w-5 h-5 rounded-full not-italic font-semibold text-[11px] bg-accent text-[color:var(--accent-text)]"
            aria-hidden="true"
          >
            {isAI ? agentInitials : "M"}
          </i>

          <em>{isAI ? agentName : "Agente humano"}</em>
        </span>
      )}

      {message.senderType === "SYSTEM" ? (
        <span className="inline-flex items-center gap-1.5">
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
  );
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

export interface InjectedPublicChannel {
  channel: string;
  tenantId: string;
  tenantName: string;
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
}

/** Estado del tenant inyectado por el SSR de /c/:token (defensivo). */
export function readInjectedPublicChannel(): InjectedPublicChannel | null {
  try {
    const value = (
      window as unknown as {
        __QUOPILOT_PUBLIC_CHANNEL__?: InjectedPublicChannel;
      }
    ).__QUOPILOT_PUBLIC_CHANNEL__;

    return value && value.tenantId ? value : null;
  } catch {
    return null;
  }
}

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

export default function PublicChat({
  tenantId,
  variant = "page",
  onEmbedClose,
  presetPlan,
}: PublicChatProps) {
  const isEmbed = variant === "embed";
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

  // Precarga del plan cuando viene desde la landing (?plan=PRO)
  useEffect(() => {
    if (!presetPlan || topic) return;
    const normalized = presetPlan.trim().toUpperCase();
    const validTopics: ChatTopic[] = ["PRICING", "PRODUCT_INFO", "SUPPORT", "DEMO", "OTHER"];
    if ((validTopics as string[]).includes(normalized)) {
      const asTopic = normalized as ChatTopic;
      setTopic(asTopic);
      if (asTopic !== "OTHER") {
        setInitialMessage(TOPIC_MESSAGE_TEMPLATES[asTopic] ?? "");
      }
    } else {
      // Fallback: si es un plan comercial (PRO/STARTER) lo mapeamos a PRICING
      setTopic("PRICING");
      setInitialMessage(`Me interesa el plan ${presetPlan}. ${TOPIC_MESSAGE_TEMPLATES.PRICING ?? ""}`.trim());
    }
  }, [presetPlan, topic]);

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

  /** Notifica al padre si la página corre dentro del widget embebido. */
  function notifyEmbedClose(): void {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "quopilot:close" }, "*");
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

    notifyEmbedClose();

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
    <div
      className={
        isEmbed
          ? "flex h-dvh w-full flex-col overflow-hidden"
          : "flex items-center justify-center min-h-screen p-6 bg-[linear-gradient(160deg,var(--shell-bg),var(--shell-border))]"
      }
      style={accentStyle}
    >
      {!chat ? (
        <div
          className={
            isEmbed
              ? "flex h-full w-full flex-col overflow-hidden bg-surface-card"
              : "grid grid-cols-1 md:grid-cols-[1fr_1.05fr] w-full max-w-[960px] min-h-[min(640px,calc(100vh-48px))] rounded-[20px] overflow-hidden bg-surface-card shadow-card max-[767px]:grid-cols-1 max-[767px]:min-h-0"
          }
        >
          <aside className={`flex flex-col gap-4 bg-accent text-white ${isEmbed ? "p-5" : "p-8 max-[767px]:p-6"}`}>
            <div className="inline-flex items-center gap-2.5 text-base font-bold">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-soft" aria-hidden="true">
                <Icon name="brand" size={22} />
              </span>

              <strong>
                {chatConfig?.widget?.agentName ??
                  chatConfig?.widget?.title ??
                  chatConfig?.tenantName ??
                  "QuoPilot"}
              </strong>
            </div>

            <p className="m-0 text-[12px] leading-normal opacity-80">
              Asesor Comercial{chatConfig?.widget?.companyName ? ` | ${chatConfig.widget.companyName}` : ""}
            </p>

            <h1 className="m-0 text-[28px] leading-[1.25] tracking-[-0.01em] max-[767px]:text-[22px]">
              Cuéntanos quién eres y en qué te ayudamos
            </h1>

            <p className="m-0 text-[15px] opacity-90 leading-normal">{DEFAULT_INTRO}</p>

            <ul className="flex flex-col gap-2.5 m-0 p-0 list-none [&>li]:inline-flex [&>li]:items-center [&>li]:gap-2.5 [&>li]:text-sm [&_svg]:shrink-0">
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

            <div className="inline-flex items-center gap-2 self-start mt-auto px-3.5 py-1.5 rounded-full bg-accent-soft text-[13px] font-semibold max-[767px]:mt-0 [&>i]:w-2 [&>i]:h-2 [&>i]:rounded-full [&>i]:bg-green-500 [&>i]:animate-[public-chat-pulse_2s_infinite]">
              <i aria-hidden="true" />
              <span>En línea</span>
            </div>
          </aside>

          <form className="flex flex-col gap-4 p-8 overflow-y-auto bg-surface-card max-[767px]:p-6" onSubmit={handleStart}>
            <div className="flex flex-row items-start gap-3 pb-4 border-b border-line">
              <div className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-accent-soft text-accent" aria-hidden="true">
                <Icon name="brand" size={20} />
              </div>

              <div>
                <h2 className="m-0 text-lg font-bold leading-tight text-ink-strong">Escríbenos ahora</h2>

                <p className="mt-0.5 mb-0 text-sm leading-normal text-ink-muted">
                  Completa tus datos y te responderemos de inmediato.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 max-[380px]:grid-cols-1">
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
              className="w-full justify-center"
              disabled={starting}
            >
              {starting ? "Iniciando..." : "Iniciar conversación"}
            </Button>
          </form>
        </div>
      ) : (
        <div
          className={
            isEmbed
              ? "flex h-full w-full flex-col overflow-hidden bg-surface-card"
              : "flex flex-col w-full max-w-[420px] h-[min(640px,calc(100vh-48px))] rounded-2xl overflow-hidden bg-surface-card shadow-card"
          }
        >
          <header className="flex items-center gap-2.5 p-4 bg-accent text-[color:var(--accent-text)]">
            <div className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-accent-soft text-[color:var(--accent-text)] shrink-0" aria-hidden="true">
              <Icon name="brand" size={18} />
            </div>

            <div className="flex flex-col gap-0.5 min-w-0 [&>strong]:text-base [&>strong]:truncate [&>strong]:whitespace-nowrap [&>small]:opacity-85 [&>small]:text-xs">
              <strong>
                {chatConfig?.widget?.agentName ??
                  chatConfig?.widget?.title ??
                  chat?.tenantName ??
                  "QuoPilot"}
              </strong>

              <small>
                Asesor Comercial{chatConfig?.widget?.companyName ? ` | ${chatConfig.widget.companyName}` : ""}
              </small>
            </div>

            {chat && (
              <div
                className={
                  closed
                    ? "inline-flex items-center gap-1.5 ml-auto px-2.5 py-1 rounded-full bg-accent-soft text-xs whitespace-nowrap [&>i]:w-2 [&>i]:h-2 [&>i]:rounded-full [&>i]:bg-slate-400 [&>i]:shadow-none [&>i]:animate-none"
                    : "inline-flex items-center gap-1.5 ml-auto px-2.5 py-1 rounded-full bg-accent-soft text-xs whitespace-nowrap [&>i]:w-2 [&>i]:h-2 [&>i]:rounded-full [&>i]:bg-green-500 [&>i]:animate-[public-chat-pulse_2s_infinite]"
                }
                role="status"
              >
                <i aria-hidden="true" />
                <span>En línea</span>
              </div>
            )}

            {isEmbed && onEmbedClose && (
              <button
                type="button"
                aria-label="Minimizar chat"
                title="Minimizar"
                onClick={onEmbedClose}
                className="inline-flex items-center justify-center p-1 border-none rounded-full cursor-pointer shrink-0 transition-colors duration-150 hover:bg-white/15"
              >
                <Icon name="chevron-down" size={16} />
              </button>
            )}

            {chat && !closed && (
              <button
                type="button"
                className="inline-flex items-center justify-center p-1 border-none rounded-full cursor-pointer shrink-0 transition-colors duration-150 hover:bg-accent-soft disabled:opacity-50 disabled:cursor-default"
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
              <div className="flex flex-col gap-2.5 flex-1 p-4 overflow-y-auto bg-surface-light">
                {messages.length === 0 && !sending ? (
                  <p className="m-auto max-w-[280px] text-sm text-center text-ink-muted">
                    Envía tu primer mensaje para empezar a hablar con el
                    asistente.
                  </p>
                ) : (
                  messages.map((message) =>
                    renderMessageBubble(
                      message,
                      chatConfig?.widget?.agentName ?? "Asistente",
                      getAgentInitials(
                        chatConfig?.widget?.agentName ?? "Asistente",
                      ),
                    ),
                  )
                )}

                {agentTyping && !sending && (
                  <div className="flex flex-col gap-1 max-w-[78%] px-3 py-2.5 rounded-xl leading-normal animate-[public-chat-fade-up_0.25s_ease-out] self-start bg-sky-50 border border-sky-200 text-sky-900 rounded-bl-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <i
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full not-italic font-semibold text-[11px] bg-accent text-[color:var(--accent-text)]"
                        aria-hidden="true"
                      >
                        M
                      </i>

                      <em>Agente humano</em>
                    </span>

                    <span className="inline-flex items-center gap-2 text-[13px]">
                      <span
                        className="typing-dots inline-flex items-center gap-1"
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
                  <div className="flex flex-col gap-1 max-w-[78%] px-4 py-3.5 rounded-xl leading-normal animate-[public-chat-fade-up_0.25s_ease-out] self-start bg-surface-light border border-line text-ink-strong [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                    <span
                      className="typing-dots inline-flex items-center gap-1"
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
              <div className="flex flex-row items-center justify-center gap-2 m-0 px-4 py-2.5 bg-accent-soft text-[13px] text-center text-ink-muted [&>p]:m-0" role="status">
                <Icon name="info" size={16} />

                <p>
                  Esta conversación ha sido cerrada. ¡Gracias por escribirnos!
                </p>
              </div>
            )}

            <form
              className={
                closed
                  ? "flex flex-col gap-2 p-3 border-t border-line bg-surface-light"
                  : "flex flex-col gap-2 p-3 border-t border-line bg-surface-card"
              }
              onSubmit={(event) => {
                void handleSend(event);
              }}
            >
              {sendError && <FormMessage kind="error">{sendError}</FormMessage>}

              <div className="flex flex-row items-end gap-2 [&>textarea]:flex-1 [&>input]:flex-1 [&>textarea]:resize-none [&>input]:resize-none [&>textarea]:rounded-[10px] [&>input]:rounded-[10px] [&>textarea]:border [&>input]:border [&>textarea]:border-line [&>input]:border-line [&>textarea]:bg-surface-light [&>input]:bg-surface-light [&>textarea]:px-3 [&>input]:px-3 [&>textarea]:py-2.5 [&>input]:py-2.5 [&>textarea]:text-sm [&>input]:text-sm [&>textarea]:leading-snug [&>input]:leading-snug [&>textarea]:text-ink-strong [&>input]:text-ink-strong [&>textarea]:font-[inherit] [&>input]:font-[inherit] [&>textarea]:max-h-[120px] [&>input]:max-h-[120px] [&>textarea]:overflow-y-auto [&>input]:overflow-y-auto [&>textarea]:[scrollbar-width:none] [&>input]:[scrollbar-width:none] focus-within:[&>textarea]:outline-2 focus-within:[&>input]:outline-2 focus-within:[&>textarea]:outline-offset-[-1px] focus-within:[&>input]:outline-offset-[-1px] focus-within:[&>textarea]:outline-accent focus-within:[&>input]:outline-accent disabled:[&>textarea]:bg-shell-bg disabled:[&>input]:bg-shell-bg disabled:[&>textarea]:border-shell-border disabled:[&>input]:border-shell-border disabled:[&>textarea]:text-slate-400 disabled:[&>input]:text-slate-400 disabled:[&>textarea]:cursor-not-allowed disabled:[&>input]:cursor-not-allowed">
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
