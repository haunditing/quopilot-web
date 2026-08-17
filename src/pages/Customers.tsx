import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import EntityCard from "../components/EntityCard.js";
import type { EntityAction } from "../components/EntityCard.js";
import Field from "../components/Field.js";
import FilterPanel from "../components/FilterPanel.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import { CUSTOMER_FILTER_FIELDS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../services/customer-service.js";
import type { Customer } from "../types/customer.js";
import { isValidEmail } from "../lib/validation.js";

type CustomerModal =
  | { mode: "create" }
  | { mode: "edit"; customer: Customer }
  | null;

const SAVE_MESSAGE = "No fue posible guardar el cliente";

export default function Customers() {
  const buildFetcher = useCallback(
    (params: { search: string; country: string }) => () =>
      getCustomers({
        search: params.search || undefined,
        country: params.country || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, search, setSearch, values, set, clear } =
    useFilteredList(buildFetcher, { country: "" });

  const role = getUserRole();
  const canCreate = can(role, "customers", "create");
  const canEdit = can(role, "customers", "update");
  const canDelete = can(role, "customers", "delete");

  const toast = useToast();
  const { confirm } = useConfirm();

  const [modal, setModal] = useState<CustomerModal>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappId, setWhatsappId] = useState("");
  const [country, setCountry] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function openCreate() {
    setName("");
    setEmail("");
    setPhone("");
    setWhatsappId("");
    setCountry("");
    setNameError("");
    setEmailError("");
    setSaveError("");
    setModal({ mode: "create" });
  }

  function openEdit(customer: Customer) {
    setName(customer.name);
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setWhatsappId(customer.whatsappId ?? "");
    setCountry(customer.country ?? "");
    setNameError("");
    setEmailError("");
    setSaveError("");
    setModal({ mode: "edit", customer });
  }

  function closeModal() {
    setModal(null);
    setNameError("");
    setEmailError("");
    setSaveError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    if (email.trim() && !isValidEmail(email)) {
      setEmailError("Email inválido");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      if (modal?.mode === "edit") {
        await updateCustomer(modal.customer._id, {
          name,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(whatsappId ? { whatsappId } : {}),
          ...(country ? { country } : {}),
        });

        toast.success("Cambios guardados");
      } else {
        await createCustomer({
          name,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(whatsappId ? { whatsappId } : {}),
          ...(country ? { country } : {}),
        });

        toast.success("Cliente creado");
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

  async function handleDelete(customer: Customer) {
    const confirmed = await confirm({
      title: "Eliminar cliente",
      message: `¿Eliminar a "${customer.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(customer._id);
      reload();
      toast.success("Cliente eliminado");
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible eliminar el cliente",
      );
    }
  }

  function customerActions(customer: Customer): EntityAction[] {
    const actions: EntityAction[] = [];

    if (canEdit) {
      actions.push({
        icon: "edit",
        ariaLabel: "Editar",
        onClick: () => openEdit(customer),
        variant: "secondary",
      });
    }

    if (canDelete) {
      actions.push({
        icon: "trash",
        ariaLabel: "Eliminar",
        onClick: () => handleDelete(customer),
        variant: "danger",
      });
    }

    return actions;
  }

  return (
    <main>
      <PageHeader
        title="Clientes"
        description={`${data?.data.length ?? 0} clientes`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo cliente
            </Button>
          )
        }
      />

      <FilterPanel
        fields={CUSTOMER_FILTER_FIELDS}
        values={values}
        onSet={set}
        onClear={clear}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, teléfono o email..."
      />

      {loading ? (
        <LoadingOverlay title="Cargando clientes..." message="Esto puede tomar unos segundos" />
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No hay clientes"
          message="Crea tu primer cliente para poder cotizarle"
        >
          {canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo cliente
            </Button>
          )}
        </EmptyState>
      ) : (
        <section className="entity-grid">
          {data.data.map((customer) => (
            <EntityCard
              key={customer._id}
              eyebrow="Cliente"
              title={customer.name}
              fields={[
                ...(customer.email
                  ? [{ label: "Email", value: customer.email }]
                  : []),
                ...(customer.phone
                  ? [{ label: "Teléfono", value: customer.phone }]
                  : []),
                ...(customer.country
                  ? [{ label: "País", value: customer.country }]
                  : []),
              ]}
              actions={customerActions(customer)}
            />
          ))}
        </section>
      )}

      <Modal
        open={modal !== null}
        title={modal?.mode === "edit" ? "Editar cliente" : "Nuevo cliente"}
        onClose={closeModal}
      >
        <form className="modal__form" onSubmit={handleSubmit}>
          <Field
            id="customer-name"
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

          <Field
            id="customer-email"
            label="Email"
            type="email"
            value={email}
            error={emailError}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError("");
            }}
          />

          <div className="form-card__grid">
            <Field
              id="customer-phone"
              label="Teléfono"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            <Field
              id="customer-country"
              label="País"
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            />
          </div>

          <Field
            id="customer-whatsapp"
            label="WhatsApp"
            type="text"
            value={whatsappId}
            onChange={(event) => setWhatsappId(event.target.value)}
          />

          {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

          <Button
            type="submit"
            variant="primary"
            icon="check"
            iconOnly
            disabled={saving}
          >
            {saving
              ? "Guardando..."
              : modal?.mode === "edit"
                ? "Guardar cambios"
                : "Crear cliente"}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
