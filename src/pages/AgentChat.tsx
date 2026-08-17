import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
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
  const [conversations, setConversations] = useState<
    ChatConversation[] | null
  >(null);
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
        error instanceof Error ? error.message : "No fue posible cargar el chat",
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
            const known = new Set(
              current.map((message) => message._id),
            );
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
        toast.error(
          "Configura primero un canal de Chat Web activo en Canales",
        );

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

      <div className="agent-chat">
        <aside className="agent-chat__list">
          <div className="agent-chat__filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  statusFilter === filter.value
                    ? "agent-chat__filter agent-chat__filter--active"
                    : "agent-chat__filter"
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

          {listLoading ? (
            <LoadingOverlay title="Cargando conversaciones..." message="Esto puede tomar unos segundos" />
          ) : listError ? (
            <PageState
              kind="error"
              title="No fue posible cargar"
              message={listError}
            />
          ) : !conversations || conversations.length === 0 ? (
            <EmptyState
              title="No hay conversaciones"
              message="Abre una conversación para empezar a probar al agente"
            />
          ) : (
            <div className="agent-chat__items">
              {conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  className={
                    selectedId === conversation._id
                      ? "agent-chat__item agent-chat__item--active"
                      : "agent-chat__item"
                  }
                  onClick={() => {
                    void selectConversation(conversation._id);
                  }}
                >
                  <span className="agent-chat__item-top">
                    <strong>{conversationTitle(conversation)}</strong>

                    <time>
                      {formatRelativeTime(
                        conversation.lastMessageAt ??
                          conversation.lastMessage?.createdAt,
                      )}
                    </time>
                  </span>

                  <span className="agent-chat__item-bottom">
                    <span className="agent-chat__preview">
                      {conversation.lastMessage?.content || "Sin mensajes"}
                    </span>

                    <StatusBadge status={conversation.status} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="agent-chat__thread">
          {!selectedConversation ? (
            <div className="agent-chat__placeholder">
              <Icon name="chat" size={40} />

              <p>Selecciona una conversación para ver los mensajes</p>
            </div>
          ) : (
            <>
              <header className="agent-chat__header">
                <div className="agent-chat__header-info">
                  <strong>{conversationTitle(selectedConversation)}</strong>

                  <small>
                    {selectedConversation.channel === "WEB_CHAT"
                      ? "Chat web"
                      : selectedConversation.channel}
                  </small>
                </div>

                <StatusBadge status={selectedConversation.status} />
              </header>

              {threadLoading ? (
                null
              ) : threadError ? (
                <PageState
                  kind="error"
                  title="No fue posible cargar"
                  message={threadError}
                />
              ) : (
                <div className="agent-chat__messages">
                  {messages.length === 0 && !sending ? (
                    <p className="agent-chat__empty-thread">
                      Aún no hay mensajes. Escribe el primer mensaje del cliente
                      para probar al agente.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={
                          message.direction === "INBOUND"
                            ? "agent-chat__bubble agent-chat__bubble--customer"
                            : "agent-chat__bubble agent-chat__bubble--ai"
                        }
                      >
                        <span className="agent-chat__bubble-meta">
                          {message.direction === "INBOUND" ? "Cliente" : "IA"}
                          {" · "}
                          {formatRelativeTime(message.createdAt)}
                        </span>

                        <p>{message.content}</p>
                      </div>
                    ))
                  )}

                  {sending && (
                    <div className="agent-chat__bubble agent-chat__bubble--ai agent-chat__bubble--typing">
                      <span className="agent-chat__typing" aria-label="Escribiendo...">
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
                className="agent-chat__composer"
                onSubmit={(event) => {
                  void handleSend(event);
                }}
              >
                {sendError && (
                  <FormMessage kind="error">{sendError}</FormMessage>
                )}

                <div className="agent-chat__composer-row">
                  <input
                    type="text"
                    value={draft}
                    placeholder="Escribe el mensaje del cliente..."
                    aria-label="Mensaje del cliente"
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={sending || selectedConversation.status === "CLOSED"}
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

                <p className="agent-chat__composer-hint">
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
        <div className="modal__form">
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
            <p className="agent-chat__customer-status">Buscando clientes...</p>
          )}

          {customerResults !== null &&
            !customerLoading &&
            customerResults.length === 0 && (
              <p className="agent-chat__customer-status">
                No se encontraron clientes
              </p>
            )}

          {customerResults !== null && customerResults.length > 0 && (
            <div className="agent-chat__customer-list">
              {customerResults.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  className="agent-chat__customer"
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
