import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import PageHeader from "../components/PageHeader.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import StatusBadge from "../components/StatusBadge.js";
import { getUser, getUserRole } from "../services/auth-storage.js";
import { useToast } from "../hooks/useToast.js";
import {
  getConversationMessages,
  getConversationTyping,
  getInboxConversations,
  replyToConversation,
  setConversationTyping,
} from "../services/inbox-service.js";
import type {
  ChatConversation,
  ChatMessage,
  ConversationChannel,
} from "../types/agent-conversation.js";

type ChannelFilter = ConversationChannel | "ALL";

const CHANNEL_LABELS: Record<ConversationChannel, string> = {
  WHATSAPP: "WhatsApp",
  WEB_CHAT: "Chat Web",
  INSTAGRAM: "Instagram",
};

const FILTER_LABELS: Record<ChannelFilter, string> = {
  ALL: "Todos",
  ...CHANNEL_LABELS,
};

const POLL_INTERVAL_MS = 5000;

function isOptimisticMessageId(id: string): boolean {
  return id.startsWith("optimistic-") || id.startsWith("seeded-");
}

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

function senderLabel(message: ChatMessage): string {
  if (message.direction === "INBOUND") {
    return "Cliente";
  }

  return message.senderType === "AGENT" ? "Asesor" : "IA";
}

let optimisticId = 0;

function nextOptimisticId(prefix: string): string {
  optimisticId += 1;

  return `${prefix}-${optimisticId}`;
}

