import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";

import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
import { deleteCustomer, getCustomers } from "../services/customer-service.js";
import type { Customer } from "../types/customer.js";
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import DataListView from "../components/DataListView/DataListView.js";

const CUSTOMER_FILTERS: FilterOptionI[] = [
  {
    key: "country",
    label: "País",
    type: "text",
  },
];

export default function Customers() {
  const navigate = useNavigate();

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

  const { hasCapability } = useCapabilities();
  const canCreate = hasCapability("customers.create");
  const canEdit = hasCapability("customers.update");
  const canDelete = hasCapability("customers.delete");

  const toast = useToast();
  const { confirm } = useConfirm();

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
              <Button
                icon="edit"
                className="btn-icon-action btn-edit"
                iconOnly
                aria-label="Editar"
                onClick={() => navigate(`/customers/${customer._id}`)}
              >
                Editar
              </Button>
            )}

            {canDelete && (
              <Button
                icon="trash"
                iconOnly
                className="btn-icon-action btn-danger"
                aria-label="Eliminar"
                onClick={() => handleDelete(customer)}
              >
                Eliminar
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canEdit, canDelete, handleDelete, navigate],
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
            <Button
              icon="plus"
              iconOnly
              onClick={() => navigate("/customers/new")}
            >
              Nuevo cliente
            </Button>
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
    </main>
  );
}
