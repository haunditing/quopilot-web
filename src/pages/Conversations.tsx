import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  Filter,
  Globe,
  MessageCircle,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  Smile,
  Trash2,
  UserRound,
} from "lucide-react";

import Button from "../components/Button.js";
import Icon from "../components/Icon.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import StatusBadge from "../components/StatusBadge.js";
import "../components/DataListView/DataListView.css";
import { getUser, getUserRole } from "../services/auth-storage.js";
import { useToast } from "../hooks/useToast.js";
import {
  claimConversation,
  getConversationMessages,
  getConversationTyping,
  getInboxConversations,
  reopenConversation,
  replyToConversation,
  setConversationTyping,
} from "../services/inbox-service.js";
import type {
  ChatConversation,
  ChatMessage,
  ConversationChannel,
} from "../types/agent-conversation.js";

type ChannelFilter = ConversationChannel | "ALL";
type StatusTab = "ALL" | "OPEN" | "PENDING" | "CLOSED";
type BaseAssignee = "ANY" | "UNASSIGNED" | "MINE";
type AssigneeFilter = BaseAssignee | `user:${string}`;

const CHANNEL_LABELS: Record<ConversationChannel, string> = {
  WHATSAPP: "WhatsApp",
  WEB_CHAT: "Chat Web",
  INSTAGRAM: "Instagram",
};

