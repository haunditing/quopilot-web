import { useCallback, useEffect, useRef, useState } from "react";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import StatusBadge from "../components/StatusBadge.js";
import { useToast } from "../hooks/useToast.js";
import { getUser } from "../services/auth-storage.js";
import { getChannels } from "../services/channel-service.js";
import { getCustomers } from "../services/customer-service.js";
import {
  getConversationMessages,
  getConversations,
  openConversation,
  sendConversationMessage,
} from "../services/agent-conversation-service.js";
import type {
  ChatConversation,
  ChatMessage,
} from "../types/agent-conversation.js";
import type { Customer } from "../types/customer.js";
import { renderMarkdown } from "../lib/sanitize.js";

type StatusFilter = "OPEN" | "CLOSED" | "ALL";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "OPEN", label: "Abiertas" },
  { value: "CLOSED", label: "Cerradas" },
];

const POLL_INTERVAL_MS = 5000;

function formatRelativeTime(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffInMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffInMinutes < 1) {
    return "ahora";
  }

  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `hace ${diffInHours} h`;
  }

  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function conversationTitle(conversation: ChatConversation): string {
  return (
    conversation.customer?.name?.trim() ||
    conversation.customer?.phone ||
    conversation.customer?.email ||
    "Cliente sin nombre"
  );
}

let optimisticId = 0;

function nextOptimisticId(prefix: string): string {
  optimisticId += 1;

  return `${prefix}-${optimisticId}`;
}

