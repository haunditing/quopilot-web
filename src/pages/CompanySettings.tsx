import { useEffect, useState } from "react";
import ColorPicker from "../components/ColorPicker.js";
import FormField from "../components/FormField.js";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import Combobox from "../components/Combobox.js";
import Icon from "../components/Icon.js";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import ImageUploader from "../components/ImageUploader.js";
import PageHeader from "../components/PageHeader.js";
import SettingsTabs from "../components/SettingsTabs.js";
import {
  AGENT_TONE_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
} from "../config/options.js";
import { useAgentConfig } from "../hooks/useAgentConfig.js";
import { useToast } from "../hooks/useToast.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  getCurrentTenant,
  updateCurrentTenant,
} from "../services/tenant-service.js";
import type { Tenant } from "../types/tenant.js";

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

function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "Q";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}

const FISCAL_FIELDS: Array<{
  key: "legalName" | "taxId" | "personType" | "taxLiability" | "taxRegime";
  label: string;
}> = [
  { key: "legalName", label: "Razón social" },
  { key: "taxId", label: "NIT / Documento de identificación" },
  { key: "personType", label: "Tipo de persona" },
  { key: "taxLiability", label: "Responsabilidad tributaria" },
  { key: "taxRegime", label: "Régimen" },
];

function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

function swatchColor(value: string): string {
  const trimmed = value.trim();

  return isValidHexColor(trimmed) ? trimmed.toLowerCase() : "#2563eb";
}

interface BrandingState {
  logoUrl: string;
  documentLogoMode: "main" | "custom";
  documentLogoUrl: string;
  brandColor: string;
  footerText: string;
}

interface ContactState {
  city: string;
  department: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
}

interface RegionalState {
  currency: string;
  timezone: string;
  decimalPrecision: string;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export default function CompanySettings() {
  const role = getUserRole();

  if (role !== "TENANT_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <CompanySettingsPanel />;
}

function CompanySettingsPanel() {
  const toast = useToast();
  const { agent } = useAgentConfig();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [branding, setBranding] = useState<BrandingState>({
    logoUrl: "",
    documentLogoMode: "main",
    documentLogoUrl: "",
    brandColor: "",
    footerText: "",
  });

  const [contact, setContact] = useState<ContactState>({
    city: "",
    department: "",
    address: "",
    postalCode: "",
    phone: "",
    email: "",
    website: "",
  });

  const [regional, setRegional] = useState<RegionalState>({
    currency: "COP",
    timezone: "America/Bogota",
    decimalPrecision: "2",
    thousandsSeparator: ".",
    decimalSeparator: ",",
  });

  const [savingBranding, setSavingBranding] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingRegional, setSavingRegional] = useState(false);

  const [brandingError, setBrandingError] = useState("");
  const [contactError, setContactError] = useState("");
  const [regionalError, setRegionalError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const tenantData = await getCurrentTenant();

        if (!active) {
          return;
        }

        setTenant(tenantData);
        setBranding({
          logoUrl: tenantData.logoUrl ?? "",
          documentLogoMode: tenantData.documentLogoUrl ? "custom" : "main",
          documentLogoUrl: tenantData.documentLogoUrl ?? "",
          brandColor: tenantData.brandColor ?? "",
          footerText: tenantData.footerText ?? "",
        });

        setContact({
          city: tenantData.city ?? "",
          department: tenantData.department ?? "",
          address: tenantData.address ?? "",
          postalCode: tenantData.postalCode ?? "",
          phone: tenantData.phone ?? "",
          email: tenantData.email ?? "",
          website: tenantData.website ?? "",
        });

        setRegional({
          currency: tenantData.currency,
          timezone: tenantData.timezone,
          decimalPrecision:
            tenantData.decimalPrecision !== undefined
              ? String(tenantData.decimalPrecision)
              : "2",
          thousandsSeparator: tenantData.thousandsSeparator ?? ".",
          decimalSeparator: tenantData.decimalSeparator ?? ",",
        });
      } catch (requestError: unknown) {
        if (active) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar la configuración",
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
  }, []);

  const companyName = tenant?.legalName ?? tenant?.name ?? "Mi empresa";

  const effectiveDocumentLogo =
    branding.documentLogoMode === "custom"
      ? branding.documentLogoUrl
      : branding.logoUrl;

  const effectiveBrandColor = swatchColor(branding.brandColor);

  const agentAvatar = agent?.avatarData;
  const agentToneLabel =
    AGENT_TONE_OPTIONS.find((option) => option.value === agent?.tone)?.label ??
    agent?.tone ??
    "—";

