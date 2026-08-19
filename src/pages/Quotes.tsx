import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import StatCard from "../components/StatCard.js";
import DataListView from "../components/DataListView/DataListView.js";
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import { QUOTE_STATUS_OPTIONS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import { getCustomers } from "../services/customer-service.js";
import {
  acceptQuote,
  getQuotes,
  sendQuote,
} from "../services/quote-service.js";
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
  const toast = useToast();
  const { confirm } = useConfirm();

  const buildFetcher = useCallback(
    (params: { search: string; status: string; customerId: string }) => () =>
      getQuotes({
        search: params.search || undefined,
        status: params.status || undefined,
        customerId: params.customerId || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, set } = useFilteredList(buildFetcher, {
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
  const canSend = can(role, "quotes", "send");
  const canAccept = can(role, "quotes", "accept");

  const runQuoteAction = useCallback(
    async (
      action: () => Promise<unknown>,
      successMessage: string,
    ): Promise<void> => {
      try {
        await action();
        reload();
        toast.success(successMessage);
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "No fue posible completar la acción",
        );
      }
    },
    [reload, toast],
  );

  const handleSend = useCallback(
    async (quote: Quote) => {
      const confirmed = await confirm({
        title: "Enviar cotización",
        message: `¿Enviar la cotización ${quote.number} al cliente?`,
        confirmLabel: "Enviar",
      });

      if (confirmed) {
        await runQuoteAction(
          () => sendQuote(quote._id),
          "Cotización enviada",
        );
      }
    },
    [confirm, runQuoteAction],
  );

  const handleAccept = useCallback(
    async (quote: Quote) => {
      const confirmed = await confirm({
        title: "Aceptar cotización",
        message: `¿Confirmar la aceptación de la cotización ${quote.number}?`,
        confirmLabel: "Aceptar",
      });

      if (confirmed) {
        await runQuoteAction(
          () => acceptQuote(quote._id),
          "Cotización aceptada",
        );
      }
    },
    [confirm, runQuoteAction],
  );

  const quotes = data?.data ?? [];

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<QuoteStatus, number>> = {};
    for (const quote of quotes) {
      counts[quote.status] = (counts[quote.status] ?? 0) + 1;
    }
    return counts;
  }, [quotes]);

  const summaryStatuses: QuoteStatus[] = [
    "VIEWED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
  ];

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
            {canSend && quote.status === "DRAFT" && (
              <Button
                icon="send"
                iconOnly
                variant="secondary"
                className="btn-icon-action btn-send"
                aria-label="Enviar"
                onClick={() => handleSend(quote)}
              >
                Enviar
              </Button>
            )}
            {canAccept && (quote.status === "SENT" || quote.status === "VIEWED") && (
              <Button
                icon="check"
                iconOnly
                variant="primary"
                className="btn-icon-action btn-accept"
                aria-label="Aceptar cotización"
                onClick={() => handleAccept(quote)}
              >
                Aceptar
              </Button>
            )}
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
    [canView, canSend, canAccept, canEdit, customerNameById, navigate, handleSend, handleAccept],
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
        description={`${quotes.length} cotizaciones`}
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

      <section className="sales-summary">
        {summaryStatuses.map((status) => (
          <StatCard
            key={status}
            label={STATUS_LABEL[status]}
            value={String(statusCounts[status] ?? 0)}
          />
        ))}
      </section>

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