export default function AgentChat() {
  const toast = useToast();
  const tenantId = getUser()?.tenantId;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [conversations, setConversations] = useState<ChatConversation[] | null>(
    null,
  );
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[] | null>(
    null,
  );
  const [customerLoading, setCustomerLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [copied, setCopied] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation =
    conversations?.find((conversation) => conversation._id === selectedId) ??
    null;

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError("");

    try {
      const result = await getConversations({
        page: 1,
        limit: 50,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });

      setConversations(result.data);
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar el chat",
      );
    } finally {
      setListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setListLoading(true);
      setListError("");

      try {
        const result = await getConversations({
          page: 1,
          limit: 50,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        });

        if (!cancelled) {
          setConversations(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof Error
              ? error.message
              : "No fue posible cargar el chat",
          );
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const selectConversation = useCallback(async (conversationId: string) => {
    setSelectedId(conversationId);
    setThreadLoading(true);
    setThreadError("");
    setMessages([]);
    setSendError("");

    try {
      const result = await getConversationMessages(conversationId);

      setMessages(result);
    } catch (error) {
      setThreadError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar los mensajes",
      );
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const reloadThread = useCallback(async (conversationId: string) => {
    try {
      const result = await getConversationMessages(conversationId);

      setMessages(result);
    } catch {
      // silencioso: evita interrumpir la UI con errores de polling
    }
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending, threadLoading]);

  useEffect(() => {
    if (!selectedId || sending || threadLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const [listResult, threadResult] = await Promise.all([
            getConversations({
              page: 1,
              limit: 50,
              status: statusFilter === "ALL" ? undefined : statusFilter,
            }),
            getConversationMessages(selectedId),
          ]);

          setConversations((current) => {
            if (!current) {
              return listResult.data;
            }

            const key = (conversation: ChatConversation) =>
              `${conversation._id}:${conversation.status}:${conversation.lastMessageAt ?? ""}`;

            return current.map(key).join("|") ===
              listResult.data.map(key).join("|")
              ? current
              : listResult.data;
          });

          setMessages((current) => {
            const known = new Set(current.map((message) => message._id));

            const incoming = threadResult.filter(
              (message) => !known.has(message._id),
            );

            if (incoming.length === 0) {
              return current;
            }

            return [...current, ...incoming].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
          });
        } catch {
          // silencioso: el polling no debe interrumpir la UI
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [selectedId, sending, threadLoading, statusFilter]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !selectedId || sending) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      _id: nextOptimisticId("optimistic"),
      tenantId: "",
      conversationId: selectedId,
      customerId: selectedConversation?.customerId ?? "",
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

    try {
      await sendConversationMessage(selectedId, content);

      await reloadThread(selectedId);
      void loadConversations();
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

  function openNewConversation() {
    setCustomerSearch("");
    setCustomerResults(null);
    setModalOpen(true);
  }

  async function handleCustomerSearch(value: string) {
    setCustomerSearch(value);

    if (!value.trim()) {
      setCustomerResults(null);

      return;
    }

    setCustomerLoading(true);

    try {
      const result = await getCustomers({
        page: 1,
        limit: 8,
        search: value,
      });

      setCustomerResults(result.data);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerLoading(false);
    }
  }

  async function handlePickCustomer(customer: Customer) {
    setOpening(true);

    try {
      const conversation = await openConversation(customer._id);

      setModalOpen(false);
      await loadConversations();
      await selectConversation(conversation._id);

      toast.success("Conversación abierta");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible abrir la conversación",
      );
    } finally {
      setOpening(false);
    }
  }

  async function handleCopyPublicLink() {
    if (!tenantId) {
      return;
    }

    try {
      const channels = await getChannels({
        limit: 20,
        type: "WEB_CHAT",
        status: "ACTIVE",
      });

      if (channels.data.length === 0) {
        toast.error("Configura primero un canal de Chat Web activo en Canales");

        return;
      }

      await navigator.clipboard.writeText(
        `${window.location.origin}/public/chat/${tenantId}`,
      );

      setCopied(true);
      toast.success("Enlace público copiado");

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No fue posible copiar el enlace");
    }
  }

  return (
    <main>
      <PageHeader
        title="Chat del agente"
        description="Conversaciones entre tus clientes y el agente de IA"
        actions={
          <>
            <Button
              variant="secondary"
              icon="link"
              iconOnly
              onClick={() => {
                void handleCopyPublicLink();
              }}
            >
              {copied ? "Enlace copiado" : "Copiar enlace público"}
            </Button>

            <Button icon="user-plus" iconOnly onClick={openNewConversation}>
              Nueva conversación
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(260px,340px)_1fr] gap-4 items-stretch h-[calc(100vh-220px)] min-h-[480px] max-[860px]:grid-cols-1 max-[860px]:h-auto">
        <aside className="flex flex-col rounded-xl border border-line bg-surface-card overflow-hidden max-[860px]:max-h-[280px]">
          <div className="flex flex-row gap-1 p-2.5 border-b border-line">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  statusFilter === filter.value
                    ? "flex-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold cursor-pointer !bg-accent-soft !border-accent-border !text-accent"
                    : "flex-1 border border-transparent rounded-lg text-[13px] font-semibold px-2 py-1.5 cursor-pointer text-ink-muted"
                }
                onClick={() => {
                  setStatusFilter(filter.value);
                  setSelectedId(null);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <AsyncBoundary
            loading={listLoading}
            error={listError}
            empty={!conversations || conversations.length === 0}
            loadingLabel="Cargando conversaciones..."
            loadingMessage="Esto puede tomar unos segundos"
            errorTitle="No fue posible cargar"
            emptyTitle="No hay conversaciones"
            emptyMessage="Abre una conversación para empezar a probar al agente"
          >
            <div className="flex flex-col overflow-y-auto">
              {(conversations ?? []).map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  className={
                    selectedId === conversation._id
                      ? "flex flex-col gap-1 w-full border-none border-b border-line bg-accent-soft text-left font-[inherit] px-3.5 py-3 cursor-pointer shadow-[inset_3px_0_0_var(--accent)]"
                      : "flex flex-col gap-1 w-full border-none border-b border-line bg-transparent text-left font-[inherit] px-3.5 py-3 cursor-pointer hover:bg-accent-soft"
                  }
                  onClick={() => {
                    void selectConversation(conversation._id);
                  }}
                >
                  <span className="flex items-baseline justify-between gap-2 [&>strong]:text-sm [&>strong]:text-ink-strong [&>strong]:truncate [&>strong]:whitespace-nowrap [&>time]:text-xs [&>time]:text-ink-muted [&>time]:whitespace-nowrap">
                    <strong>{conversationTitle(conversation)}</strong>

                    <time>
                      {formatRelativeTime(
                        conversation.lastMessageAt ??
                          conversation.lastMessage?.createdAt,
                      )}
                    </time>
                  </span>

                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-ink-muted truncate whitespace-nowrap">
                      {conversation.lastMessage?.content || "Sin mensajes"}
                    </span>

                    <StatusBadge status={conversation.status} />
                  </span>
                </button>
              ))}
            </div>
          </AsyncBoundary>
        </aside>

        <section className="flex flex-col rounded-xl border border-line bg-surface-card overflow-hidden">
          {!selectedConversation ? (
            <div className="flex flex-col items-center justify-center gap-3 flex-1 text-ink-muted [&>svg]:text-accent [&>svg]:opacity-50">
              <Icon name="chat" size={40} />

              <p>Selecciona una conversación para ver los mensajes</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
                <div className="flex flex-col gap-0.5 min-w-0 [&>strong]:text-[15px] [&>strong]:truncate [&>strong]:whitespace-nowrap [&>small]:text-xs text-ink-muted">
                  <strong>{conversationTitle(selectedConversation)}</strong>

                  <small>
                    {selectedConversation.channel === "WEB_CHAT"
                      ? "Chat web"
                      : selectedConversation.channel}
                  </small>
                </div>

                <StatusBadge status={selectedConversation.status} />
              </header>

              {threadLoading ? null : threadError ? (
                <PageState
                  kind="error"
                  title="No fue posible cargar"
                  message={threadError}
                />
              ) : (
                <div className="flex flex-col gap-2.5 flex-1 p-4 overflow-y-auto">
                  {messages.length === 0 && !sending ? (
                    <p className="m-auto max-w-[320px] text-sm text-center text-ink-muted">
                      Aún no hay mensajes. Escribe el primer mensaje del cliente
                      para probar al agente.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={
                          message.direction === "INBOUND"
                            ? "flex flex-col gap-1 max-w-[78%] px-3 py-2.5 rounded-xl leading-normal self-start bg-surface-light border border-line text-ink-strong rounded-bl-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]"
                            : "flex flex-col gap-1 max-w-[78%] px-3 py-2.5 rounded-xl leading-normal self-end bg-accent text-white rounded-br-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere] [&>span]:text-white/80"
                        }
                      >
                        <span className="text-[11px] opacity-75">
                          {message.direction === "INBOUND" ? "Cliente" : "IA"}
                          {" · "}
                          {formatRelativeTime(message.createdAt)}
                        </span>

                        {message.direction === "INBOUND" ? (
                          <p
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(message.content),
                            }}
                          />
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(message.content),
                            }}
                          />
                        )}
                      </div>
                    ))
                  )}

                  {sending && (
                    <div className="flex flex-col gap-1 max-w-[78%] px-4 py-3.5 rounded-xl leading-normal self-end bg-accent text-white rounded-br-[4px] [&>p]:m-0 [&>p]:text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                      <span
                        className="inline-flex items-center gap-1"
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

              <form
                className="flex flex-col gap-2 px-4 py-3 border-t border-line"
                onSubmit={(event) => {
                  void handleSend(event);
                }}
              >
                {sendError && (
                  <FormMessage kind="error">{sendError}</FormMessage>
                )}

                <div className="flex flex-row gap-2 [&>input]:flex-1 [&>input]:rounded-[10px] [&>input]:border [&>input]:border-line [&>input]:bg-surface-light [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:text-ink-strong [&>input]:font-[inherit] focus-within:[&>input]:outline-2 focus-within:[&>input]:outline-offset-[-1px] focus-within:[&>input]:outline-accent disabled:[&>input]:opacity-60">
                  <input
                    type="text"
                    value={draft}
                    placeholder="Escribe el mensaje del cliente..."
                    aria-label="Mensaje del cliente"
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={
                      sending || selectedConversation.status === "CLOSED"
                    }
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    icon="send"
                    iconOnly
                    disabled={
                      sending ||
                      !draft.trim() ||
                      selectedConversation.status === "CLOSED"
                    }
                  >
                    Enviar
                  </Button>
                </div>

                <p className="m-0 text-xs text-ink-muted">
                  El mensaje se envía como si lo escribiera el cliente, para que
                  el agente responda.
                </p>
              </form>
            </>
          )}
        </section>
      </div>

      <Modal
        open={modalOpen}
        title="Nueva conversación"
        onClose={() => setModalOpen(false)}
      >
        <div className="flex flex-col gap-[18px]">
          <Field
            id="chat-customer-search"
            label="Buscar cliente"
            type="text"
            value={customerSearch}
            onChange={(event) => {
              void handleCustomerSearch(event.target.value);
            }}
            placeholder="Nombre, teléfono o email..."
            autoFocus
          />

          {customerLoading && (
            <p className="m-0 text-sm text-ink-muted">Buscando clientes...</p>
          )}

          {customerResults !== null &&
            !customerLoading &&
            customerResults.length === 0 && (
              <p className="m-0 text-sm text-ink-muted">
                No se encontraron clientes
              </p>
            )}

          {customerResults !== null && customerResults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {customerResults.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  className="flex flex-col gap-0.5 rounded-[10px] border border-line bg-transparent text-left font-[inherit] px-3 py-2.5 cursor-pointer transition-colors duration-150 hover:border-accent-border hover:bg-accent-soft [&>strong]:text-sm [&>strong]:text-ink-strong [&>small]:text-xs text-ink-muted"
                  disabled={opening}
                  onClick={() => {
                    void handlePickCustomer(customer);
                  }}
                >
                  <strong>{customer.name || "Cliente sin nombre"}</strong>

                  <small>
                    {[customer.phone, customer.email]
                      .filter(Boolean)
                      .join(" · ") || "Sin datos de contacto"}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </main>
  );
}
