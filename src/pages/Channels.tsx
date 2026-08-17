import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import EntityCard from "../components/EntityCard.js";
import type { EntityAction } from "../components/EntityCard.js";
import Field from "../components/Field.js";
import FilterPanel from "../components/FilterPanel.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import { CHANNEL_FILTER_FIELDS, CHANNEL_TYPE_OPTIONS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { API_URL } from "../lib/api.js";
import { getUser, getUserRole } from "../services/auth-storage.js";
import { getPublicChatConfig } from "../services/agent-public-service.js";
import {
  createChannel,
  deleteChannel,
  getChannels,
  updateChannel,
  updateChannelStatus,
} from "../services/channel-service.js";
import type {
  Channel,
  ChannelConfig,
  ChannelStatus,
  ChannelType,
  ChatWidgetPosition,
} from "../types/channel.js";

type ChannelModal =
  | { mode: "create" }
  | { mode: "edit"; channel: Channel }
  | null;

const TYPE_LABELS: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  WEB_CHAT: "Chat Web",
  INSTAGRAM: "Instagram",
};

const POSITION_OPTIONS: Array<{ value: ChatWidgetPosition; label: string }> = [
  { value: "bottom-right", label: "Inferior derecha" },
  { value: "bottom-left", label: "Inferior izquierda" },
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const COLOR_PRESETS = [
  "#2563eb",
  "#0ea5e9",
  "#0d9488",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#0f172a",
];

function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

function swatchColor(value: string): string {
  const trimmed = value.trim();

  return isValidHexColor(trimmed) ? trimmed.toLowerCase() : "#2563eb";
}

const SAVE_MESSAGE = "No fue posible guardar el canal";

export default function Channels() {
  const buildFetcher = useCallback(
    (params: { type: string; status: string; search: string }) => () =>
      getChannels({
        type: params.type || undefined,
        status: params.status || undefined,
      }),
    [],
  );

  const { data, loading, error, reload, search, setSearch, values, set, clear } =
    useFilteredList(buildFetcher, {
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

  const [modal, setModal] = useState<ChannelModal>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>("WHATSAPP");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");

  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");

  const [widgetTitle, setWidgetTitle] = useState("");
  const [widgetGreeting, setWidgetGreeting] = useState("");
  const [widgetColor, setWidgetColor] = useState("");
  const [widgetPosition, setWidgetPosition] =
    useState<ChatWidgetPosition>("bottom-right");

  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  const [nameError, setNameError] = useState("");
  const [configError, setConfigError] = useState("");
  const [colorError, setColorError] = useState("");

  const webChatDefaultsApplied = useRef(false);
  const tenantNamePromiseRef = useRef<Promise<string> | null>(null);
  const formStateRef = useRef({ modal, type, name, widgetTitle, widgetGreeting });

  useEffect(() => {
    formStateRef.current = {
      modal,
      type,
      name,
      widgetTitle,
      widgetGreeting,
    };
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function resetForm(channelType: ChannelType) {
    setName("");
    setType(channelType);
    setPhoneNumber("");
    setBusinessAccountId("");
    setPhoneNumberId("");
    setInstagramAccountId("");
    setIgUserId("");
    setFacebookPageId("");
    setWidgetTitle("");
    setWidgetGreeting("");
    setWidgetColor("");
    setWidgetPosition("bottom-right");
    setAccessToken("");
    setWebhookSecret("");
    setVerifyToken("");
    setNameError("");
    setConfigError("");
    setColorError("");
    setSaveError("");
  }

  function openCreate() {
    resetForm("WHATSAPP");
    webChatDefaultsApplied.current = false;
    setModal({ mode: "create" });
  }

  function loadTenantName(): Promise<string> {
    if (!tenantNamePromiseRef.current) {
      tenantNamePromiseRef.current = tenantId
        ? getPublicChatConfig(tenantId)
            .then((config) => config.tenantName)
            .catch(() => "")
        : Promise.resolve("");
    }

    return tenantNamePromiseRef.current;
  }

  function prefillWebChatDefaults(companyName: string) {
    const current = formStateRef.current;

    if (
      !companyName ||
      webChatDefaultsApplied.current ||
      current.modal?.mode !== "create" ||
      current.type !== "WEB_CHAT"
    ) {
      return;
    }

    webChatDefaultsApplied.current = true;

    if (!current.name.trim()) {
      setName(`${companyName} Web`);
    }

    if (!current.widgetTitle.trim()) {
      setWidgetTitle(companyName);
    }

    if (!current.widgetGreeting.trim()) {
      setWidgetGreeting(
        `¡Hola {name}! Soy el asistente virtual de ${companyName}. Cuéntanos en qué podemos ayudarte.`,
      );
    }
  }

  function openEdit(channel: Channel) {
    const config = channel.config;

    setName(channel.name);
    setType(channel.type);
    setPhoneNumber(config.phoneNumber ?? "");
    setBusinessAccountId(config.businessAccountId ?? "");
    setPhoneNumberId(config.phoneNumberId ?? "");
    setInstagramAccountId(config.instagramAccountId ?? "");
    setIgUserId(config.igUserId ?? "");
    setFacebookPageId(config.facebookPageId ?? "");
    setWidgetTitle(config.widget?.title ?? "");
    setWidgetGreeting(config.widget?.greetingMessage ?? "");
    setWidgetColor(config.widget?.primaryColor ?? "");
    setWidgetPosition(config.widget?.position ?? "bottom-right");
    setAccessToken("");
    setWebhookSecret("");
    setVerifyToken("");
    setNameError("");
    setConfigError("");
    setColorError("");
    setSaveError("");
    setModal({ mode: "edit", channel });
  }

  function closeModal() {
    setModal(null);
    setNameError("");
    setConfigError("");
    setColorError("");
    setSaveError("");
  }

  function buildConfig(): ChannelConfig {
    if (type === "WHATSAPP") {
      const config: ChannelConfig = {};

      if (phoneNumber.trim()) {
        config.phoneNumber = phoneNumber.trim();
      }

      if (businessAccountId.trim()) {
        config.businessAccountId = businessAccountId.trim();
      }

      if (phoneNumberId.trim()) {
        config.phoneNumberId = phoneNumberId.trim();
      }

      return config;
    }

    if (type === "INSTAGRAM") {
      const config: ChannelConfig = {};

      if (instagramAccountId.trim()) {
        config.instagramAccountId = instagramAccountId.trim();
      }

      if (igUserId.trim()) {
        config.igUserId = igUserId.trim();
      }

      if (facebookPageId.trim()) {
        config.facebookPageId = facebookPageId.trim();
      }

      return config;
    }

    const widget: NonNullable<ChannelConfig["widget"]> = {};

    if (widgetTitle.trim()) {
      widget.title = widgetTitle.trim();
    }

    if (widgetGreeting.trim()) {
      widget.greetingMessage = widgetGreeting.trim();
    }

    if (widgetColor.trim() && isValidHexColor(widgetColor)) {
      widget.primaryColor = widgetColor.trim().toLowerCase();
    }

    widget.position = widgetPosition;

    return {
      widget,
    };
  }

  function buildCredentials(): Record<string, string> | undefined {
    const credentials: Record<string, string> = {};

    if (accessToken.trim()) {
      credentials.accessToken = accessToken.trim();
    }

    if (webhookSecret.trim()) {
      credentials.webhookSecret = webhookSecret.trim();
    }

    if (verifyToken.trim()) {
      credentials.verifyToken = verifyToken.trim();
    }

    return Object.keys(credentials).length > 0 ? credentials : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    if (type === "WHATSAPP" && modal?.mode === "create" && !phoneNumber.trim()) {
      setConfigError("El número de teléfono es obligatorio");
      hasErrors = true;
    }

    if (
      type === "INSTAGRAM" &&
      modal?.mode === "create" &&
      !instagramAccountId.trim()
    ) {
      setConfigError("El ID de cuenta de Instagram es obligatorio");
      hasErrors = true;
    }

    if (type === "WEB_CHAT" && widgetColor.trim() && !isValidHexColor(widgetColor)) {
      setColorError("Usa un color hexadecimal válido, por ejemplo #2563eb");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      if (modal?.mode === "edit") {
        await updateChannel(modal.channel.id, {
          name: name.trim(),
          ...(Object.keys(buildConfig()).length > 0
            ? { config: buildConfig() }
            : {}),
          ...(buildCredentials()
            ? { credentials: buildCredentials() }
            : {}),
        });

        toast.success("Cambios guardados");
      } else {
        await createChannel({
          type,
          name: name.trim(),
          config: buildConfig(),
          ...(buildCredentials()
            ? { credentials: buildCredentials() }
            : {}),
        });

        toast.success("Canal creado");
      }

      closeModal();
      reload();
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

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

  async function handleCopyWebhook(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL del webhook copiada");
    } catch {
      toast.error("No fue posible copiar la URL");
    }
  }

  function webhookUrlFor(channel: Channel): string | undefined {
    if (channel.type === "WEB_CHAT") {
      return undefined;
    }

    return `${API_URL}/api/webhooks/${channel.type.toLowerCase()}/${channel.id}`;
  }

  function publicChatUrl(): string | undefined {
    if (!tenantId) {
      return undefined;
    }

    return `${window.location.origin}/public/chat/${tenantId}`;
  }

  async function handleCopyPublicLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace público copiado");
    } catch {
      toast.error("No fue posible copiar el enlace");
    }
  }

  function channelActions(channel: Channel): EntityAction[] {
    const actions: EntityAction[] = [];

    if (canChangeStatus) {
      actions.push(
        channel.status === "ACTIVE"
          ? {
              icon: "power",
              ariaLabel: "Desactivar",
              onClick: () => handleStatusChange(channel, "INACTIVE"),
              variant: "secondary",
            }
          : {
              icon: "power",
              ariaLabel: "Activar",
              onClick: () => handleStatusChange(channel, "ACTIVE"),
              variant: "primary",
            },
      );
    }

    if (canEdit) {
      actions.push({
        icon: "edit",
        ariaLabel: "Editar",
        onClick: () => openEdit(channel),
        variant: "secondary",
      });
    }

    if (canDelete) {
      actions.push({
        icon: "trash",
        ariaLabel: "Eliminar",
        onClick: () => handleDelete(channel),
        variant: "danger",
      });
    }

    return actions;
  }

  function channelFields(channel: Channel): Array<{
    label: string;
    value: string;
  }> {
    const fields: Array<{ label: string; value: string }> = [];

    if (channel.type === "WHATSAPP") {
      fields.push({
        label: "Teléfono",
        value: channel.config.phoneNumber ?? "—",
      });

      if (channel.config.phoneNumberId) {
        fields.push({
          label: "ID de número",
          value: channel.config.phoneNumberId,
        });
      }
    }

    if (channel.type === "INSTAGRAM") {
      fields.push({
        label: "Cuenta",
        value: channel.config.instagramAccountId ?? "—",
      });
    }

    if (channel.type === "WEB_CHAT") {
      fields.push({
        label: "Widget",
        value: channel.config.widget?.title ?? "Configurado",
      });
    }

    fields.push(
      {
        label: "Token",
        value: channel.credentialsConfigured.accessToken
          ? "Configurado"
          : "No configurado",
      },
      {
        label: "Webhook",
        value: channel.credentialsConfigured.webhookSecret
          ? "Configurado"
          : "No configurado",
      },
    );

    const webhookUrl = webhookUrlFor(channel);

    if (webhookUrl) {
      fields.push({
        label: "URL del webhook",
        value: webhookUrl,
      });
    }

    return fields;
  }

  const isEdit = modal?.mode === "edit";
  const modalChannel = isEdit ? (modal as { mode: "edit"; channel: Channel }).channel : null;
  const modalWebhookUrl = modalChannel ? webhookUrlFor(modalChannel) : undefined;

  return (
    <main>
      <PageHeader
        title="Canales"
        description={`${data?.data.length ?? 0} canales`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo canal
            </Button>
          )
        }
      />

      <FilterPanel
        fields={CHANNEL_FILTER_FIELDS}
        values={values}
        onSet={set}
        onClear={clear}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre..."
      />

      {loading ? (
        null
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No hay canales"
          message="Conecta WhatsApp, Instagram o un chat web para atender a tus clientes"
        >
          {canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo canal
            </Button>
          )}
        </EmptyState>
      ) : (
        <section className="entity-grid">
          {data.data.map((channel) => (
            <EntityCard
              key={channel.id}
              eyebrow={TYPE_LABELS[channel.type]}
              title={channel.name}
              status={channel.status}
              fields={channelFields(channel)}
              actions={channelActions(channel)}
            >
              {webhookUrlFor(channel) && (
                <div className="channel-webhook">
                  <span className="channel-webhook__label">Webhook</span>
                  <code className="channel-webhook__url">
                    {webhookUrlFor(channel)}
                  </code>
                  <Button
                    icon="link"
                    variant="secondary"
                    onClick={() => {
                      const url = webhookUrlFor(channel);
                      if (url) {
                        void handleCopyWebhook(url);
                      }
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              )}

              {channel.type === "WEB_CHAT" && publicChatUrl() && (
                <div className="channel-webhook">
                  <span className="channel-webhook__label">
                    Enlace público
                  </span>
                  <code className="channel-webhook__url">{publicChatUrl()}</code>
                  <Button
                    icon="link"
                    variant="secondary"
                    onClick={() => {
                      const url = publicChatUrl();
                      if (url) {
                        void handleCopyPublicLink(url);
                      }
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              )}
            </EntityCard>
          ))}
        </section>
      )}

      <Modal
        open={modal !== null}
        title={isEdit ? "Editar canal" : "Nuevo canal"}
        onClose={closeModal}
      >
        <form className="modal__form" onSubmit={handleSubmit}>
          <Field
            id="channel-name"
            label="Nombre"
            type="text"
            value={name}
            error={nameError}
            onChange={(event) => {
              setName(event.target.value);
              setNameError("");
            }}
            required
          />

          <div className="form-field">
            <label htmlFor="channel-type">Canal</label>

            <select
              id="channel-type"
              value={type}
              disabled={isEdit}
              onChange={(event) => {
                const nextType = event.target.value as ChannelType;

                setType(nextType);
                setConfigError("");

                if (nextType === "WEB_CHAT") {
                  void loadTenantName().then(prefillWebChatDefaults);
                }
              }}
            >
              {CHANNEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {type === "WHATSAPP" && (
            <div className="form-card__grid">
              <Field
                id="channel-phone"
                label="Número de teléfono"
                type="text"
                value={phoneNumber}
                error={modal?.mode === "create" ? configError : undefined}
                onChange={(event) => {
                  setPhoneNumber(event.target.value);
                  setConfigError("");
                }}
                required={modal?.mode === "create"}
              />

              <Field
                id="channel-phone-id"
                label="ID del número (WhatsApp)"
                type="text"
                value={phoneNumberId}
                helper="Necesario para enviar respuestas automáticas"
                onChange={(event) => setPhoneNumberId(event.target.value)}
              />
            </div>
          )}

          {type === "INSTAGRAM" && (
            <div className="form-card__grid">
              <Field
                id="channel-ig-id"
                label="ID de cuenta de Instagram"
                type="text"
                value={instagramAccountId}
                error={modal?.mode === "create" ? configError : undefined}
                onChange={(event) => {
                  setInstagramAccountId(event.target.value);
                  setConfigError("");
                }}
                required={modal?.mode === "create"}
              />

              <Field
                id="channel-ig-user-id"
                label="ID de usuario"
                type="text"
                value={igUserId}
                onChange={(event) => setIgUserId(event.target.value)}
              />
            </div>
          )}

          {type === "WEB_CHAT" && (
            <>
              <Field
                id="channel-widget-title"
                label="Título del widget"
                type="text"
                value={widgetTitle}
                onChange={(event) => setWidgetTitle(event.target.value)}
              />

              <div className="form-field">
                <label htmlFor="channel-widget-greeting">
                  Mensaje de saludo
                </label>

                <textarea
                  id="channel-widget-greeting"
                  rows={2}
                  value={widgetGreeting}
                  placeholder="¡Hola {name}! Soy el asistente virtual..."
                  onChange={(event) => setWidgetGreeting(event.target.value)}
                />

                <div className="form-field__helper">
                  Usa {"{name}"} para incluir el nombre del cliente en el
                  saludo.
                </div>
              </div>

              <div className="form-card__grid">
              <div className="form-field">
                <label htmlFor="channel-widget-color">Color principal</label>

                <div className="color-picker">
                  <label
                    className="color-picker__swatch"
                    style={{
                      background: swatchColor(widgetColor),
                    }}
                    title="Elegir color"
                  >
                    <input
                      type="color"
                      value={swatchColor(widgetColor)}
                      onChange={(event) => {
                        setWidgetColor(event.target.value);
                        setColorError("");
                      }}
                    />
                  </label>

                  <input
                    id="channel-widget-color"
                    className="color-picker__value"
                    type="text"
                    value={widgetColor}
                    placeholder="#2563eb"
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(event) => {
                      setWidgetColor(event.target.value);
                      setColorError("");
                    }}
                  />

                  {widgetColor.trim() && (
                    <button
                      type="button"
                      className="color-picker__clear"
                      title="Quitar color personalizado"
                      aria-label="Quitar color personalizado"
                      onClick={() => {
                        setWidgetColor("");
                        setColorError("");
                      }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>

                <div className="color-picker__presets">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={
                        widgetColor.trim().toLowerCase() === preset
                          ? "color-picker__preset color-picker__preset--active"
                          : "color-picker__preset"
                      }
                      style={{
                        background: preset,
                      }}
                      title={preset}
                      aria-label={`Usar color ${preset}`}
                      onClick={() => {
                        setWidgetColor(preset);
                        setColorError("");
                      }}
                    />
                  ))}
                </div>

                {colorError && (
                  <span className="form-field__error">{colorError}</span>
                )}

                <div className="form-field__helper">
                  Color del widget en el chat público. Déjalo vacío para usar
                  el color por defecto.
                </div>
              </div>

                <div className="form-field">
                  <label htmlFor="channel-widget-position">Posición</label>

                  <select
                    id="channel-widget-position"
                    value={widgetPosition}
                    onChange={(event) =>
                      setWidgetPosition(
                        event.target.value as ChatWidgetPosition,
                      )
                    }
                  >
                    {POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {type !== "WEB_CHAT" && (
            <>
              <div className="form-card__grid">
                <Field
                  id="channel-token"
                  label="Token de acceso"
                  type="password"
                  value={accessToken}
                  helper={
                    isEdit
                      ? "Déjalo en blanco para conservar el actual"
                      : undefined
                  }
                  onChange={(event) => setAccessToken(event.target.value)}
                />

                <Field
                  id="channel-verify-token"
                  label="Token de verificación"
                  type="password"
                  value={verifyToken}
                  helper={
                    isEdit
                      ? "Déjalo en blanco para conservar el actual"
                      : undefined
                  }
                  onChange={(event) => setVerifyToken(event.target.value)}
                />
              </div>

              <Field
                id="channel-webhook-secret"
                label="Secreto del webhook"
                type="password"
                value={webhookSecret}
                helper={
                  isEdit
                    ? "Déjalo en blanco para conservar el actual"
                    : "Usado para verificar la firma de los eventos"
                }
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
            </>
          )}

          {modalWebhookUrl && (
            <div className="channel-webhook channel-webhook--modal">
              <span className="channel-webhook__label">URL del webhook</span>
              <code className="channel-webhook__url">{modalWebhookUrl}</code>
              <Button
                icon="link"
                variant="secondary"
                onClick={() => void handleCopyWebhook(modalWebhookUrl)}
              >
                Copiar
              </Button>
            </div>
          )}

          {modalChannel?.type === "WEB_CHAT" && publicChatUrl() && (
            <div className="channel-webhook channel-webhook--modal">
              <span className="channel-webhook__label">Enlace público</span>
              <code className="channel-webhook__url">{publicChatUrl()}</code>
              <Button
                icon="link"
                variant="secondary"
                onClick={() => {
                  const url = publicChatUrl();
                  if (url) {
                    void handleCopyPublicLink(url);
                  }
                }}
              >
                Copiar
              </Button>
            </div>
          )}

          {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

          <Button
            type="submit"
            variant="primary"
            icon="check"
            iconOnly
            disabled={saving}
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear canal"}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
