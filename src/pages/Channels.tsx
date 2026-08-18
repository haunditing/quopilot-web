import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit2, Power, Trash2 } from "lucide-react";
import Button from "../components/Button.js";
import MaskedValue from "../components/MaskedValue.js";
import PageHeader from "../components/PageHeader.js";
import DataListView from "../components/DataListView/DataListView.js";
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import {
  CHANNEL_STATUS_OPTIONS,
  CHANNEL_TYPE_OPTIONS,
} from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { TYPE_LABELS, publicChatUrl, webhookUrlFor } from "../lib/channels.js";
import { getUser, getUserRole } from "../services/auth-storage.js";
import {
  deleteChannel,
  getChannels,
  updateChannelStatus,
} from "../services/channel-service.js";
import type {
  Channel,
  ChannelStatus,
} from "../types/channel.js";

const STATUS_BADGE_CLASS: Record<ChannelStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge badge-danger",
};

const STATUS_LABEL = Object.fromEntries(
  CHANNEL_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ChannelStatus, string>;

export default function Channels() {
  const navigate = useNavigate();

  const buildFetcher = useCallback(
    (params: { type: string; status: string; search: string }) => () =>
      getChannels({
        type: params.type || undefined,
        status: params.status || undefined,
      }),
    [],
  );

  const { data, loading, reload, set } = useFilteredList(buildFetcher, {
    type: "",
    status: "",
  });

  const role = getUserRole();
  const tenantId = getUser()?.tenantId;
  const canCreate = can(role, "channels", "create");
  const canChangeStatus = can(role, "channels", "changeStatus");
  const canEdit = can(role, "channels", "update");
  const canDelete = can(role, "channels", "delete");

  const toast = useToast();
  const { confirm } = useConfirm();

  async function handleStatusChange(channel: Channel, status: ChannelStatus) {
    const statusAction =
      status === "ACTIVE"
        ? { label: "Activar", message: "El canal volverá a recibir mensajes." }
        : {
            label: "Desactivar",
            message: "El canal dejará de recibir mensajes.",
          };

    const confirmed = await confirm({
      title: `${statusAction.label} canal`,
      message: `¿${statusAction.label} "${channel.name}"? ${statusAction.message}`,
      confirmLabel: statusAction.label,
    });

    if (!confirmed) {
      return;
    }

    try {
      await updateChannelStatus(channel.id, status);
      reload();
      toast.success(`Canal ${statusAction.label.toLowerCase()}`);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cambiar el estado del canal",
      );
    }
  }

  async function handleDelete(channel: Channel) {
    const confirmed = await confirm({
      title: "Eliminar canal",
      message: `¿Eliminar "${channel.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteChannel(channel.id);
      reload();
      toast.success("Canal eliminado");
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible eliminar el canal",
      );
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      toast.error("No fue posible copiar la URL");
    }
  }

  const channelFilters = useMemo<FilterOptionI[]>(
    () => [
      {
        key: "type",
        label: "Canal",
        type: "select",
        options: CHANNEL_TYPE_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: CHANNEL_STATUS_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
    ],
    [],
  );

  const columns: ColumnSpec<Channel>[] = [
    {
      key: "name",
      label: "Nombre",
      render: (channel) => (
        <div className="cell-main">
          <strong>{channel.name}</strong>
          <span className="cell-sub">{TYPE_LABELS[channel.type]}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (channel) => (
        <span className={STATUS_BADGE_CLASS[channel.status]}>
          {STATUS_LABEL[channel.status]}
        </span>
      ),
    },
    {
      key: "webhook",
      label: "Webhook / Enlace",
      render: (channel) => {
        const url = webhookUrlFor(channel) ?? publicChatUrl(tenantId);

        if (!url) {
          return "—";
        }

        const isPublicLink = !webhookUrlFor(channel);

        return (
          <div className="cell-webhook">
            {isPublicLink ? (
              <MaskedValue
                value={url}
                asLink
                className="cell-webhook__url cell-webhook__url--link"
              />
            ) : (
              <code className="cell-webhook__url" title={url}>
                {url}
              </code>
            )}
            <button
              type="button"
              className="btn-icon-action"
              title="Copiar URL"
              aria-label="Copiar URL"
              onClick={() => {
                void handleCopy(url);
              }}
            >
              <Copy size={14} />
            </button>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (channel) => (
        <div className="row-actions">
          {canChangeStatus && (
            <button
              type="button"
              className="btn-icon-action"
              title={channel.status === "ACTIVE" ? "Desactivar" : "Activar"}
              aria-label={
                channel.status === "ACTIVE" ? "Desactivar" : "Activar"
              }
              onClick={() =>
                handleStatusChange(
                  channel,
                  channel.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                )
              }
            >
              <Power size={16} />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="btn-icon-action"
              title="Editar"
              aria-label="Editar"
              onClick={() => navigate(`/channels/${channel.id}`)}
            >
              <Edit2 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn-icon-action btn-danger"
              title="Eliminar"
              aria-label="Eliminar"
              onClick={() => handleDelete(channel)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHeader
        title="Canales"
        description={`${data?.data.length ?? 0} canales`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={() => navigate("/channels/new")}>
              Nuevo canal
            </Button>
          )
        }
      />

      <DataListView<Channel>
        items={data?.data ?? []}
        columns={columns}
        rowKey={(channel) => channel.id}
        filters={channelFilters}
        loading={loading}
        emptyState="Conecta WhatsApp, Instagram o un chat web para atender a tus clientes"
        onFilterChange={(filters) => {
          set("type", filters.type ?? "");
          set("status", filters.status ?? "");
        }}
      />
    </main>
  );
}