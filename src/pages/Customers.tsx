import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Edit2, Trash2 } from "lucide-react";

import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";

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
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import DataListView from "../components/DataListView/DataListView.js";

type CustomerModal =
  | { mode: "create" }
  | { mode: "edit"; customer: Customer }
  | null;

const SAVE_MESSAGE = "No fue posible guardar el cliente";

const CUSTOMER_FILTERS: FilterOptionI[] = [
  {
    key: "country",
    label: "País",
    type: "text",
  },
];

export default function Customers() {
  const buildFetcher = useCallback(
    (params: { search: string; country: string }) => () =>
      getCustomers({
        search: params.search || undefined,
        country: params.country || undefined,
      }),
    [],
  );

  const { data, loading, error, reload, set } = useFilteredList(buildFetcher, {
    country: "",
  });

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

  const handleDelete = useCallback(
    async (customer: Customer) => {
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
    },
    [confirm, reload, toast],
  );

  const columns = useMemo<ColumnSpec<Customer>[]>(
    () => [
      {
        key: "name",
        label: "Nombre",
        render: (customer) => <strong>{customer.name}</strong>,
      },
      {
        key: "email",
        label: "Email",
        render: (customer) => customer.email || "—",
      },
      {
        key: "phone",
        label: "Teléfono",
        render: (customer) => customer.phone || "—",
      },
      {
        key: "country",
        label: "País",
        render: (customer) => customer.country || "—",
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (customer) => (
          <div className="row-actions">
            {canEdit && (
              <button
                type="button"
                className="btn-icon-action"
                title="Editar"
                aria-label="Editar"
                onClick={() => openEdit(customer)}
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
                onClick={() => handleDelete(customer)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canEdit, canDelete, handleDelete],
  );

  if (error) {
    return (
      <PageState kind="error" title="No fue posible cargar" message={error} />
    );
  }

  return (
    <main>
      <PageHeader
        title="Clientes"
        description={`${data?.data.length ?? 0} clientes`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>Nuevo cliente</Button>
          )
        }
      />

      <DataListView<Customer>
        items={data?.data ?? []}
        columns={columns}
        rowKey={(customer) => customer._id}
        filters={CUSTOMER_FILTERS}
        loading={loading}
        emptyState="No hay clientes registrados"
        onFilterChange={(filters) => {
          set("country", filters.country ?? "");
        }}
      />

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

          <Button type="submit" variant="primary" disabled={saving}>
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
