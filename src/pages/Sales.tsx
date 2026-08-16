import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState.js";
import EntityCard from "../components/EntityCard.js";
import type { EntityAction } from "../components/EntityCard.js";
import FilterPanel from "../components/FilterPanel.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import StatCard from "../components/StatCard.js";
import { SALE_FILTER_FIELDS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import { getCustomers } from "../services/customer-service.js";
import { getProducts } from "../services/product-service.js";
import { deleteSale, getSales } from "../services/sale-service.js";
import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";
import type { Sale } from "../types/sale.js";

export default function Sales() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const buildFetcher = useCallback(
    (params: {
      search: string;
      status: string;
      customerId: string;
      productId: string;
      totalFrom: string;
      totalTo: string;
      dateFrom: string;
      dateTo: string;
    }) => () =>
      getSales({
        search: params.search || undefined,
        status: params.status || undefined,
        customerId: params.customerId || undefined,
        productId: params.productId || undefined,
        minTotal: params.totalFrom ? Number(params.totalFrom) : undefined,
        maxTotal: params.totalTo ? Number(params.totalTo) : undefined,
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, search, setSearch, values, set, clear } =
    useFilteredList(buildFetcher, {
      status: "",
      customerId: "",
      productId: "",
      totalFrom: "",
      totalTo: "",
      dateFrom: "",
      dateTo: "",
    });

  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getCustomers({ limit: 100 }),
      getProducts({ limit: 100 }),
    ]).then(([customerResponse, productResponse]) => {
      if (cancelled) {
        return;
      }

      setCustomers(customerResponse.data);
      setProducts(productResponse.data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(sale: Sale) {
    const confirmed = await confirm({
      title: "Eliminar venta",
      message: `¿Eliminar la venta ${sale.number}? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSale(sale._id);
      reload();
      toast.success("Venta eliminada");
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible eliminar la venta",
      );
    }
  }

  function saleActions(sale: Sale): EntityAction[] {
    return [
      {
        icon: "eye",
        ariaLabel: "Ver detalle",
        onClick: () => navigate(`/sales/${sale._id}`),
        variant: "secondary",
      },
      {
        icon: "trash",
        ariaLabel: "Eliminar",
        onClick: () => handleDelete(sale),
        variant: "danger",
      },
    ];
  }

  const sales = data?.data ?? [];

  const totalAmount = sales.reduce(
    (total, sale) => total + (sale.status === "CONFIRMED" ? sale.total : 0),
    0,
  );

  return (
    <main>
      <PageHeader
        title="Ventas"
        description={`${sales.length} ventas`}
      />

      <FilterPanel
        fields={SALE_FILTER_FIELDS({
          customers: customers.map((customer) => ({
            value: customer._id,
            label: customer.name,
          })),
          products: products.map((product) => ({
            value: product._id,
            label: product.name,
          })),
        })}
        values={values}
        onSet={set}
        onClear={clear}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por número de venta..."
      />

      <section className="sales-summary">
        <StatCard label="Ventas" value={String(sales.length)} />

        <StatCard
          label="Monto vendido"
          value={formatCurrency(totalAmount)}
          highlight
        />
      </section>

      {loading ? (
        <PageState
          kind="loading"
          title="Cargando ventas..."
          message="Esto puede tomar unos segundos"
        />
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : sales.length === 0 ? (
        <EmptyState
          title="No hay ventas"
          message="Todavía no existen ventas para mostrar con los filtros actuales."
        />
      ) : (
        <section className="entity-grid sales-list">
          {sales.map((sale) => (
            <EntityCard
              key={sale._id}
              eyebrow="Venta"
              title={sale.number}
              status={sale.status}
              fields={[
                {
                  label: "Total",
                  value: formatCurrency(sale.total, sale.currency),
                },
                { label: "Fecha", value: formatDate(sale.soldAt) },
              ]}
              actions={saleActions(sale)}
            />
          ))}
        </section>
      )}
    </main>
  );
}
