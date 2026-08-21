import { useEffect, useMemo, useRef, useState } from "react";
import ColorPicker from "../components/ColorPicker.js";
import FormField from "../components/FormField.js";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import MaskedValue from "../components/MaskedValue.js";
import PageHeader from "../components/PageHeader.js";
import SettingsTabs from "../components/SettingsTabs.js";
import { useSectionScrollSpy } from "../hooks/useSectionScrollSpy.js";
import { useToast } from "../hooks/useToast.js";
import { getUser } from "../services/auth-storage.js";
import { getPublicChatConfig } from "../services/agent-public-service.js";
import {
  createChannel,
  getChannel,
  updateChannel,
} from "../services/channel-service.js";
import {
  buildChannelConfig,
  buildChannelCredentials,
  COLOR_PRESETS,
  isValidHexColor,
  POSITION_OPTIONS,
  publicChatUrl,
  webhookUrlFor,
} from "../lib/channels.js";
import type {
  Channel,
  ChannelType,
  ChatWidgetPosition,
} from "../types/channel.js";

interface ChannelFormProps {
  channelId?: string;
}

interface ChannelFormState {
  name: string;
  type: ChannelType;
  phoneNumber: string;
  businessAccountId: string;
  phoneNumberId: string;
  instagramAccountId: string;
  igUserId: string;
  facebookPageId: string;
  widgetTitle: string;
  widgetGreeting: string;
  widgetColor: string;
  widgetPosition: ChatWidgetPosition;
  accessToken: string;
  webhookSecret: string;
  verifyToken: string;
}

interface SectionTab {
  id: string;
  label: string;
}

const SECTION_TABS: SectionTab[] = [
  { id: "channel-informacion", label: "Información general" },
  { id: "channel-configuracion", label: "Configuración" },
  { id: "channel-credenciales", label: "Credenciales" },
  { id: "channel-webhook", label: "Webhook / Enlace" },
];

const EMPTY_FORM: ChannelFormState = {
  name: "",
  type: "WHATSAPP",
  phoneNumber: "",
  businessAccountId: "",
  phoneNumberId: "",
  instagramAccountId: "",
  igUserId: "",
  facebookPageId: "",
  widgetTitle: "",
  widgetGreeting: "",
  widgetColor: "",
  widgetPosition: "bottom-right",
  accessToken: "",
  webhookSecret: "",
  verifyToken: "",
};

const SAVE_MESSAGE = "No fue posible guardar el canal";

function formFromChannel(channel: Channel): ChannelFormState {
  const config = channel.config;

  return {
    name: channel.name,
    type: channel.type,
    phoneNumber: config.phoneNumber ?? "",
    businessAccountId: config.businessAccountId ?? "",
    phoneNumberId: config.phoneNumberId ?? "",
    instagramAccountId: config.instagramAccountId ?? "",
    igUserId: config.igUserId ?? "",
    facebookPageId: config.facebookPageId ?? "",
    widgetTitle: config.widget?.title ?? "",
    widgetGreeting: config.widget?.greetingMessage ?? "",
    widgetColor: config.widget?.primaryColor ?? "",
    widgetPosition: config.widget?.position ?? "bottom-right",
    accessToken: "",
    webhookSecret: "",
    verifyToken: "",
  };
}

