import { useCallback, useEffect, useMemo, useState } from "react";
import Badge, { type BadgeTone } from "../components/Badge.js";
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
import { SALE_STATUS_OPTIONS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { usePdfDownload } from "../hooks/usePdfDownload.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
import { getCustomers } from "../services/customer-service.js";
import { getProducts } from "../services/product-service.js";
import {
  cancelSale,
  deleteSale,
  getSales,
} from "../services/sale-service.js";
import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";
import type { Sale, SaleStatus } from "../types/sale.js";

const STATUS_TONE: Record<SaleStatus, BadgeTone> = {
  CONFIRMED: "success",
  CANCELLED: "danger"
};

const STATUS_LABEL = Object.fromEntries(
  SALE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SaleStatus, string>;

export default function Sales() {
  const navigate = useNavigate();
  const { downloadingId, downloadSale } = usePdfDownload();

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

  const { hasCapability } = useCapabilities();
  const canView = hasCapability("sales.view");
  const canDelete = hasCapability("sales.delete");

  const handleCancel = useCallback(
    async (sale: Sale) => {
      const confirmed = await confirm({
        title: "Cancelar venta",
        message: `¿Cancelar la venta ${sale.number}?`,
        confirmLabel: "Cancelar venta",
        danger: true,
      });

      if (!confirmed) {
        return;
      }

      try {
        await cancelSale(sale._id);
        reload();
        toast.success("Venta cancelada");
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "No fue posible cancelar la venta",
        );
      }
    },
    [confirm, reload, toast],
  );

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
          <Badge tone={STATUS_TONE[sale.status]}>
            {STATUS_LABEL[sale.status]}
          </Badge>
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
            {canView && (
              <Button
                icon="download"
                iconOnly
                loading={downloadingId === sale._id}
                className="btn-icon-action btn-download"
                aria-label="Descargar PDF"
                onClick={() => downloadSale(sale)}
              >
                Descargar
              </Button>
            )}
            {canDelete && sale.status === "CONFIRMED" && (
              <Button
                icon="close"
                iconOnly
                variant="danger"
                className="btn-icon-action btn-cancel"
                aria-label="Cancelar venta"
                onClick={() => handleCancel(sale)}
              >
                Cancelar
              </Button>
            )}
            {canDelete && sale.status === "CANCELLED" && (
              <Button
                icon="trash"
                iconOnly
                variant="danger"
                className="btn-icon-action btn-danger"
                aria-label="Eliminar"
                onClick={() => handleDelete(sale)}
              >
                Eliminar
              </Button>
            )}
            {canView && (
              <Button
                icon="eye"
                iconOnly
                variant="primary"
                aria-label="Ver detalle"
                className="btn-icon-action btn-view"
                onClick={() => navigate(`/sales/${sale._id}`)}
              >
                Ver detalle
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canView, canDelete, customerNameById, navigate, handleCancel, handleDelete, downloadingId, downloadSale],
  );

  if (error) {
    return <PageState kind="error" title="No fue posible cargar" message={error} />;
  }

  const sales = data?.data ?? [];

  const cancelledCount = sales.filter(
    (sale) => sale.status === "CANCELLED",
  ).length;

  const totalAmount = sales.reduce(
    (total, sale) => total + (sale.status === "CONFIRMED" ? sale.total : 0),
    0,
  );

  return (
    <main>
      <PageHeader title="Ventas" description={`${sales.length} ventas`} />

      <section className="grid grid-cols-1 gap-4 mb-6">
        <StatCard label="Ventas" value={String(sales.length)} />

        <StatCard label="Canceladas" value={String(cancelledCount)} />

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
