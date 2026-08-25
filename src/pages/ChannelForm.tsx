import { useEffect, useMemo, useRef, useState } from "react";
import ColorPicker from "../components/ColorPicker.js";
import FormField from "../components/FormField.js";
import { PageContainer } from "../components/PageContainer.js";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import WebChatAccessPanel from "../components/channels/WebChatAccessPanel.js";
import PageHeader from "../components/PageHeader.js";

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

/** Tab de instalación disponible solo para canales WebChat. */
function sectionTabsFor(type: ChannelType): SectionTab[] {
  const tabs =
    type === "WEB_CHAT"
      ? [...SECTION_TABS, { id: "channel-instalacion", label: "Instalación web" }]
      : [...SECTION_TABS];

  return tabs;
}

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
  /** Canal WEB_CHAT recién creado: muestra el panel de instalación. */
  const [createdToken, setCreatedToken] = useState<string | null>(null);

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
      sectionTabsFor(form.type).filter((tab) => {
        if (
          tab.id === "channel-instalacion" &&
          (!isEdit || !channel?.publicToken)
        ) {
          return false;
        }

        if (tab.id === "channel-credenciales" && form.type === "WEB_CHAT") {
          return true;
        }

        if (tab.id === "channel-webhook" && !isEdit) {
          return false;
        }

        return true;
      }),
    [form.type, isEdit, channel?.publicToken],
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
      } else if (form.type === "WEB_CHAT") {
        const created = await createChannel({
          type: form.type,
          name: form.name.trim(),
          config: buildChannelConfig(form),
          ...(buildChannelCredentials(form)
            ? { credentials: buildChannelCredentials(form) }
            : {}),
        });

        toast.success("Canal creado");

        // Éxito: mostrar snippet y URL inmediatamente sin salir del formulario.
        setCreatedToken(created.publicToken ?? null);
        setSaving(false);

        return;
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
        navigate("/channels");
      }
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }



  if (loading || loadError) {
    return (
      <PageContainer>
        <AsyncBoundary loading={loading} error={loadError} loadingLabel="Cargando canal..." />
      </PageContainer>
    );
  }


  if (createdToken) {
    return (
      <PageContainer className="p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-success"
              aria-hidden="true"
            >
              <Icon name="check" size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-ink-strong">
                ¡Canal WebChat creado!
              </h1>
              <p className="text-sm text-ink-muted">
                Instala el widget en tu sitio o comparte el enlace directo.
              </p>
            </div>
          </div>

          <WebChatAccessPanel token={createdToken} />

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => navigate("/channels")}>
              Ir a mis canales
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={isEdit ? "Editar canal" : "Nuevo canal"}
        description={
          isEdit
            ? "Configura el canal de atención de tu empresa"
            : "Conecta WhatsApp, Instagram o un chat web para atender a tus clientes"
        }
      />

      {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6 max-[860px]:grid-cols-1">
        <div className="flex flex-col gap-4 min-w-0">
          <form
            id="channel-form"
            className="flex flex-col gap-6"
            onSubmit={handleSubmit}
          >
            <section id="channel-informacion" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6">
              <header className="flex flex-row items-start gap-3 w-full mb-5">
                <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                  <Icon name="settings" size={20} />
                </span>

                <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] leading-normal text-slate-500">
                  <strong>Información general</strong>

                  <small>Nombre y tipo de canal</small>
                </span>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <section id="channel-configuracion" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6">
              <header className="flex flex-row items-start gap-3 w-full mb-5">
                <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                  <Icon name="channels" size={20} />
                </span>

                <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] leading-normal text-slate-500">
                  <strong>Configuración</strong>

                  <small>Datos de conexión del canal</small>
                </span>
              </header>

              {form.type === "WHATSAPP" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <section id="channel-credenciales" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6">
                <header className="flex flex-row items-start gap-3 w-full mb-5">
                  <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                    <Icon name="lock" size={20} />
                  </span>

                  <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] leading-normal text-slate-500">
                    <strong>Credenciales</strong>

                    <small>Tokens de acceso y verificación</small>
                  </span>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {isEdit && form.type === "WEB_CHAT" && channel?.publicToken && (
              <section id="channel-instalacion" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6">
                <header className="flex flex-row items-start gap-3 w-full mb-5">
                  <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                    <Icon name="globe" size={20} />
                  </span>

                  <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] leading-normal text-slate-500">
                    <strong>Instalación del widget</strong>
                    <small>
                      Conecta el chat con tu sitio web o compártelo en redes
                      sociales usando el token público del canal.
                    </small>
                  </span>
                </header>

                <WebChatAccessPanel token={channel.publicToken} />
              </section>
        )}

        {isEdit && form.type === "WEB_CHAT" && channel?.publicToken && (
          <section
            id="channel-instalacion"
            className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6"
          >
            <header className="flex flex-row items-start gap-3 w-full mb-5">
              <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                <Icon name="globe" size={20} />
              </span>

              <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] leading-normal text-slate-500">
                <strong>Instalación del widget</strong>
                <small>
                  Conecta el chat con tu sitio web o compártelo en redes
                  sociales usando el token público del canal.
                </small>
              </span>
            </header>

            {channel?.publicToken ? (
              <WebChatAccessPanel token={channel.publicToken} />
            ) : (
              <p className="text-sm text-ink-muted">
                El token público se generará al guardar el canal.
              </p>
            )}
          </section>
        )}
          </form>
        </div>

        <aside className="sticky top-5 max-[860px]:static flex flex-col gap-4 p-5 rounded-xl border border-line bg-surface-card shadow-card">
          <nav className="flex flex-col gap-1" aria-label="Secciones del canal">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeSection === tab.id
                    ? "flex items-center w-full px-3.5 py-2.5 rounded-lg border text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 bg-accent-soft border-accent-border text-accent"
                    : "flex items-center w-full px-3.5 py-2.5 rounded-lg border border-transparent text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
                }
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <Button
            type="submit"
            form="min-h-full bg-surface-light"
            icon="check"
            disabled={saving}
            className="w-full justify-center"
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
    </PageContainer>
  );
}
