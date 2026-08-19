import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";

import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import StatCard from "../components/StatCard.js";
import DataListView from "../components/DataListView/DataListView.js";
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import { SALE_STATUS_OPTIONS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import { getCustomers } from "../services/customer-service.js";
import { getProducts } from "../services/product-service.js";
import { deleteSale, getSales } from "../services/sale-service.js";
import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";
import type { Sale, SaleStatus } from "../types/sale.js";

const STATUS_BADGE_CLASS: Record<SaleStatus, string> = {
  CONFIRMED: "badge badge-success",
  CANCELLED: "badge badge-danger",
};

const STATUS_LABEL = Object.fromEntries(
  SALE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SaleStatus, string>;

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
    }) => () =>
      getSales({
        search: params.search || undefined,
        status: params.status || undefined,
        customerId: params.customerId || undefined,
        productId: params.productId || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, set } = useFilteredList(buildFetcher, {
    status: "",
    customerId: "",
    productId: "",
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

  const handleDelete = useCallback(
    async (sale: Sale) => {
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
    },
    [confirm, reload, toast],
  );

  const customerNameById = useMemo(
    () => new Map(customers.map((customer) => [customer._id, customer.name])),
    [customers],
  );

  const saleFilters = useMemo<FilterOptionI[]>(
    () => [
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: SALE_STATUS_OPTIONS.map((option) => ({
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
      {
        key: "productId",
        label: "Producto",
        type: "select",
        options: products.map((product) => ({
          label: product.name,
          value: product._id,
        })),
      },
    ],
    [customers, products],
  );

  const columns = useMemo<ColumnSpec<Sale>[]>(
    () => [
      {
        key: "number",
        label: "Número",
        render: (sale) => <strong>{sale.number}</strong>,
      },
      {
        key: "customerId",
        label: "Cliente",
        render: (sale) =>
          customerNameById.get(sale.customerId) ?? "Cliente eliminado",
      },
      {
        key: "status",
        label: "Estado",
        render: (sale) => (
          <span className={STATUS_BADGE_CLASS[sale.status]}>
            {STATUS_LABEL[sale.status]}
          </span>
        ),
      },
      {
        key: "total",
        label: "Total",
        align: "right",
        render: (sale) => formatCurrency(sale.total, sale.currency),
      },
      {
        key: "soldAt",
        label: "Fecha",
        render: (sale) => formatDate(sale.soldAt),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (sale) => (
          <div className="row-actions">
            <button
              type="button"
              className="btn-icon-action"
              title="Ver detalle"
              aria-label="Ver detalle"
              onClick={() => navigate(`/sales/${sale._id}`)}
            >
              <Eye size={16} />
            </button>
            {sale.status === "CANCELLED" && (
              <button
                type="button"
                className="btn-icon-action btn-danger"
                title="Eliminar"
                aria-label="Eliminar"
                onClick={() => handleDelete(sale)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [customerNameById, navigate, handleDelete],
  );

  if (error) {
    return <PageState kind="error" title="No fue posible cargar" message={error} />;
  }

  const sales = data?.data ?? [];

  const totalAmount = sales.reduce(
    (total, sale) => total + (sale.status === "CONFIRMED" ? sale.total : 0),
    0,
  );

  return (
    <main>
      <PageHeader title="Ventas" description={`${sales.length} ventas`} />

      <section className="sales-summary">
        <StatCard label="Ventas" value={String(sales.length)} />

        <StatCard
          label="Monto vendido"
          value={formatCurrency(totalAmount)}
          highlight
        />
      </section>

      <DataListView<Sale>
        items={sales}
        columns={columns}
        rowKey={(sale) => sale._id}
        filters={saleFilters}
        loading={loading}
        emptyState="Todavía no existen ventas para mostrar con los filtros actuales"
        onFilterChange={(filters) => {
          set("status", filters.status ?? "");
          set("customerId", filters.customerId ?? "");
          set("productId", filters.productId ?? "");
        }}
      />
    </main>
  );
}
