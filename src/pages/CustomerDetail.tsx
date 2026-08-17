import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Search,
} from "lucide-react";

import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  createCustomer,
  getCustomer,
  updateCustomer,
} from "../services/customer-service.js";
import type {
  Customer,
  CustomerType,
  IdentificationType,
} from "../types/customer.js";
import { isValidEmail } from "../lib/validation.js";

interface CustomerDetailProps {
  customerId?: string;
}

const SAVE_MESSAGE = "No fue posible guardar el contacto";

const IDENTIFICATION_TYPES: Array<{
  value: IdentificationType;
  label: string;
}> = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "NIT", label: "NIT" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "OTHER", label: "Otro" },
];

interface CustomerFormState {
  customerType: CustomerType;
  firstName: string;
  lastName: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  municipality: string;
  department: string;
  address: string;
  postalCode: string;
  email: string;
  email2: string;
  phone: string;
  phone2: string;
  sendStatement: boolean;
}

const EMPTY_FORM: CustomerFormState = {
  customerType: "CUSTOMER",
  firstName: "",
  lastName: "",
  identificationType: "CC",
  identificationNumber: "",
  municipality: "",
  department: "",
  address: "",
  postalCode: "",
  email: "",
  email2: "",
  phone: "",
  phone2: "",
  sendStatement: false,
};

function formFromCustomer(customer: Customer): CustomerFormState {
  return {
    customerType: customer.customerType ?? "CUSTOMER",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    identificationType: customer.identificationType ?? "CC",
    identificationNumber: customer.identificationNumber ?? "",
    municipality: customer.municipality ?? "",
    department: customer.department ?? "",
    address: customer.address ?? "",
    postalCode: customer.postalCode ?? "",
    email: customer.email ?? "",
    email2: customer.email2 ?? "",
    phone: customer.phone ?? "",
    phone2: customer.phone2 ?? "",
    sendStatement: customer.sendStatement ?? false,
  };
}

