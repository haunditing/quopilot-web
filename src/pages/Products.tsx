import { useCallback, useMemo, useState } from "react";
import { Power, Trash2 } from "lucide-react";

import Button from "../components/Button.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import ProductQuickModal from "../components/ProductQuickModal.js";
import DataListView from "../components/DataListView/DataListView.js";
import type { ColumnSpec } from "../components/DataListView/types.js";
import { PRODUCT_STATUS_OPTIONS } from "../config/filters.js";
import { PRODUCT_CATEGORY_OPTIONS } from "../config/product-options.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
import { formatCurrency } from "../lib/format.js";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProductStatus,
} from "../services/product-service.js";
import type { ItemType, Product, ProductStatus } from "../types/product.js";
import { useNavigate } from "react-router-dom";

const DEFAULT_CURRENCY = "COP";

const SAVE_MESSAGE = "No fue posible guardar el producto";

const STATUS_BADGE_CLASS: Record<ProductStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge badge-danger",
};

const STATUS_LABEL = Object.fromEntries(
  PRODUCT_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProductStatus, string>;

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  PRODUCT: "Producto",
  SERVICE: "Servicio",
  COMBO: "Combo / Kit",
};

export default function Products() {
  const navigate = useNavigate();

  const buildFetcher = useCallback(
    (params: { search: string; status: string; category: string }) => () =>
      getProducts({
        search: params.search || undefined,
        status: params.status || undefined,
        category: params.category || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, set } = useFilteredList(buildFetcher, {
    status: "",
    category: "",
  });

  const { hasCapability } = useCapabilities();
  const canCreate = hasCapability("products.create");
  const canChangeStatus = hasCapability("products.changeStatus");
  const canDelete = hasCapability("products.delete");

  const toast = useToast();
  const { confirm } = useConfirm();

  const [quickOpen, setQuickOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function openQuickCreate() {
    setSaveError("");
    setQuickOpen(true);
  }

  function closeQuickModal() {
    if (!saving) {
      setQuickOpen(false);
      setSaveError("");
    }
  }

  async function handleQuickSubmit(input: {
    itemType: ItemType;
    name: string;
    warehouse: string;
    unitOfMeasure: string;
    quantity: string;
    cost: string;
    basePrice: string;
    taxRate: string;
  }) {
    setSaving(true);
    setSaveError("");

    const quantity = Number(input.quantity);
    const cost = Number(input.cost);
    const basePrice = Number(input.basePrice);
    const taxRate = Number(input.taxRate);

    try {
      await createProduct({
        itemType: input.itemType,
        name: input.name,
        unitOfMeasure: input.unitOfMeasure as Product["unitOfMeasure"],
        basePrice: Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0,
        cost: Number.isFinite(cost) && cost > 0 ? cost : 0,
        taxRate: Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0,
        currency: DEFAULT_CURRENCY,
        warehouses:
          Number.isFinite(quantity) && quantity > 0
            ? [{ name: input.warehouse, quantity }]
            : [],
      });

      toast.success("Producto creado");
      setQuickOpen(false);
      reload();
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

  function handleGoAdvanced(draft: {
    name: string;
    itemType: ItemType;
    unitOfMeasure: string;
    warehouse: string;
  }) {
    setQuickOpen(false);
    navigate("/products/new", {
      state: {
        draft: {
          ...draft,
          warehouse: draft.warehouse,
        },
      },
    });
  }

  const handleStatusChange = useCallback(
    async (product: Product, status: ProductStatus) => {
      const statusAction =
        status === "ACTIVE"
          ? {
              label: "Activar",
              message: "El producto volverá a estar disponible.",
            }
          : {
              label: "Desactivar",
              message:
                "El producto dejará de estar disponible para nuevas cotizaciones.",
            };
      const confirmed = await confirm({
        title: `${statusAction.label} producto`,
        message: `¿${statusAction.label} "${product.name}"? ${statusAction.message}`,
        confirmLabel: statusAction.label,
      });

      if (!confirmed) {
        return;
      }

      try {
        await updateProductStatus(product._id, status);
        reload();
        toast.success(`Producto ${statusAction.label.toLowerCase()}`);
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "No fue posible cambiar el estado del producto",
        );
      }
    },
    [confirm, reload, toast],
  );

  const handleDelete = useCallback(
    async (product: Product) => {
      const confirmed = await confirm({
        title: "Eliminar producto",
        message: `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: "Eliminar",
        danger: true,
      });

      if (!confirmed) {
        return;
      }

      try {
        await deleteProduct(product._id);
        reload();
        toast.success("Producto eliminado");
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "No fue posible eliminar el producto",
        );
      }
    },
    [confirm, reload, toast],
  );

  const productFilters = useMemo(
    () => [
      {
        key: "status",
        label: "Estado",
        type: "select" as const,
        options: PRODUCT_STATUS_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      {
        key: "category",
        label: "Categoría",
        type: "select" as const,
        options: PRODUCT_CATEGORY_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
    ],
    [],
  );

  const columns = useMemo<ColumnSpec<Product>[]>(
    () => [
      {
        key: "name",
        label: "Nombre",
        render: (product) => (
          <div className="cell-main">
            <strong>{product.name}</strong>
            {product.reference && (
              <span className="cell-sub">{product.reference}</span>
            )}
          </div>
        ),
      },
      {
        key: "itemType",
        label: "Tipo",
        render: (product) => (
          <span className="badge badge-neutral">{ITEM_TYPE_LABEL[product.itemType]}</span>
        ),
      },
      {
        key: "sku",
        label: "SKU",
        render: (product) => product.sku || "—",
      },
      {
        key: "unitPrice",
        label: "Precio",
        align: "right",
        render: (product) =>
          formatCurrency(product.unitPrice, product.currency),
      },
      {
        key: "status",
        label: "Estado",
        render: (product) => (
          <span className={STATUS_BADGE_CLASS[product.status]}>
            {STATUS_LABEL[product.status]}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (product) => (
          <div className="row-actions">
            {canChangeStatus && (
              <button
                type="button"
                className="btn-icon-action"
                title={product.status === "ACTIVE" ? "Desactivar" : "Activar"}
                aria-label={
                  product.status === "ACTIVE" ? "Desactivar" : "Activar"
                }
                onClick={(event) => {
                  event.stopPropagation();
                  handleStatusChange(
                    product,
                    product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  );
                }}
              >
                <Power size={16} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn-icon-action btn-danger"
                title="Eliminar"
                aria-label="Eliminar"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDelete(product);
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canChangeStatus, canDelete, handleStatusChange, handleDelete],
  );

  if (error) {
    return <PageState kind="error" title="No fue posible cargar" message={error} />;
  }

  return (
    <main>
      <PageHeader
        title="Productos / Servicios"
        description={`${data?.data.length ?? 0} ítems de venta`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openQuickCreate}>
              Nuevo producto
            </Button>
          )
        }
      />

      <DataListView<Product>
        items={data?.data ?? []}
        columns={columns}
        rowKey={(product) => product._id}
        filters={productFilters}
        loading={loading}
        emptyState="Crea tu primer producto para poder cotizarlo"
        onFilterChange={(filters) => {
          set("status", filters.status ?? "");
          set("category", filters.category ?? "");
        }}
        onRowClick={(product) => navigate(`/products/${product._id}`)}
      />

      <ProductQuickModal
        open={quickOpen}
        defaultItemType="PRODUCT"
        currency={DEFAULT_CURRENCY}
        saving={saving}
        error={saveError}
        onCancel={closeQuickModal}
        onGoAdvanced={handleGoAdvanced}
        onSubmit={handleQuickSubmit}
      />
    </main>
  );
}