const CHANNEL_FILTER_OPTIONS: Array<{
  value: ChannelFilter;
  label: string;
}> = [
  { value: "ALL", label: "Todos" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEB_CHAT", label: "Chat Web" },
  { value: "INSTAGRAM", label: "Instagram" },
];

const STATUS_FILTER_OPTIONS: Array<{
  value: StatusTab;
  label: string;
}> = [
  { value: "ALL", label: "Todas" },
  { value: "OPEN", label: "Abiertas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CLOSED", label: "Cerradas" },
];

const BASE_ASSIGNEE_OPTIONS: Array<{
  value: BaseAssignee;
  label: string;
}> = [
  { value: "ANY", label: "Todos" },
  { value: "MINE", label: "Mías" },
  { value: "UNASSIGNED", label: "Sin asignar" },
];

const CHANNEL_ICONS: Record<
  ConversationChannel,
  { Icon: typeof MessageCircle; className: string }
> = {
  WHATSAPP: { Icon: MessageCircle, className: "inbox__channel-dot--whatsapp" },
  WEB_CHAT: { Icon: Globe, className: "inbox__channel-dot--webchat" },
  INSTAGRAM: { Icon: Camera, className: "inbox__channel-dot--instagram" },
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

function formatClockTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
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

function conversationInitial(conversation: ChatConversation): string {
  return conversationTitle(conversation).charAt(0).toUpperCase();
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
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("ANY");
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const filtersBarRef = useRef<HTMLDivElement | null>(null);

  const [conversations, setConversations] = useState<ChatConversation[] | null>(
    null,
  );
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [reopening, setReopening] = useState(false);
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
    function handleClickOutside(event: MouseEvent) {
      if (
        filtersBarRef.current &&
        !filtersBarRef.current.contains(event.target as Node)
      ) {
        setOpenChipKey(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const canClaim =
    canReply &&
    !selectedConversation?.assignedTo &&
    selectedConversation?.status === "OPEN";

  const availableAgents = useMemo(() => {
    const map = new Map<string, string>();

    for (const conversation of conversations ?? []) {
      if (
        conversation.assignedTo &&
        conversation.assignedTo !== currentUserId
      ) {
        map.set(
          conversation.assignedTo,
          conversation.assignedAgentName ?? "Asesor",
        );
      }
    }

    return [...map.entries()].map(([id, name]) => ({
      value: `user:${id}` as const,
      label: name,
    }));
  }, [conversations, currentUserId]);

  const channelFilterLabel =
    CHANNEL_FILTER_OPTIONS.find((option) => option.value === channelFilter)
      ?.label ?? "Todos";

  const statusFilterLabel =
    STATUS_FILTER_OPTIONS.find((option) => option.value === statusTab)?.label ??
    "Todas";

  const assigneeFilterLabel = assigneeFilter.startsWith("user:")
    ? (availableAgents.find((option) => option.value === assigneeFilter)
        ?.label ?? "Asesor")
    : (BASE_ASSIGNEE_OPTIONS.find((option) => option.value === assigneeFilter)
        ?.label ?? "Todos");

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    channelFilter !== "ALL" ||
    statusTab !== "ALL" ||
    assigneeFilter !== "ANY";

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusTab("ALL");
    setChannelFilter("ALL");
    setAssigneeFilter("ANY");
    setOpenChipKey(null);
  }, []);

  const visibleConversations = useMemo(() => {
    const list = conversations ?? [];

    const term = searchTerm.trim().toLowerCase();

    return list.filter((conversation) => {
      if (statusTab === "OPEN" && conversation.status !== "OPEN") {
        return false;
      }

      if (
        statusTab === "PENDING" &&
        !(conversation.status === "OPEN" && !conversation.assignedTo)
      ) {
        return false;
      }

      if (statusTab === "CLOSED" && conversation.status !== "CLOSED") {
        return false;
      }

      if (channelFilter !== "ALL" && conversation.channel !== channelFilter) {
        return false;
      }

      if (assigneeFilter === "UNASSIGNED" && conversation.assignedTo) {
        return false;
      }

      if (
        assigneeFilter === "MINE" &&
        conversation.assignedTo !== currentUserId
      ) {
        return false;
      }

      if (
        assigneeFilter.startsWith("user:") &&
        conversation.assignedTo !== assigneeFilter.slice("user:".length)
      ) {
        return false;
      }

      if (term) {
        const haystack = [
          conversationTitle(conversation),
          conversation.customer?.phone ?? "",
          conversation.customer?.email ?? "",
          conversation.lastMessage?.content ?? "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [
    conversations,
    searchTerm,
    statusTab,
    channelFilter,
    assigneeFilter,
    currentUserId,
  ]);

  const selectConversation = useCallback(async (conversationId: string) => {
    setSelectedId(conversationId);
    setShowDetailOnMobile(true);
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
  }, []);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError("");

    try {
      const result = await getInboxConversations({
        page: 1,
        limit: 50,
      });

      setConversations(result.data);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "No fue posible cargar",
      );
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setListLoading(true);
      setListError("");

      try {
        const result = await getInboxConversations({
          page: 1,
          limit: 50,
        });

        if (!cancelled) {
          setConversations(result.data);

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
                  (conversation) => conversation.assignedTo === currentUserId,
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
  }, [currentUserId, selectConversation]);

  useEffect(() => {
    if (listLoading || threadLoading || sending) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const [listResult, threadResult, typingResult] = await Promise.all([
            getInboxConversations({
              page: 1,
              limit: 50,
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
                  (conversation) => conversation.assignedTo === currentUserId,
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
                .filter((message) => !isOptimisticMessageId(message._id))
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
              typingResult.isTyping && typingResult.senderType === "CUSTOMER",
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
  }, [selectedId, listLoading, threadLoading, sending, currentUserId, toast]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending, threadLoading]);

  async function handleClaim() {
    if (!selectedId || claiming) {
      return;
    }

    setClaiming(true);

    try {
      await claimConversation(selectedId);
      toast.success("Conversación tomada");
      await loadConversations();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible tomar la conversación",
      );
    } finally {
      setClaiming(false);
    }
  }

  async function handleReopen() {
    if (!selectedId || reopening) {
      return;
    }

    setReopening(true);

    try {
      await reopenConversation(selectedId);
      toast.success("Conversación reabierta");
      await loadConversations();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible reabrir la conversación",
      );
    } finally {
      setReopening(false);
    }
  }

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

      <div
        className={
          showDetailOnMobile && selectedConversation
            ? "inbox inbox--show-detail"
            : "inbox"
        }
      >
        {/* ============ PANEL MASTER ============ */}
        <aside className="inbox__master">
          <div className="inbox__search">
            <Search size={16} className="inbox__search-icon" />

            <input
              type="text"
              value={searchTerm}
              placeholder="Buscar conversaciones..."
              aria-label="Buscar conversaciones"
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <Button
              icon="filter"
              iconOnly
              className={`btn-filter-trigger ${showFilters ? "active" : ""}`}
              title="Filtrar conversaciones"
              onClick={() => {
                setShowFilters((current) => !current);
                setOpenChipKey(null);
              }}
            >
              Filtrar
            </Button>
          </div>

          {showFilters && (
          <div className="filters-bar inbox__filters" ref={filtersBarRef}>
            <div className="filters-group">
              {/* Chip Canal */}
              <div className="chip-wrapper">
                <button
                  type="button"
                  className={`filter-chip ${channelFilter !== "ALL" ? "has-value" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenChipKey((current) =>
                      current === "channel" ? null : "channel",
                    );
                  }}
                >
                  <Filter size={14} className="chip-icon" />

                  <span>
                    Canal
                    {channelFilter !== "ALL" ? ` · ${channelFilterLabel}` : ""}
                  </span>

                  <ChevronDown size={14} className="chip-arrow" />
                </button>

                {openChipKey === "channel" && (
                  <div className="chip-popover">
                    <div className="chip-popover-header">
                      <span className="chip-popover-title">Canal</span>

                      {channelFilter !== "ALL" && (
                        <button
                          type="button"
                          className="btn-clear-chip"
                          title="Limpiar filtro"
                          onClick={(event) => {
                            event.stopPropagation();
                            setChannelFilter("ALL");
                            setOpenChipKey(null);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="chip-popover-body">
                      <select
                        className="chip-select"
                        value={channelFilter}
                        onChange={(event) => {
                          setChannelFilter(event.target.value as ChannelFilter);
                          setOpenChipKey(null);
                        }}
                        autoFocus
                      >
                        {CHANNEL_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Chip Asignación */}
              <div className="chip-wrapper">
                <button
                  type="button"
                  className={`filter-chip ${assigneeFilter !== "ANY" ? "has-value" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenChipKey((current) =>
                      current === "assignee" ? null : "assignee",
                    );
                  }}
                >
                  <Filter size={14} className="chip-icon" />

                  <span>
                    Asignación
                    {assigneeFilter !== "ANY"
                      ? ` · ${assigneeFilterLabel}`
                      : ""}
                  </span>

                  <ChevronDown size={14} className="chip-arrow" />
                </button>

                {openChipKey === "assignee" && (
                  <div className="chip-popover">
                    <div className="chip-popover-header">
                      <span className="chip-popover-title">Asignación</span>

                      {assigneeFilter !== "ANY" && (
                        <button
                          type="button"
                          className="btn-clear-chip"
                          title="Limpiar filtro"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAssigneeFilter("ANY");
                            setOpenChipKey(null);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="chip-popover-body">
                      <select
                        className="chip-select"
                        value={assigneeFilter}
                        onChange={(event) => {
                          setAssigneeFilter(
                            event.target.value as AssigneeFilter,
                          );
                          setOpenChipKey(null);
                        }}
                        autoFocus
                      >
                        {BASE_ASSIGNEE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}

                        {availableAgents.length > 0 && (
                          <optgroup label="Asesores">
                            {availableAgents.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Chip Estado */}
              <div className="chip-wrapper">
                <button
                  type="button"
                  className={`filter-chip ${statusTab !== "ALL" ? "has-value" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenChipKey((current) =>
                      current === "status" ? null : "status",
                    );
                  }}
                >
                  <Filter size={14} className="chip-icon" />

                  <span>
                    Estado
                    {statusTab !== "ALL" ? ` · ${statusFilterLabel}` : ""}
                  </span>

                  <ChevronDown size={14} className="chip-arrow" />
                </button>

                {openChipKey === "status" && (
                  <div className="chip-popover">
                    <div className="chip-popover-header">
                      <span className="chip-popover-title">Estado</span>

                      {statusTab !== "ALL" && (
                        <button
                          type="button"
                          className="btn-clear-chip"
                          title="Limpiar filtro"
                          onClick={(event) => {
                            event.stopPropagation();
                            setStatusTab("ALL");
                            setOpenChipKey(null);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="chip-popover-body">
                      <select
                        className="chip-select"
                        value={statusTab}
                        onChange={(event) => {
                          setStatusTab(event.target.value as StatusTab);
                          setOpenChipKey(null);
                        }}
                        autoFocus
                      >
                        {STATUS_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                icon="trash"
                iconOnly
                className="btn-remove-filters"
                onClick={clearAllFilters}
              >
                Remover filtros
              </Button>
            )}
          </div>
          )}

          <div className="inbox__items">
            {listLoading ? (
              <div className="inbox__list-state">
                Cargando conversaciones...
              </div>
            ) : listError ? (
              <PageState
                kind="error"
                title="No fue posible cargar"
                message={listError}
              />
            ) : visibleConversations.length === 0 ? (
              <div className="inbox__list-state">
                {conversations && conversations.length > 0
                  ? "Ninguna conversación coincide con los filtros."
                  : "Los mensajes de tus canales aparecerán aquí."}
              </div>
            ) : (
              visibleConversations.map((conversation) => {
                const channelIcon = CHANNEL_ICONS[conversation.channel];

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    className={
                      selectedId === conversation._id
                        ? "inbox__item inbox__item--active"
                        : "inbox__item"
                    }
                    onClick={() => {
                      void selectConversation(conversation._id);
                    }}
                  >
                    <span className="inbox__item-avatar">
                      {conversationInitial(conversation)}

                      <span
                        className={`inbox__channel-dot ${channelIcon.className}`}
                        title={CHANNEL_LABELS[conversation.channel]}
                      >
                        <channelIcon.Icon size={10} />
                      </span>
                    </span>

                    <span className="inbox__item-body">
                      <span className="inbox__item-top">
                        <strong>{conversationTitle(conversation)}</strong>

                        <time>
                          {formatRelativeTime(
                            conversation.lastMessageAt ??
                              conversation.lastMessage?.createdAt,
                          )}
                        </time>
                      </span>

                      <span className="inbox__preview">
                        {conversation.lastMessage?.content || "Sin mensajes"}
                      </span>

                      <span className="inbox__item-meta">
                        <span className="inbox__item-assignee">
                          {conversation.assignedTo
                            ? conversation.assignedTo === currentUserId
                              ? "Tuya"
                              : (conversation.assignedAgentName ?? "Asignada")
                            : ""}
                        </span>

                        <StatusBadge status={conversation.status} />
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ============ PANEL DETAIL ============ */}
        <section className="inbox__detail">
          {!selectedConversation ? (
            <div className="inbox__placeholder">
              <Icon name="chat" size={40} />

              <p>Selecciona una conversación para ver los mensajes</p>
            </div>
          ) : (
            <>
              <header className="inbox__chat-header">
                <button
                  type="button"
                  className="inbox__back"
                  aria-label="Volver a conversaciones"
                  title="Volver a conversaciones"
                  onClick={() => setShowDetailOnMobile(false)}
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="inbox__chat-header-info">
                  <strong>{conversationTitle(selectedConversation)}</strong>

                  <small>
                    {CHANNEL_LABELS[selectedConversation.channel]}

                    {selectedConversation.assignedTo
                      ? selectedConversation.assignedTo === currentUserId
                        ? " · Asignada a ti"
                        : ` · Asignada a ${selectedConversation.assignedAgentName ?? "otro agente"}`
                      : " · Sin asignar"}
                  </small>
                </div>

                <div className="inbox__chat-header-actions">
                  {canReply && selectedConversation.status === "CLOSED" && (
                    <button
                      type="button"
                      className="inbox__header-action"
                      title="Reabrir chat"
                      aria-label="Reabrir chat"
                      disabled={reopening}
                      onClick={() => {
                        void handleReopen();
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="inbox__header-action"
                    title="Ver ficha del cliente"
                    aria-label="Ver ficha del cliente"
                    onClick={() => navigate("/customers")}
                  >
                    <UserRound size={16} />
                  </button>

                  <StatusBadge status={selectedConversation.status} />
                </div>
              </header>

              <div className="inbox__thread">
                {threadLoading ? (
                  <div className="inbox__thread-state">
                    Cargando mensajes...
                  </div>
                ) : threadError ? (
                  <PageState
                    kind="error"
                    title="No fue posible cargar"
                    message={threadError}
                  />
                ) : (
                  <div className="inbox__messages">
                    {messages.length === 0 && !sending ? (
                      <p className="inbox__thread-empty">
                        Aún no hay mensajes en esta conversación.
                      </p>
                    ) : (
                      messages.map((message) => {
                        if (message.senderType === "SYSTEM") {
                          return (
                            <div
                              key={message._id}
                              className="inbox__system-banner"
                            >
                              {message.content}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={message._id}
                            className={
                              message.direction === "INBOUND"
                                ? "inbox__bubble inbox__bubble--customer"
                                : "inbox__bubble inbox__bubble--agent"
                            }
                          >
                            <p>{message.content}</p>

                            <span className="inbox__bubble-meta">
                              {senderLabel(message)}
                              {" · "}
                              {formatClockTime(message.createdAt)}
                            </span>
                          </div>
                        );
                      })
                    )}

                    {sending && (
                      <div className="inbox__bubble inbox__bubble--agent inbox__bubble--typing">
                        <span
                          className="inbox__typing"
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
              </div>

              {selectedConversation.status === "CLOSED" ? (
                <div className="inbox__composer inbox__composer--locked">
                  <p className="inbox__composer-hint">
                    Esta conversación está cerrada. Reábrela para responder al
                    cliente.
                  </p>

                  {canReply && (
                    <Button
                      variant="primary"
                      disabled={reopening}
                      onClick={() => {
                        void handleReopen();
                      }}
                    >
                      {reopening ? "Reabriendo..." : "Reabrir chat"}
                    </Button>
                  )}
                </div>
              ) : canReply && !assignedToOther ? (
                <form
                  className="inbox__composer"
                  onSubmit={(event) => {
                    void handleSend(event);
                  }}
                >
                  {sendError && (
                    <p className="inbox__composer-error">{sendError}</p>
                  )}

                  {notDelivered && (
                    <p className="inbox__composer-error">
                      La respuesta se guardó, pero el canal no tiene token o
                      configuración de envío, por lo que no se entregó.
                    </p>
                  )}

                  <div className="inbox__composer-row">
                    <button
                      type="button"
                      className="inbox__composer-tool"
                      title="Adjuntar archivo"
                      aria-label="Adjuntar archivo"
                    >
                      <Paperclip size={18} />
                    </button>

                    <button
                      type="button"
                      className="inbox__composer-tool"
                      title="Emojis"
                      aria-label="Emojis"
                    >
                      <Smile size={18} />
                    </button>

                    <textarea
                      value={draft}
                      placeholder="Responde como asesor..."
                      aria-label="Respuesta del asesor"
                      rows={1}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        notifyTyping();
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          draft.trim()
                        ) {
                          event.preventDefault();

                          const form = event.currentTarget.form;

                          if (form) {
                            form.requestSubmit();
                          }
                        }
                      }}
                    />

                    <button
                      type="submit"
                      className="inbox__composer-send"
                      disabled={sending || !draft.trim()}
                      title="Enviar"
                      aria-label="Enviar"
                    >
                      <Send size={18} />
                    </button>
                  </div>

                  {customerTyping && (
                    <p className="inbox__composer-hint inbox__composer-hint--typing">
                      El cliente está escribiendo...
                    </p>
                  )}
                </form>
              ) : canClaim ? (
                <div className="inbox__composer inbox__composer--locked">
                  <p className="inbox__composer-hint">
                    Esta conversación no tiene agente asignado.
                  </p>

                  <Button
                    variant="primary"
                    disabled={claiming}
                    onClick={() => {
                      void handleClaim();
                    }}
                  >
                    {claiming
                      ? "Tomando..."
                      : "Tomar control de la conversación"}
                  </Button>
                </div>
              ) : canReply && assignedToOther ? (
                <div className="inbox__composer inbox__composer--locked">
                  <p className="inbox__composer-hint">
                    Esta conversación fue asignada a{" "}
                    {selectedConversation?.assignedAgentName ?? "otro agente"}.
                    Solo él puede responder al cliente.
                  </p>
                </div>
              ) : (
                <div className="inbox__composer inbox__composer--locked">
                  <p className="inbox__composer-hint">
                    Estás viendo el inbox en modo lectura.
                  </p>

                  <span className="inbox__composer-locked-icon">
                    <UserRound size={14} />
                    Solo los agentes pueden responder mensajes
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
