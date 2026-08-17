import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Edit2, Power, Trash2 } from "lucide-react";

import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import DataListView from "../components/DataListView/DataListView.js";
import type {
  ColumnSpec,
  FilterOptionI,
} from "../components/DataListView/types.js";
import { PRODUCT_STATUS_OPTIONS } from "../config/filters.js";
import { CURRENCY_OPTIONS } from "../config/options.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import { formatCurrency } from "../lib/format.js";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  updateProductStatus,
} from "../services/product-service.js";
import type { Product, ProductStatus } from "../types/product.js";

type ProductModal =
  | { mode: "create" }
  | { mode: "edit"; product: Product }
  | null;

const DEFAULT_CURRENCY = "COP";

const SAVE_MESSAGE = "No fue posible guardar el producto";

const STATUS_BADGE_CLASS: Record<ProductStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge badge-danger",
};

const STATUS_LABEL = Object.fromEntries(
  PRODUCT_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProductStatus, string>;

export default function Products() {
  const buildFetcher = useCallback(
    (params: { search: string; status: string; currency: string }) => () =>
      getProducts({
        search: params.search || undefined,
        status: params.status || undefined,
        currency: params.currency || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, set } = useFilteredList(buildFetcher, {
    status: "",
    currency: "",
  });

  const role = getUserRole();
  const canCreate = can(role, "products", "create");
  const canChangeStatus = can(role, "products", "changeStatus");
  const canEdit = can(role, "products", "update");
  const canDelete = can(role, "products", "delete");

  const toast = useToast();
  const { confirm } = useConfirm();

  const [modal, setModal] = useState<ProductModal>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  const [nameError, setNameError] = useState("");
  const [unitPriceError, setUnitPriceError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function openCreate() {
    setName("");
    setSku("");
    setDescription("");
    setUnitPrice("");
    setCurrency(DEFAULT_CURRENCY);
    setNameError("");
    setUnitPriceError("");
    setSaveError("");
    setModal({ mode: "create" });
  }

  function openEdit(product: Product) {
    setName(product.name);
    setSku(product.sku ?? "");
    setDescription(product.description ?? "");
    setUnitPrice(String(product.unitPrice));
    setCurrency(product.currency);
    setNameError("");
    setUnitPriceError("");
    setSaveError("");
    setModal({ mode: "edit", product });
  }

  function closeModal() {
    setModal(null);
    setNameError("");
    setUnitPriceError("");
    setSaveError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (name.trim()) {
      setNameError("");
    } else {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    const parsedPrice = Number(unitPrice);

    if (unitPrice === "" || Number.isNaN(parsedPrice)) {
      setUnitPriceError("Ingresa un precio válido");
      hasErrors = true;
    } else if (parsedPrice < 0) {
      setUnitPriceError("El precio no puede ser negativo");
      hasErrors = true;
    } else {
      setUnitPriceError("");
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      if (modal?.mode === "edit") {
        await updateProduct(modal.product._id, {
          name,
          ...(sku ? { sku } : {}),
          ...(description ? { description } : {}),
          unitPrice: Number(unitPrice),
          currency,
        });

        toast.success("Cambios guardados");
      } else {
        await createProduct({
          name,
          ...(sku ? { sku } : {}),
          ...(description ? { description } : {}),
          unitPrice: Number(unitPrice),
          currency,
        });

        toast.success("Producto creado");
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

  const productFilters = useMemo<FilterOptionI[]>(
    () => [
      {
        key: "status",
        label: "Estado",
        type: "select",
        options: PRODUCT_STATUS_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      {
        key: "currency",
        label: "Moneda",
        type: "select",
        options: CURRENCY_OPTIONS.map((option) => ({
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
            {product.description && (
              <span className="cell-sub">{product.description}</span>
            )}
          </div>
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
                onClick={() =>
                  handleStatusChange(
                    product,
                    product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  )
                }
              >
                <Power size={16} />
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                className="btn-icon-action"
                title="Editar"
                aria-label="Editar"
                onClick={() => openEdit(product)}
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
                onClick={() => handleDelete(product)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canChangeStatus, canEdit, canDelete, handleStatusChange, handleDelete],
  );

  if (error) {
    return <PageState kind="error" title="No fue posible cargar" message={error} />;
  }

  return (
    <main>
      <PageHeader
        title="Productos"
        description={`${data?.data.length ?? 0} productos`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
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
          set("currency", filters.currency ?? "");
        }}
      />

      <Modal
        open={modal !== null}
        title={modal?.mode === "edit" ? "Editar producto" : "Nuevo producto"}
        onClose={closeModal}
      >
        <form className="modal__form" onSubmit={handleSubmit}>
          <Field
            id="product-name"
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
            id="product-sku"
            label="SKU"
            type="text"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
          />

          <div className="form-field">
            <label htmlFor="product-description">Descripción</label>

            <textarea
              id="product-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="form-card__grid">
            <Field
              id="product-unit-price"
              label="Precio"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              error={unitPriceError}
              onChange={(event) => {
                setUnitPrice(event.target.value);
                setUnitPriceError("");
              }}
              required
            />

            <div className="form-field">
              <label htmlFor="product-currency">Moneda</label>

              <select
                id="product-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

          <Button type="submit" variant="primary" disabled={saving}>
            {saving
              ? "Guardando..."
              : modal?.mode === "edit"
                ? "Guardar cambios"
                : "Crear producto"}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