export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const isEdit = Boolean(customerId);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);

  const [contactOpen, setContactOpen] = useState(true);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [email2Error, setEmail2Error] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const canEdit = can(getUserRole(), "customers", "update");

  useEffect(() => {
    if (!customerId) {
      return;
    }

    const id = customerId;
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const customer = await getCustomer(id);

        if (active) {
          setForm(formFromCustomer(customer));
        }
      } catch (requestError: unknown) {
        if (active) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar el contacto",
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
  }, [customerId]);

  const setField = useCallback(
    <K extends keyof CustomerFormState>(
      key: K,
      value: CustomerFormState[K],
    ) => {
      setForm((current) => ({ ...current, [key]: value }));

      if (key === "firstName") {
        setNameError("");
      }

      if (key === "email") {
        setEmailError("");
      }

      if (key === "email2") {
        setEmail2Error("");
      }
    },
    [],
  );

  const title = useMemo(() => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(" ");
    }

    return form.customerType === "SUPPLIER" ? "Proveedor" : "Consumidor Final";
  }, [form.firstName, form.lastName, form.customerType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!form.firstName.trim() && !form.lastName.trim()) {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      setEmailError("Correo inválido");
      hasErrors = true;
    }

    if (form.email2.trim() && !isValidEmail(form.email2)) {
      setEmail2Error("Correo inválido");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    const input = {
      name: title,
      customerType: form.customerType,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      identificationType: form.identificationType,
      identificationNumber: form.identificationNumber.trim(),
      municipality: form.municipality.trim(),
      department: form.department.trim(),
      address: form.address.trim(),
      postalCode: form.postalCode.trim(),
      email: form.email.trim(),
      email2: form.email2.trim(),
      phone: form.phone.trim(),
      phone2: form.phone2.trim(),
      sendStatement: form.sendStatement,
    };

    try {
      if (customerId) {
        await updateCustomer(customerId, input);
        toast.success("Cambios guardados");
      } else {
        await createCustomer(input);
        toast.success("Contacto creado");
      }

      navigate("/customers");
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="customer-detail">
        <LoadingOverlay title="Cargando contacto..." />
      </main>
    );
  }

  if (loadError) {
    return (
      <PageState kind="error" title="No fue posible cargar" message={loadError} />
    );
  }

  return (
    <main className="customer-detail">
      <PageHeader
        title={isEdit ? "Editar contacto" : "Nuevo contacto"}
        description="Datos generales e información de contacto"
      />

      <form className="customer-detail__body" onSubmit={handleSubmit}>
        {/* ===== Columna principal ===== */}
        <div className="customer-detail__main">
          {/* Selector de tipo de contacto */}
          <div className="customer-type" role="group" aria-label="Tipo de contacto">
            <button
              type="button"
              className={
                form.customerType === "CUSTOMER"
                  ? "customer-type__pill customer-type__pill--active"
                  : "customer-type__pill"
              }
              aria-pressed={form.customerType === "CUSTOMER"}
              onClick={() => setField("customerType", "CUSTOMER")}
            >
              <span className="customer-type__check">
                <Check size={12} strokeWidth={3} />
              </span>

              Cliente
            </button>

            <button
              type="button"
              className={
                form.customerType === "SUPPLIER"
                  ? "customer-type__pill customer-type__pill--active"
                  : "customer-type__pill"
              }
              aria-pressed={form.customerType === "SUPPLIER"}
              onClick={() => setField("customerType", "SUPPLIER")}
            >
              <span className="customer-type__check">
                <Check size={12} strokeWidth={3} />
              </span>

              Proveedor
            </button>
          </div>

          {/* Callout de restricción */}
          {isEdit && (
            <div className="customer-callout" role="note">
              <Info size={18} className="customer-callout__icon" />

              <div className="customer-callout__text">
                <strong>Algunos datos no se pueden editar</strong>

                <p>
                  No es posible modificar el nombre ni la identificación del
                  &quot;Consumidor Final&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Sección 1: Datos generales */}
          <section className="customer-card">
            <h2 className="customer-card__title">Datos generales</h2>

            <div className="customer-card__grid">
              <Field
                id="customer-first-name"
                label="Nombres"
                type="text"
                value={form.firstName}
                error={nameError}
                onChange={(event) => setField("firstName", event.target.value)}
              />

              <Field
                id="customer-last-name"
                label="Apellidos"
                type="text"
                value={form.lastName}
                onChange={(event) => setField("lastName", event.target.value)}
              />
            </div>

            <div className="customer-card__grid">
              <div className="form-field">
                <label htmlFor="customer-id-type">Tipo de identificación</label>

                <select
                  id="customer-id-type"
                  value={form.identificationType}
                  onChange={(event) =>
                    setField(
                      "identificationType",
                      event.target.value as IdentificationType,
                    )
                  }
                >
                  {IDENTIFICATION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="customer-id-number">Número de identificación</label>

                <div className="customer-field-with-action">
                  <input
                    id="customer-id-number"
                    type="text"
                    value={form.identificationNumber}
                    placeholder="Ej.: 1234567890"
                    onChange={(event) =>
                      setField("identificationNumber", event.target.value)
                    }
                  />

                  <button
                    type="button"
                    className="customer-field-with-action__btn"
                    title="Autocompletar con la identificación"
                    aria-label="Autocompletar con la identificación"
                  >
                    <Search size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="customer-card__grid">
              <Field
                id="customer-municipality"
                label="Municipio / Departamento"
                type="text"
                value={form.municipality}
                placeholder="Ej.: Medellín / Antioquia"
                onChange={(event) => setField("municipality", event.target.value)}
              />
            </div>

            <div className="customer-card__grid">
              <Field
                id="customer-address"
                label="Dirección"
                type="text"
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
              />

              <Field
                id="customer-postal-code"
                label="Código postal"
                type="text"
                value={form.postalCode}
                onChange={(event) => setField("postalCode", event.target.value)}
              />
            </div>
          </section>

          {/* Sección 2: Información de contacto */}
          <section className="customer-card">
            <button
              type="button"
              className="customer-card__heading"
              onClick={() => setContactOpen((current) => !current)}
              aria-expanded={contactOpen}
            >
              <span className="customer-card__heading-text">
                <strong>Información de contacto</strong>

                <small>
                  Agrega estos datos para comunicarte en cualquier momento con tu
                  contacto.
                </small>
              </span>

              {contactOpen ? (
                <ChevronUp size={18} className="customer-card__chevron" />
              ) : (
                <ChevronDown size={18} className="customer-card__chevron" />
              )}
            </button>

            {contactOpen && (
              <>
                <div className="customer-card__grid">
                  <Field
                    id="customer-email"
                    label="Correo electrónico"
                    type="email"
                    value={form.email}
                    error={emailError}
                    onChange={(event) => setField("email", event.target.value)}
                  />

                  <Field
                    id="customer-email-2"
                    label="Correo electrónico 2"
                    type="email"
                    value={form.email2}
                    error={email2Error}
                    onChange={(event) => setField("email2", event.target.value)}
                  />
                </div>

                <div className="customer-card__grid">
                  <Field
                    id="customer-phone"
                    label="Teléfono"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                  />

                  <Field
                    id="customer-phone-2"
                    label="Teléfono 2"
                    type="tel"
                    value={form.phone2}
                    onChange={(event) => setField("phone2", event.target.value)}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        {/* ===== Panel lateral sticky ===== */}
        <aside className="customer-detail__sidebar">
          <div className="customer-sidebar">
            <div className="customer-sidebar__title">{title}</div>

            <label className="customer-switch">
              <input
                type="checkbox"
                checked={form.sendStatement}
                onChange={(event) =>
                  setField("sendStatement", event.target.checked)
                }
              />

              <span className="customer-switch__track" aria-hidden="true" />

              <span className="customer-switch__label">
                Enviar estado de cuenta
              </span>
            </label>

            <div className="customer-sidebar__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/customers")}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={saving || (isEdit && !canEdit)}
              >
                {saving ? "Guardando..." : "Guardar contacto"}
              </Button>
            </div>
          </div>
        </aside>

        {saveError && <FormMessage kind="error">{saveError}</FormMessage>}
      </form>
    </main>
  );
}