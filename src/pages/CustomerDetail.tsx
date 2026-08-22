import { useCallback, useEffect, useMemo, useState } from "react";
import FormField from "../components/FormField.js";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, Info, Search } from "lucide-react";

import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import PageHeader from "../components/PageHeader.js";
import { useToast } from "../hooks/useToast.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
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

  const { hasCapability } = useCapabilities();
  const canEdit = hasCapability("customers.update");

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

  if (loading || loadError) {
    return (
      <main className="min-h-full bg-surface-light">
        <AsyncBoundary loading={loading} error={loadError} loadingLabel="Cargando contacto..." />
      </main>
    );
  }

  return (
    <main className="min-h-full bg-surface-light">
      <PageHeader
        title={isEdit ? "Editar contacto" : "Nuevo contacto"}
        description="Datos generales e información de contacto"
      />

      <form className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6 max-[860px]:grid-cols-1" onSubmit={handleSubmit}>
        {/* ===== Columna principal ===== */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Selector de tipo de contacto */}
          <div
            className="inline-flex self-start gap-2 p-1 bg-white border border-line rounded-full"
            role="group"
            aria-label="Tipo de contacto"
          >
            {(["CUSTOMER", "SUPPLIER"] as const).map((type) => {
              const active = form.customerType === type;

              return (
                <button
                  key={type}
                  type="button"
                  className={`inline-flex items-center gap-2 px-[18px] py-2 border-none rounded-full font-inherit text-[13px] font-semibold cursor-pointer transition-colors duration-150 ${
                    active
                      ? "bg-teal-100 text-teal-600"
                      : "bg-transparent text-slate-500"
                  }`}
                  aria-pressed={active}
                  onClick={() => setField("customerType", type)}
                >
                  <span
                    className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] transition-colors duration-150 ${
                      active
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-slate-300 text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {type === "CUSTOMER" ? "Cliente" : "Proveedor"}
                </button>
              );
            })}
          </div>

          {/* Callout de restricción */}
          {isEdit && (
            <div className="flex gap-3 p-3.5 rounded-[10px] border border-indigo-200 bg-indigo-50" role="note">
              <Info size={18} className="shrink-0 mt-px text-indigo-600" />

              <div>
                <strong className="block text-[13px] font-bold text-indigo-900">
                  Algunos datos no se pueden editar
                </strong>

                <p className="mt-1 text-[13px] leading-normal text-indigo-600">
                  No es posible modificar el nombre ni la identificación del
                  &quot;Consumidor Final&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Sección 1: Datos generales */}
          <section className="flex flex-col gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-card max-[520px]:p-4">
            <h2 className="m-0 text-base font-bold text-ink-strong">Datos generales</h2>

            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-[520px]:grid-cols-1">
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

            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-[520px]:grid-cols-1">
              <Field
                id="customer-id-type"
                label="Tipo de identificación"
                as="select"
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
                
              </Field>



              <FormField
                label="Número de identificación"
                idFor="customer-id-number"
              >
                <div className="relative flex items-center">
                  <input
                    id="customer-id-number"
                    type="text"
                    value={form.identificationNumber}
                    placeholder="Ej.: 1234567890"
                    onChange={(event) =>
                      setField("identificationNumber", event.target.value)
                    }
                    className="w-full min-h-[44px] px-3 pr-11 rounded-lg border border-line bg-surface-card text-ink-strong outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]"
                  />

                  <button
                    type="button"
                    title="Autocompletar con la identificación"
                    aria-label="Autocompletar con la identificación"
                    onClick={() => void 0}
                    className="absolute right-1.5 inline-flex items-center justify-center w-8 h-8 border-none rounded-md text-slate-500 cursor-pointer transition-colors duration-150 hover:bg-slate-100 hover:text-ink-strong"
                  >
                    <Search size={16} />
                  </button>
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-[520px]:grid-cols-1">
              <Field
                id="customer-municipality"
                label="Municipio / Departamento"
                type="text"
                value={form.municipality}
                placeholder="Ej.: Medellín / Antioquia"
                onChange={(event) =>
                  setField("municipality", event.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-[520px]:grid-cols-1">
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
          <section className="flex flex-col gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-card max-[520px]:p-4">
            <button
              type="button"
              className="flex items-center justify-between w-full p-0 bg-transparent border-none text-inherit font-[inherit] cursor-pointer text-left"
              onClick={() => setContactOpen((current) => !current)}
              aria-expanded={contactOpen}
            >
              <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:font-bold [&>strong]:text-ink-strong [&>small]:text-[13px] text-slate-500">
                <strong>Información de contacto</strong>

                <small>
                  Agrega estos datos para comunicarte en cualquier momento con
                  tu contacto.
                </small>
              </span>

              {contactOpen ? (
                <ChevronUp size={18} className="text-slate-400 shrink-0" />
              ) : (
                <ChevronDown
                  size={18}
                  className="text-slate-400 shrink-0"
                />
              )}
            </button>

            {contactOpen && (
              <>
                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-[520px]:grid-cols-1">
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

                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-[520px]:grid-cols-1">
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
        <aside className="sticky top-5 max-[860px]:static">
          <div className="master-detail-sidebar">
            <div className="master-detail-sidebar__title">{title}</div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendStatement}
                onChange={(event) =>
                  setField("sendStatement", event.target.checked)
                }
                className="peer sr-only"
              />

              <span
                aria-hidden="true"
                className="relative shrink-0 w-10 h-[22px] rounded-full bg-slate-200 transition-colors duration-150 after:absolute after:top-0.5 after:left-0.5 after:w-[18px] after:h-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-150 peer-checked:bg-[#00b4d8] peer-checked:after:translate-x-[18px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
              />

              <span className="text-sm font-medium text-ink-strong">
                Enviar estado de cuenta
              </span>
            </label>

            <div className="master-detail-sidebar__actions">
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