export default function Conversations() {
  const [channelFilter, setChannelFilter] =
    useState<ChannelFilter>("ALL");
  const [counts, setCounts] = useState<Record<ChannelFilter, number>>({
    ALL: 0,
    WHATSAPP: 0,
    INSTAGRAM: 0,
    WEB_CHAT: 0,
  });
  const [channelsWithMessages, setChannelsWithMessages] = useState<
    ConversationChannel[]
  >([]);
  const [conversations, setConversations] = useState<
    ChatConversation[] | null
  >(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const autoSelectedRef = useRef(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [notDelivered, setNotDelivered] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const knownAssignedRef = useRef<Set<string>>(new Set());

  const toast = useToast();
  const currentUserId = getUser()?.id;
  const canReply = getUserRole() === "AGENT";

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (selectedIdRef.current && getUserRole() === "AGENT") {
        void setConversationTyping(selectedIdRef.current, false);
      }
    };
  }, []);

  function notifyTyping() {
    if (!selectedIdRef.current) {
      return;
    }

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = window.setTimeout(() => {
      const conversationId = selectedIdRef.current;

      if (conversationId) {
        void setConversationTyping(conversationId, true);
      }
    }, 400);
  }

  const selectedConversation =
    conversations?.find((conversation) => conversation._id === selectedId) ??
    null;

  const assignedToOther =
    canReply &&
    Boolean(selectedConversation?.assignedTo) &&
    selectedConversation?.assignedTo !== currentUserId;

  const showAllTab = channelsWithMessages.length > 1;

  const visibleChannelFilters: ChannelFilter[] = showAllTab
    ? ["ALL", ...channelsWithMessages]
    : (channelsWithMessages.length === 1
        ? [channelsWithMessages[0]]
        : []);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedId(conversationId);
      setThreadLoading(true);
      setThreadError("");

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
    },
    [],
  );

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError("");

    try {
      const result = await getInboxConversations({
        page: 1,
        limit: 50,
        channel: channelFilter === "ALL" ? undefined : channelFilter,
      });

      setConversations(result.data);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "No fue posible cargar",
      );
    } finally {
      setListLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setListLoading(true);
      setListError("");

      try {
        const channel =
          channelFilter === "ALL" ? undefined : channelFilter;

        const [result, whatsappCount, instagramCount, webChatCount] =
          await Promise.all([
            getInboxConversations({
              page: 1,
              limit: 50,
              channel,
            }),
            getInboxConversations({
              page: 1,
              limit: 1,
              channel: "WHATSAPP",
            }),
            getInboxConversations({
              page: 1,
              limit: 1,
              channel: "INSTAGRAM",
            }),
            getInboxConversations({
              page: 1,
              limit: 1,
              channel: "WEB_CHAT",
            }),
          ]);

        if (!cancelled) {
          const whatsapp = whatsappCount.pagination.total;
          const instagram = instagramCount.pagination.total;
          const webChat = webChatCount.pagination.total;

          setConversations(result.data);
          setCounts({
            ALL: whatsapp + instagram + webChat,
            WHATSAPP: whatsapp,
            INSTAGRAM: instagram,
            WEB_CHAT: webChat,
          });

          const activeChannels = [
            whatsapp > 0 && "WHATSAPP",
            instagram > 0 && "INSTAGRAM",
            webChat > 0 && "WEB_CHAT",
          ].filter(Boolean) as ConversationChannel[];

          setChannelsWithMessages(activeChannels);

          if (
            channelFilter !== "ALL" &&
            !activeChannels.includes(channelFilter)
          ) {
            setChannelFilter(
              activeChannels.length === 1 ? activeChannels[0] : "ALL",
            );
          }

          if (
            !autoSelectedRef.current &&
            !selectedIdRef.current &&
            result.data.length > 0
          ) {
            autoSelectedRef.current = true;

            void selectConversation(result.data[0]._id);
          }

          if (currentUserId) {
            knownAssignedRef.current = new Set(
              result.data
                .filter(
                  (conversation) =>
                    conversation.assignedTo === currentUserId,
                )
                .map((conversation) => conversation._id),
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof Error ? error.message : "No fue posible cargar",
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
  }, [channelFilter, currentUserId, selectConversation]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending, threadLoading]);

  useEffect(() => {
    if (listLoading || threadLoading || sending) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const channel = channelFilter === "ALL" ? undefined : channelFilter;

          const [listResult, threadResult, typingResult] = await Promise.all([
            getInboxConversations({
              page: 1,
              limit: 50,
              channel,
            }),
            selectedId
              ? getConversationMessages(selectedId)
              : Promise.resolve<ChatMessage[]>([]),
            selectedId
              ? getConversationTyping(selectedId)
              : Promise.resolve(null),
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

          if (currentUserId) {
            const newlyAssigned = listResult.data.filter(
              (conversation) =>
                conversation.assignedTo === currentUserId &&
                !knownAssignedRef.current.has(conversation._id),
            );

            for (const conversation of newlyAssigned) {
              toast.info(
                `Conversación asignada: ${conversationTitle(conversation)}`,
              );
            }

            const stillMine = new Set(
              listResult.data
                .filter(
                  (conversation) =>
                    conversation.assignedTo === currentUserId,
                )
                .map((conversation) => conversation._id),
            );

            knownAssignedRef.current = stillMine;
          }

          setMessages((current) => {
            if (threadResult.length === 0 || current.length === 0) {
              return current;
            }

            const known = new Set(
              current
                .filter(
                  (message) => !isOptimisticMessageId(message._id),
                )
                .map((message) => message._id),
            );

            const incoming = threadResult.filter(
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

          if (typingResult) {
            setCustomerTyping(
              typingResult.isTyping &&
                typingResult.senderType === "CUSTOMER",
            );
          }
        } catch {
          // silencioso: el polling no debe interrumpir la UI
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [channelFilter, selectedId, listLoading, threadLoading, sending, currentUserId, toast]);

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
      direction: "OUTBOUND",
      senderType: "AGENT",
      content,
      status: "SENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSendError("");
    setNotDelivered(false);
    setSending(true);

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    void setConversationTyping(selectedId, false);

    try {
      const response = await replyToConversation(selectedId, content);

      setMessages((current) =>
        current.map((message) =>
          message._id === optimisticMessage._id
            ? {
                ...message,
                _id: response.message.id,
                createdAt: response.message.createdAt,
              }
            : message,
        ),
      );

      if (!response.delivered) {
        setNotDelivered(true);
      }

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

  return (
    <main>
      <PageHeader
        title="Conversaciones"
        description="Inbox de WhatsApp, Instagram y chat web"
      />

      <div className="agent-chat agent-chat--tabs">
        <div className="agent-chat__tabbar">
          <div
            className="agent-chat__tabs"
            role="tablist"
            aria-label="Filtro por canal"
          >
            {visibleChannelFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={channelFilter === filter}
                className={
                  channelFilter === filter
                    ? "agent-chat__tab agent-chat__tab--active"
                    : "agent-chat__tab"
                }
                onClick={() => {
                  setChannelFilter(filter);
                  setSelectedId(null);
                }}
              >
                {FILTER_LABELS[filter]}

                <span className="agent-chat__tab-count">
                  {counts[filter]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="agent-chat__body">
          <aside className="agent-chat__list">

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
              message="Los mensajes de tus canales aparecerán aquí"
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

                    <span className="agent-chat__item-assignee">
                      {conversation.assignedTo
                        ? conversation.assignedTo === currentUserId
                          ? "Tuya"
                          : (conversation.assignedAgentName ?? "Asignada")
                        : ""}
                    </span>

                    <StatusBadge status={conversation.status} />
                  </span>

                  <span className="agent-chat__item-channel">
                    {CHANNEL_LABELS[conversation.channel]}
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
                    {CHANNEL_LABELS[selectedConversation.channel]}

                    {selectedConversation.assignedTo
                      ? selectedConversation.assignedTo === currentUserId
                        ? " · Asignada a ti"
                        : ` · Asignada a ${selectedConversation.assignedAgentName ?? "otro agente"}`
                      : ""}
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
                      Aún no hay mensajes en esta conversación.
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
                          {senderLabel(message)}
                          {" · "}
                          {formatRelativeTime(message.createdAt)}
                        </span>

                        <p>{message.content}</p>
                      </div>
                    ))
                  )}

                  {sending && (
                    <div className="agent-chat__bubble agent-chat__bubble--ai agent-chat__bubble--typing">
                      <span
                        className="agent-chat__typing"
                        aria-label="Enviando..."
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

              {canReply && !assignedToOther ? (
                <form
                  className="agent-chat__composer"
                  onSubmit={(event) => {
                    void handleSend(event);
                  }}
                >
                  {sendError && (
                    <FormMessage kind="error">{sendError}</FormMessage>
                  )}

                  {notDelivered && (
                    <FormMessage kind="error">
                      La respuesta se guardó, pero el canal no tiene token o
                      configuración de envío, por lo que no se entregó.
                    </FormMessage>
                  )}

                  <div className="agent-chat__composer-row">
                    <input
                      type="text"
                      value={draft}
                      placeholder="Responde como asesor..."
                      aria-label="Respuesta del asesor"
                      onChange={(event) => {
                        setDraft(event.target.value);
                        notifyTyping();
                      }}
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

                  {customerTyping && (
                    <p className="agent-chat__composer-hint agent-chat__composer-hint--typing">
                      El cliente está escribiendo...
                    </p>
                  )}
                </form>
              ) : canReply && assignedToOther ? (
                <div className="agent-chat__composer agent-chat__composer--readonly">
                  <p className="agent-chat__composer-hint">
                    Esta conversación fue asignada a{" "}
                    {selectedConversation?.assignedAgentName ?? "otro agente"}.
                    Solo él puede responder al cliente.
                  </p>
                </div>
              ) : (
                <div className="agent-chat__composer agent-chat__composer--readonly">
                  <p className="agent-chat__composer-hint">
                    Estás viendo el inbox en modo lectura. Solo los agentes
                    pueden responder mensajes.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}