  async function saveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBrandingError("");

    if (branding.brandColor.trim() && !isValidHexColor(branding.brandColor)) {
      setBrandingError("El color de marca debe ser un hex válido (#RRGGBB)");
      return;
    }

    setSavingBranding(true);

    try {
      const updated = await updateCurrentTenant({
        logoUrl: branding.logoUrl || undefined,
        documentLogoUrl:
          branding.documentLogoMode === "custom"
            ? branding.documentLogoUrl || undefined
            : undefined,
        brandColor: branding.brandColor.trim() || undefined,
        footerText: branding.footerText.trim() || undefined,
      });

      setTenant(updated);
      toast.success("Configuración de branding actualizada correctamente");
    } catch (requestError) {
      setBrandingError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible guardar el branding",
      );
    } finally {
      setSavingBranding(false);
    }
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactError("");

    if (contact.email.trim() && !/^\S+@\S+\.\S+$/.test(contact.email.trim())) {
      setContactError("El correo electrónico no es válido");
      return;
    }

    setSavingContact(true);

    try {
      const updated = await updateCurrentTenant({
        city: contact.city.trim() || undefined,
        department: contact.department.trim() || undefined,
        address: contact.address.trim() || undefined,
        postalCode: contact.postalCode.trim() || undefined,
        phone: contact.phone.trim() || undefined,
        email: contact.email.trim() || undefined,
        website: contact.website.trim() || undefined,
      });

      setTenant(updated);
      toast.success("Datos de contacto actualizados correctamente");
    } catch (requestError) {
      setContactError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible guardar los datos de contacto",
      );
    } finally {
      setSavingContact(false);
    }
  }

  async function saveRegional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegionalError("");

    const precision = Number(regional.decimalPrecision);

    if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
      setRegionalError("La precisión decimal debe estar entre 0 y 6");
      return;
    }

    setSavingRegional(true);

    try {
      const updated = await updateCurrentTenant({
        currency: regional.currency.trim(),
        timezone: regional.timezone.trim(),
        decimalPrecision: precision,
        thousandsSeparator: regional.thousandsSeparator.trim() || undefined,
        decimalSeparator: regional.decimalSeparator.trim() || undefined,
      });

      setTenant(updated);
      toast.success("Preferencias regionales actualizadas correctamente");
    } catch (requestError) {
      setRegionalError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible guardar las preferencias",
      );
    } finally {
      setSavingRegional(false);
    }
  }

  return (
    <main className="min-h-full bg-surface-light">
      <PageHeader
        title="Configuración de la Empresa"
        description="Centraliza la identidad legal, el branding y las preferencias de tu empresa"
      />
      <SettingsTabs />
      <AsyncBoundary
        loading={loading}
        error={loadError}
        empty={!tenant}
        loadingLabel="Cargando configuración..."
        loadingMessage="Esto puede tomar unos segundos"
        errorTitle="No fue posible cargar"
        emptyTitle="No hay datos de empresa"
        emptyMessage="No se encontró información del tenant para editar"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6 max-[860px]:grid-cols-1">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Sección 1: Identificación legal y fiscal (solo lectura) */}
            <section className="rounded-xl border border-line bg-surface-card shadow-card">
              <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line [&>h2]:m-0 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-ink-strong [&>p]:mt-1 [&>p]:text-sm [&>p]:text-ink-muted">
                <div>
                  <h2>Identificación legal y fiscal</h2>
                  <p>
                    Estos datos están bloqueados y se gestionan con el soporte
                    de QuoPilot.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-[5px] border border-line rounded-full text-xs font-semibold text-ink-muted bg-accent-soft">
                  <Icon name="lock" size={14} />
                  Solo lectura
                </span>
              </header>

              <div className="grid grid-cols-2 items-start gap-[18px] px-6 py-5">
                {FISCAL_FIELDS.map((field) => (
                  <Field
                    key={field.key}
                    id={`fiscal-${field.key}`}
                    label={field.label}
                    type="text"
                    value={tenant?.[field.key] ?? ""}
                    disabled
                  />
                ))}
              </div>

              <div className="flex justify-end px-6 py-4 border-t border-line [&>button]:min-w-[180px]">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() =>
                    toast.info(
                      "Para actualizar tus datos fiscales contacta al soporte de QuoPilot.",
                    )
                  }
                >
                  <Icon name="link" size={16} />
                  Solicitar actualización de datos fiscales
                </button>
              </div>
            </section>

            {/* Sección 2: Branding */}
            <section className="rounded-xl border border-line bg-surface-card shadow-card">
              <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line [&>h2]:m-0 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-ink-strong [&>p]:mt-1 [&>p]:text-sm [&>p]:text-ink-muted">
                <div>
                  <h2>Branding y personalización de documentos</h2>
                  <p>
                    Logo, color de marca y pie de página para cotizaciones y
                    PDFs.
                  </p>
                </div>
              </header>

              <form
                className="flex flex-col gap-[18px] px-6 py-5"
                onSubmit={saveBranding}
                id="company-branding-form"
              >
                <div className="grid grid-cols-2 items-start gap-[18px]">
                  <ImageUploader
                    label="Logo de la empresa"
                    value={branding.logoUrl || undefined}
                    onChange={(value) =>
                      setBranding((current) => ({
                        ...current,
                        logoUrl: value ?? "",
                      }))
                    }
                    hint="PNG o SVG, máximo 2 MB."
                  />

                  <FormField
                    label="Color primario de marca"
                    hint="Personaliza el encabezado de las propuestas exportadas."
                  >
                    <ColorPicker
                    id="company-brand-color"
                    value={branding.brandColor}
                    onChange={(value) =>
                      setBranding((current) => ({
                        ...current,
                        brandColor: value,
                      }))
                    }
                      onClear={() =>
                        setBranding((current) => ({
                          ...current,
                          brandColor: "",
                        }))
                      }
                      presets={COLOR_PRESETS}
                      swatchTitle="Elegir color"
                    /></FormField>
                </div>

                <div className="grid grid-cols-2 items-start gap-[18px]">
                  <FormField label="Logo para cotizaciones / documentos">

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-line text-sm text-ink-strong cursor-pointer transition-colors duration-150 hover:border-accent-border hover:bg-accent-soft [&>input]:w-4 [&>input]:h-4 [&>input]:accent-accent">
                        <input
                          type="radio"
                          name="document-logo-mode"
                          checked={branding.documentLogoMode === "main"}
                          onChange={() =>
                            setBranding((current) => ({
                              ...current,
                              documentLogoMode: "main",
                            }))
                          }
                        />
                        <span>Usar el logo principal</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-line text-sm text-ink-strong cursor-pointer transition-colors duration-150 hover:border-accent-border hover:bg-accent-soft [&>input]:w-4 [&>input]:h-4 [&>input]:accent-accent">
                        <input
                          type="radio"
                          name="document-logo-mode"
                          checked={branding.documentLogoMode === "custom"}
                          onChange={() =>
                            setBranding((current) => ({
                              ...current,
                              documentLogoMode: "custom",
                            }))
                          }
                        />
                        <span>Subir variante horizontal / monocromática</span>
                      </label>
                    </div>

                    {branding.documentLogoMode === "custom" && (
                      <ImageUploader
                        label=""
                        value={branding.documentLogoUrl || undefined}
                        onChange={(value) =>
                          setBranding((current) => ({
                            ...current,
                            documentLogoUrl: value ?? "",
                          }))
                        }
                        hint="PNG o SVG, máximo 2 MB."
                      />
                    )}
                  </FormField>

                  <Field
                    id="company-footer"
                    label="Pie de página predeterminado"
                    as="textarea"
                    rows={5}
                    value={branding.footerText}
                    placeholder={
                      "Condiciones comerciales, datos bancarios o notas legales…"
                    }
                    onChange={(event) =>
                      setBranding((current) => ({
                        ...current,
                        footerText: event.target.value,
                      }))
                    }
                  />
                </div>

                {brandingError && (
                  <FormMessage kind="error">{brandingError}</FormMessage>
                )}

                <div className="flex justify-end px-6 py-4 border-t border-line [&>button]:min-w-[180px]">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingBranding}
                  >
                    {savingBranding ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </section>

            {/* Sección 3: Agente de IA (solo lectura) */}
            <section className="rounded-xl border border-line bg-surface-card shadow-card">
              <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line [&>h2]:m-0 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-ink-strong [&>p]:mt-1 [&>p]:text-sm [&>p]:text-ink-muted">
                <div>
                  <h2>Agente de IA</h2>
                  <p>
                    El asistente comercial de QuoPilot. Su identidad,
                    personalidad y comportamiento se configuran en la página del
                    Agente.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-[5px] border border-line rounded-full text-xs font-semibold text-ink-muted bg-accent-soft">
                  <Icon name="bot" size={14} />
                  Gestionado en /agent
                </span>
              </header>

              <div className="flex flex-col gap-[18px] px-6 py-5">
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-3.5">
                    {agentAvatar ? (
                      <img
                        className="inline-flex items-center justify-center w-[52px] h-[52px] shrink-0 rounded-full bg-accent-soft text-accent object-cover text-[15px] font-bold"
                        src={agentAvatar}
                        alt="Avatar del agente"
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center w-[52px] h-[52px] shrink-0 rounded-full bg-accent-soft text-accent object-cover text-[15px] font-bold">
                        <Icon name="bot" size={22} />
                      </span>
                    )}

                    <div className="flex flex-col min-w-0 gap-0.5 [&>strong]:text-[15px] [&>strong]:text-ink-strong [&>strong]:truncate [&>strong]:whitespace-nowrap [&>span]:text-[13px] [&>span]:text-ink-muted">
                      <strong>{agent?.name ?? "Agente QuoPilot"}</strong>
                      <span>Tono: {agentToneLabel}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={
                            agent?.status === "ACTIVE"
                              ? "w-2 h-2 rounded-full bg-success"
                              : "w-2 h-2 rounded-full bg-slate-400"
                          }
                        />
                        {agent?.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  {agent?.welcomeMessage && (
                    <div className="p-3 rounded-[10px_10px_10px_2px] bg-accent-soft text-ink-strong text-[13px] leading-normal whitespace-pre-wrap">
                      {agent.welcomeMessage}
                    </div>
                  )}

                  <div className="flex justify-end px-6 py-4 border-t border-line [&>button]:min-w-[180px]">
                    <Link to="/agent" className="button button--secondary">
                      <Icon name="bot" size={16} />
                      Ir a configurar Agente
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección 4: Contacto y ubicación */}
            <section className="rounded-xl border border-line bg-surface-card shadow-card">
              <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line [&>h2]:m-0 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-ink-strong [&>p]:mt-1 [&>p]:text-sm [&>p]:text-ink-muted">
                <div>
                  <h2>Datos de contacto y ubicación operativa</h2>
                  <p>Información de contacto que verán tus clientes.</p>
                </div>
              </header>

              <form
                className="flex flex-col gap-[18px] px-6 py-5"
                onSubmit={saveContact}
                id="company-contact-form"
              >
                <div className="grid grid-cols-2 items-start gap-[18px]">
                  <Field
                    id="company-city"
                    label="Municipio / Departamento"
                    type="text"
                    value={contact.city}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Ej.: Bogotá, Cundinamarca"
                  />

                  <Field
                    id="company-address"
                    label="Dirección principal"
                    type="text"
                    value={contact.address}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Ej.: Calle 123 # 45-67"
                  />

                  <Field
                    id="company-postal-code"
                    label="Código postal"
                    type="text"
                    value={contact.postalCode}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        postalCode: event.target.value,
                      }))
                    }
                    placeholder="Ej.: 110111"
                  />

                  <Field
                    id="company-department"
                    label="Departamento"
                    type="text"
                    value={contact.department}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                    placeholder="Ej.: Cundinamarca"
                  />

                  <Field
                    id="company-phone"
                    label="Teléfono de contacto"
                    type="text"
                    value={contact.phone}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="Ej.: +57 300 123 4567"
                  />

                  <Field
                    id="company-email"
                    label="Correo de notificaciones"
                    type="email"
                    value={contact.email}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="ej: ventas@miempresa.com"
                  />

                  <Field
                    id="company-website"
                    label="Sitio web"
                    type="text"
                    value={contact.website}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        website: event.target.value,
                      }))
                    }
                    placeholder="Ej.: https://miempresa.com"
                  />
                </div>

                {contactError && (
                  <FormMessage kind="error">{contactError}</FormMessage>
                )}

                <div className="flex justify-end px-6 py-4 border-t border-line [&>button]:min-w-[180px]">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingContact}
                  >
                    {savingContact ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </section>

            {/* Sección 5: Preferencias regionales */}
            <section className="rounded-xl border border-line bg-surface-card shadow-card">
              <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line [&>h2]:m-0 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-ink-strong [&>p]:mt-1 [&>p]:text-sm [&>p]:text-ink-muted">
                <div>
                  <h2>Preferencias regionales y formato</h2>
                  <p>
                    Moneda, separadores numéricos y zona horaria del tenant.
                  </p>
                </div>
              </header>

              <form
                className="flex flex-col gap-[18px] px-6 py-5"
                onSubmit={saveRegional}
                id="company-regional-form"
              >
                <div className="grid grid-cols-2 items-start gap-[18px]">
                  <Field
                    id="company-currency"
                    label="Moneda predeterminada"
                    as="select"
                    value={regional.currency}
                    onChange={(event) =>
                      setRegional((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Field>

                  <FormField
                    label="Zona horaria"
                    idFor="company-timezone"
                  >
                    <Combobox
                      id="company-timezone"
                      value={regional.timezone}
                      options={TIMEZONE_OPTIONS}
                      onChange={(value) =>
                        setRegional((current) => ({
                          ...current,
                          timezone: value,
                        }))
                      }
                      placeholder="Selecciona una zona horaria"
                      searchPlaceholder="Buscar ciudad o zona horaria..."
                    />
                  </FormField>

                  <Field
                    id="company-decimal-precision"
                    label="Precisión decimal (decimales)"
                    type="number"
                    min="0"
                    max="6"
                    step="1"
                    value={regional.decimalPrecision}
                    onChange={(event) =>
                      setRegional((current) => ({
                        ...current,
                        decimalPrecision: event.target.value,
                      }))
                    }
                  />

                  <Field
                    id="company-thousands-separator"
                    label="Separador de miles"
                    type="text"
                    maxLength={1}
                    value={regional.thousandsSeparator}
                    onChange={(event) =>
                      setRegional((current) => ({
                        ...current,
                        thousandsSeparator: event.target.value,
                      }))
                    }
                    placeholder="."
                  />

                  <Field
                    id="company-decimal-separator"
                    label="Separador de decimales"
                    type="text"
                    maxLength={1}
                    value={regional.decimalSeparator}
                    onChange={(event) =>
                      setRegional((current) => ({
                        ...current,
                        decimalSeparator: event.target.value,
                      }))
                    }
                    placeholder=","
                  />
                </div>

                {regionalError && (
                  <FormMessage kind="error">{regionalError}</FormMessage>
                )}

                <div className="flex justify-end px-6 py-4 border-t border-line [&>button]:min-w-[180px]">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingRegional}
                  >
                    {savingRegional ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </section>
          </div>

          {/* Vista previa lateral */}
          <aside className="sticky top-5 max-[860px]:static">
            <div className="flex flex-col gap-3 p-4 rounded-xl border border-line bg-surface-card shadow-card">
              <div className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Vista previa</div>

              <div className="rounded-[10px] border border-line overflow-hidden bg-surface-card">
                <div
                  className="flex items-center gap-2.5 p-3 text-white"
                  style={{ background: effectiveBrandColor }}
                >
                  {effectiveDocumentLogo ? (
                    <img
                      className="h-8 max-w-[120px] object-contain rounded-md bg-white p-1"
                      src={effectiveDocumentLogo}
                      alt="Logo de la empresa"
                    />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-white text-ink-strong text-[13px] font-bold tracking-[0.02em]"
                      aria-hidden="true"
                    >
                      {companyInitials(companyName)}
                    </span>
                  )}

                  <span className="text-sm font-bold truncate whitespace-nowrap">
                    {companyName}
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-3.5 text-[13px] text-ink-muted [&>strong]:text-ink-strong">
                  <span>Cotización</span>
                  <strong>N° 0001</strong>
                </div>

                {branding.footerText.trim() && (
                  <div className="px-3 py-2.5 border-t border-line text-xs text-ink-muted whitespace-pre-wrap">
                    {branding.footerText}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-[10px] border border-line">
                {agentAvatar ? (
                  <img
                    className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-accent-soft text-accent object-cover text-sm font-bold"
                    src={agentAvatar}
                    alt="Avatar del agente"
                  />
                ) : (
                  <span className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-accent-soft text-accent object-cover text-sm font-bold">
                    <Icon name="bot" size={22} />
                  </span>
                )}

                <div>
                  <strong>{agent?.name ?? "Agente QuoPilot"}</strong>
                  <span>Tono {agentToneLabel.toLowerCase()}</span>
                </div>
              </div>

              {agent?.welcomeMessage && (
                <div className="p-3 rounded-[10px_10px_10px_2px] bg-accent-soft text-ink-strong text-[13px] leading-normal whitespace-pre-wrap">
                  {agent.welcomeMessage}
                </div>
              )}
            </div>
          </aside>
        </div>
      </AsyncBoundary>
    </main>
  );
}
