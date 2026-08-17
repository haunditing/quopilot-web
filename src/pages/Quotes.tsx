import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import EntityCard from "../components/EntityCard.js";
import FilterPanel from "../components/FilterPanel.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import { QUOTE_FILTER_FIELDS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { formatCurrency } from "../lib/format.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import { getCustomers } from "../services/customer-service.js";
import { getQuotes } from "../services/quote-service.js";
import type { Customer } from "../types/customer.js";

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
  const { data, loading, error, search, setSearch, values, set, clear } =
    useFilteredList(buildFetcher, { status: "", customerId: "" });

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

  if (loading) {
    return <PageState kind="loading" title="Cargando cotizaciones..." />;
  }

  if (error) {
    return (
      <PageState kind="error" title="Error en cotizaciones" message={error} />
    );
  }

  const quotes = data?.data ?? [];

  return (
    <main>
      <PageHeader
        title="Cotizaciones"
        description={`${quotes.length} cotizaciones`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={() => navigate("/quotes/new")}>
              Nueva cotización
            </Button>
          )
        }
      />

      <FilterPanel
        fields={QUOTE_FILTER_FIELDS(
          customers.map((customer) => ({
            value: customer._id,
            label: customer.name,
          })),
        )}
        values={values}
        onSet={set}
        onClear={clear}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por número de cotización..."
      />

      {quotes.length === 0 ? (
        <EmptyState
          title="No hay cotizaciones"
          message="Todavía no existen cotizaciones para mostrar."
        >
          {canCreate && (
            <Button icon="plus" iconOnly onClick={() => navigate("/quotes/new")}>
              Nueva cotización
            </Button>
          )}
        </EmptyState>
      ) : (
        <section className="entity-grid">
          {quotes.map((quote) => (
            <EntityCard
              key={quote._id}
              eyebrow="Cotización"
              title={quote.number}
              status={quote.status}
              fields={[
                {
                  label: "Total",
                  value: formatCurrency(quote.total, quote.currency),
                },
                { label: "Items", value: String(quote.items.length) },
              ]}
              actions={
                canView
                  ? [
                      {
                        icon: "eye",
                        ariaLabel: "Ver detalle",
                        onClick: () => navigate(`/quotes/${quote._id}`),
                      },
                    ]
                  : []
              }
            />
          ))}
        </section>
      )}
    </main>
  );
}