export default function ChannelForm({ channelId }: ChannelFormProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const isEdit = Boolean(channelId);
  const tenantId = getUser()?.tenantId;

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<ChannelFormState>(EMPTY_FORM);
  const [channel, setChannel] = useState<Channel | null>(null);

  const [nameError, setNameError] = useState("");
  const [configError, setConfigError] = useState("");
  const [colorError, setColorError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const webChatDefaultsApplied = useRef(false);
  const tenantNamePromiseRef = useRef<Promise<string> | null>(null);
  const formStateRef = useRef(form);

  useEffect(() => {
    formStateRef.current = form;
  });

  useEffect(() => {
    if (!channelId) {
      return;
    }

    const id = channelId;
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const result = await getChannel(id);

        if (active) {
          setChannel(result);
          setForm(formFromChannel(result));
        }
      } catch (requestError: unknown) {
        if (active) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar el canal",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [channelId]);

  const visibleTabs = useMemo(
    () =>
      SECTION_TABS.filter((tab) => {
        if (tab.id === "channel-credenciales" && form.type === "WEB_CHAT") {
          return false;
        }

        if (tab.id === "channel-webhook" && !isEdit) {
          return false;
        }

        return true;
      }),
    [form.type, isEdit],
  );

  const { activeSection, scrollToSection } = useSectionScrollSpy({
    sectionIds: useMemo(() => visibleTabs.map((tab) => tab.id), [visibleTabs]),
    enabled: !loading && !loadError,
  });

  function setField<K extends keyof ChannelFormState>(
    key: K,
    value: ChannelFormState[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
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
      isEdit ||
      current.type !== "WEB_CHAT"
    ) {
      return;
    }

    webChatDefaultsApplied.current = true;

    if (!current.name.trim()) {
      setField("name", `${companyName} Web`);
    }

    if (!current.widgetTitle.trim()) {
      setField("widgetTitle", companyName);
    }

    if (!current.widgetGreeting.trim()) {
      setField(
        "widgetGreeting",
        `¡Hola {name}! Soy el asistente virtual de ${companyName}. Cuéntanos en qué podemos ayudarte.`,
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!form.name.trim()) {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    if (form.type === "WHATSAPP" && !isEdit && !form.phoneNumber.trim()) {
      setConfigError("El número de teléfono es obligatorio");
      hasErrors = true;
    }

    if (
      form.type === "INSTAGRAM" &&
      !isEdit &&
      !form.instagramAccountId.trim()
    ) {
      setConfigError("El ID de cuenta de Instagram es obligatorio");
      hasErrors = true;
    }

    if (
      form.type === "WEB_CHAT" &&
      form.widgetColor.trim() &&
      !isValidHexColor(form.widgetColor)
    ) {
      setColorError("Usa un color hexadecimal válido, por ejemplo #2563eb");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      if (isEdit && channelId) {
        await updateChannel(channelId, {
          name: form.name.trim(),
          ...(Object.keys(buildChannelConfig(form)).length > 0
            ? { config: buildChannelConfig(form) }
            : {}),
          ...(buildChannelCredentials(form)
            ? { credentials: buildChannelCredentials(form) }
            : {}),
        });

        toast.success("Cambios guardados");
      } else {
        await createChannel({
          type: form.type,
          name: form.name.trim(),
          config: buildChannelConfig(form),
          ...(buildChannelCredentials(form)
            ? { credentials: buildChannelCredentials(form) }
            : {}),
        });

        toast.success("Canal creado");
      }

      navigate("/channels");
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
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

  async function handleCopyPublicLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace público copiado");
    } catch {
      toast.error("No fue posible copiar el enlace");
    }
  }

  if (loading || loadError) {
    return (
      <main className="master-detail">
        <AsyncBoundary loading={loading} error={loadError} loadingLabel="Cargando canal..." />
      </main>
    );
  }

  const modalWebhookUrl = channel ? webhookUrlFor(channel) : undefined;
  const publicLink = publicChatUrl(tenantId);
  const showPublicLink = isEdit && channel?.type === "WEB_CHAT" && publicLink;

  return (
    <main className="master-detail">
      <PageHeader
        title={isEdit ? "Editar canal" : "Nuevo canal"}
        description={
          isEdit
            ? "Configura el canal de atención de tu empresa"
            : "Conecta WhatsApp, Instagram o un chat web para atender a tus clientes"
        }
      />

      <SettingsTabs />

      {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

      <div className="master-detail__body">
        <div className="master-detail__main">
          <form
            id="master-detail"
            className="channel-form__form"
            onSubmit={handleSubmit}
          >
            <section id="channel-informacion" className="channel-form__card">
              <header className="channel-form__card-head">
                <span className="channel-form__card-head__icon">
                  <Icon name="settings" size={20} />
                </span>

                <span className="channel-form__card-head__text">
                  <strong>Información general</strong>

                  <small>Nombre y tipo de canal</small>
                </span>
              </header>

              <div className="channel-form__grid">
                <Field
                  id="channel-name"
                  label="Nombre"
                  type="text"
                  value={form.name}
                  error={nameError}
                  onChange={(event) => {
                    setField("name", event.target.value);
                    setNameError("");
                  }}
                  required
                />

                <Field
                  id="channel-type"
                  label="Canal"
                  as="select"
                  value={form.type}
                  disabled={isEdit}
                  onChange={(event) => {
                    const nextType = event.target.value as ChannelType;

                    setField("type", nextType);
                    setConfigError("");

                    if (nextType === "WEB_CHAT") {
                      void loadTenantName().then(prefillWebChatDefaults);
                    }
                  }}
                >
                  <option value="WHATSAPP">WhatsApp</option>

                  <option value="WEB_CHAT">Chat Web</option>

                  <option value="INSTAGRAM">Instagram</option>
                </Field>
              </div>
            </section>

            <section id="channel-configuracion" className="channel-form__card">
              <header className="channel-form__card-head">
                <span className="channel-form__card-head__icon">
                  <Icon name="channels" size={20} />
                </span>

                <span className="channel-form__card-head__text">
                  <strong>Configuración</strong>

                  <small>Datos de conexión del canal</small>
                </span>
              </header>

              {form.type === "WHATSAPP" && (
                <div className="channel-form__grid">
                  <Field
                    id="channel-phone"
                    label="Número de teléfono"
                    type="text"
                    value={form.phoneNumber}
                    error={!isEdit ? configError : undefined}
                    onChange={(event) => {
                      setField("phoneNumber", event.target.value);
                      setConfigError("");
                    }}
                    required={!isEdit}
                  />

                  <Field
                    id="channel-phone-id"
                    label="ID del número (WhatsApp)"
                    type="text"
                    value={form.phoneNumberId}
                    helper="Necesario para enviar respuestas automáticas"
                    onChange={(event) =>
                      setField("phoneNumberId", event.target.value)
                    }
                  />
                </div>
              )}

              {form.type === "INSTAGRAM" && (
                <div className="channel-form__grid">
                  <Field
                    id="channel-ig-id"
                    label="ID de cuenta de Instagram"
                    type="text"
                    value={form.instagramAccountId}
                    error={!isEdit ? configError : undefined}
                    onChange={(event) => {
                      setField("instagramAccountId", event.target.value);
                      setConfigError("");
                    }}
                    required={!isEdit}
                  />

                  <Field
                    id="channel-ig-user-id"
                    label="ID de usuario"
                    type="text"
                    value={form.igUserId}
                    onChange={(event) =>
                      setField("igUserId", event.target.value)
                    }
                  />
                </div>
              )}

              {form.type === "WEB_CHAT" && (
                <>
                  <Field
                    id="channel-widget-title"
                    label="Título del widget"
                    type="text"
                    value={form.widgetTitle}
                    onChange={(event) =>
                      setField("widgetTitle", event.target.value)
                    }
                  />

                  <Field
                    id="channel-widget-greeting"
                    label="Mensaje de saludo"
                    as="textarea"
                    rows={2}
                    value={form.widgetGreeting}
                    placeholder="¡Hola {name}! Soy el asistente virtual..."
                    onChange={(event) =>
                      setField("widgetGreeting", event.target.value)
                    }
                    hint='Usa {"{name}"} para incluir el nombre del cliente en el saludo.'
                  />

                  <div className="channel-form__grid">
                    <FormField
                      label="Color principal"
                      error={colorError}
                      hint="Color del widget en el chat público. Déjalo vacío para usar el color por defecto."
                    >
                      <ColorPicker
                      id="channel-widget-color"
                      value={form.widgetColor}
                      onChange={(value) => {
                        setField("widgetColor", value);
                        setColorError("");
                      }}
                      onClear={() => setField("widgetColor", "")}
                      presets={COLOR_PRESETS}
                      swatchTitle="Elegir color"
                    /></FormField>

                    <Field
                      id="channel-widget-position"
                      label="Posición"
                      as="select"
                      value={form.widgetPosition}
                      onChange={(event) =>
                        setField(
                          "widgetPosition",
                          event.target.value as ChatWidgetPosition,
                        )
                      }
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Field>
                  </div>
                </>
              )}
            </section>

            {form.type !== "WEB_CHAT" && (
              <section id="channel-credenciales" className="channel-form__card">
                <header className="channel-form__card-head">
                  <span className="channel-form__card-head__icon">
                    <Icon name="lock" size={20} />
                  </span>

                  <span className="channel-form__card-head__text">
                    <strong>Credenciales</strong>

                    <small>Tokens de acceso y verificación</small>
                  </span>
                </header>

                <div className="channel-form__grid">
                  <Field
                    id="channel-token"
                    label="Token de acceso"
                    type="password"
                    value={form.accessToken}
                    helper={
                      isEdit
                        ? "Déjalo en blanco para conservar el actual"
                        : undefined
                    }
                    onChange={(event) =>
                      setField("accessToken", event.target.value)
                    }
                  />

                  <Field
                    id="channel-verify-token"
                    label="Token de verificación"
                    type="password"
                    value={form.verifyToken}
                    helper={
                      isEdit
                        ? "Déjalo en blanco para conservar el actual"
                        : undefined
                    }
                    onChange={(event) =>
                      setField("verifyToken", event.target.value)
                    }
                  />
                </div>

                <Field
                  id="channel-webhook-secret"
                  label="Secreto del webhook"
                  type="password"
                  value={form.webhookSecret}
                  helper={
                    isEdit
                      ? "Déjalo en blanco para conservar el actual"
                      : "Usado para verificar la firma de los eventos"
                  }
                  onChange={(event) =>
                    setField("webhookSecret", event.target.value)
                  }
                />
              </section>
            )}

            {(modalWebhookUrl || showPublicLink) && (
              <section id="channel-webhook" className="channel-form__card">
                <header className="channel-form__card-head">
                  <span className="channel-form__card-head__icon">
                    <Icon name="link" size={20} />
                  </span>

                  <span className="channel-form__card-head__text">
                    <strong>Webhook / Enlace</strong>

                    <small>URLs para conectar el canal</small>
                  </span>
                </header>

                {modalWebhookUrl && (
                  <div className="channel-webhook channel-webhook--modal">
                    <span className="channel-webhook__label">
                      URL del webhook
                    </span>

                    <code className="channel-webhook__url">
                      {modalWebhookUrl}
                    </code>

                    <Button
                      icon="link"
                      variant="secondary"
                      onClick={() => void handleCopyWebhook(modalWebhookUrl)}
                    >
                      Copiar
                    </Button>
                  </div>
                )}

                {showPublicLink && (
                  <div className="channel-webhook channel-webhook--modal">
                    <span className="channel-webhook__label">
                      Enlace público
                    </span>

                    <MaskedValue
                      value={publicLink}
                      className="channel-webhook__url"
                    />

                    <div className="channel-webhook__actions">
                      <Button
                        icon="link"
                        variant="secondary"
                        onClick={() => {
                          window.open(
                            publicLink,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                      >
                        Abrir
                      </Button>

                      <Button
                        icon="link"
                        variant="secondary"
                        onClick={() => void handleCopyPublicLink(publicLink)}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </form>
        </div>

        <aside className="channel-form__panel">
          <nav className="channel-form__nav" aria-label="Secciones del canal">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeSection === tab.id
                    ? "channel-form__tab channel-form__tab--active"
                    : "channel-form__tab"
                }
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <Button
            type="submit"
            form="master-detail"
            icon="check"
            disabled={saving}
            className="channel-form__panel-save"
          >
            {saving
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear canal"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/channels")}
          >
            Cancelar
          </Button>
        </aside>
      </div>
    </main>
  );
}
