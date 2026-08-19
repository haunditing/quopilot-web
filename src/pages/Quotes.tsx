import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import DataListView from "../components/DataListView/DataListView.js";
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import { QUOTE_STATUS_OPTIONS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import { getCustomers } from "../services/customer-service.js";
import { getQuotes } from "../services/quote-service.js";
import type { Customer } from "../types/customer.js";
import type { Quote, QuoteStatus } from "../types/quote.js";

const STATUS_BADGE_CLASS: Record<QuoteStatus, string> = {
  DRAFT: "badge badge-warning",
  SENT: "badge",
  VIEWED: "badge",
  ACCEPTED: "badge badge-success",
  REJECTED: "badge badge-danger",
  EXPIRED: "badge badge-danger",
};

const STATUS_LABEL = Object.fromEntries(
  QUOTE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<QuoteStatus, string>;

export default function Quotes() {
  const navigate = useNavigate();

  const buildFetcher = useCallback(
    (params: { search: string; status: string; customerId: string }) => () =>
      getQuotes({
        search: params.search || undefined,
        status: params.status || undefined,
        customerId: params.customerId || undefined,
      }),
    [],
  );
  const { data, loading, error, set } = useFilteredList(buildFetcher, {
    status: "",
    customerId: "",
  });

  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    let cancelled = false;

    getCustomers({ limit: 100 }).then((response) => {
      if (cancelled) {
        return;
      }

      setCustomers(response.data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const role = getUserRole();
  const canView = can(role, "quotes", "view");
  const canCreate = can(role, "quotes", "create");
  const canEdit = can(role, "quotes", "update");

  const customerNameById = useMemo(
    () => new Map(customers.map((customer) => [customer._id, customer.name])),
    [customers],
  );

  const quoteFilters = useMemo<FilterOptionI[]>(
    () => [
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: QUOTE_STATUS_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      {
        key: "customerId",
        label: "Cliente",
        type: "select",
        options: customers.map((customer) => ({
          label: customer.name,
          value: customer._id,
        })),
      },
    ],
    [customers],
  );

  const columns = useMemo<ColumnSpec<Quote>[]>(
    () => [
      {
        key: "number",
        label: "Número",
        render: (quote) => <strong>{quote.number}</strong>,
      },
      {
        key: "customerId",
        label: "Cliente",
        render: (quote) =>
          customerNameById.get(quote.customerId) ?? "Cliente eliminado",
      },
      {
        key: "status",
        label: "Estado",
        render: (quote) => (
          <span className={STATUS_BADGE_CLASS[quote.status]}>
            {STATUS_LABEL[quote.status]}
          </span>
        ),
      },
      {
        key: "total",
        label: "Total",
        align: "right",
        render: (quote) => formatCurrency(quote.total, quote.currency),
      },
      {
        key: "items",
        label: "Items",
        align: "center",
        render: (quote) => String(quote.items.length),
      },
      {
        key: "createdAt",
        label: "Fecha",
        render: (quote) => formatDate(quote.createdAt),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (quote) => (
          <div className="row-actions">
            {canEdit && (
              <Button
                icon="download"
                iconOnly
                className="btn-icon-action btn-download"
                aria-label="Descargar PDF"
                onClick={() => navigate(`/quotes/${quote._id}/print`)}
              >
                Descargar
              </Button>
            )}
            {canView && (
              <Button
                icon="eye"
                iconOnly
                variant="primary"
                aria-label="Ver detalle"
                className="btn-icon-action btn-view"
                onClick={() => navigate(`/quotes/${quote._id}`)}
              >
                Ver detalle
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canView, customerNameById, navigate],
  );

  if (error) {
    return (
      <PageState kind="error" title="Error en cotizaciones" message={error} />
    );
  }

  return (
    <main>
      <PageHeader
        title="Cotizaciones"
        description={`${data?.data.length ?? 0} cotizaciones`}
        actions={
          canCreate && (
            <Button
              icon="plus"
              iconOnly
              onClick={() => navigate("/quotes/new")}
            >
              Nueva cotización
            </Button>
          )
        }
      />

      <DataListView<Quote>
        items={data?.data ?? []}
        columns={columns}
        rowKey={(quote) => quote._id}
        filters={quoteFilters}
        loading={loading}
        emptyState="Todavía no existen cotizaciones para mostrar"
        onFilterChange={(filters) => {
          set("status", filters.status ?? "");
          set("customerId", filters.customerId ?? "");
        }}
      />
    </main>
  );
}
