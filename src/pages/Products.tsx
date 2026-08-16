import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import EntityCard from "../components/EntityCard.js";
import type { EntityAction } from "../components/EntityCard.js";
import Field from "../components/Field.js";
import FilterPanel from "../components/FilterPanel.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import { PRODUCT_FILTER_FIELDS } from "../config/filters.js";
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

export default function Products() {
  const buildFetcher = useCallback(
    (params: {
      search: string;
      status: string;
      currency: string;
      priceFrom: string;
      priceTo: string;
    }) => () =>
      getProducts({
        search: params.search || undefined,
        status: params.status || undefined,
        currency: params.currency || undefined,
        minPrice: params.priceFrom ? Number(params.priceFrom) : undefined,
        maxPrice: params.priceTo ? Number(params.priceTo) : undefined,
      }),
    [],
  );
  const { data, loading, error, reload, search, setSearch, values, set, clear } =
    useFilteredList(buildFetcher, {
      status: "",
      currency: "",
      priceFrom: "",
      priceTo: "",
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

    if (!name.trim()) {
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

  async function handleStatusChange(product: Product, status: ProductStatus) {
    const statusAction =
      status === "ACTIVE"
        ? { label: "Activar", message: "El producto volverá a estar disponible." }
        : {
            label: "Desactivar",
            message: "El producto dejará de estar disponible para nuevas cotizaciones.",
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
  }

  async function handleDelete(product: Product) {
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
  }

  function productActions(product: Product): EntityAction[] {
    const actions: EntityAction[] = [];

    if (canChangeStatus) {
      actions.push(
        product.status === "ACTIVE"
          ? {
              icon: "power",
              ariaLabel: "Desactivar",
              onClick: () => handleStatusChange(product, "INACTIVE"),
              variant: "secondary",
            }
          : {
              icon: "power",
              ariaLabel: "Activar",
              onClick: () => handleStatusChange(product, "ACTIVE"),
              variant: "primary",
            },
      );
    }

    if (canEdit) {
      actions.push({
        icon: "edit",
        ariaLabel: "Editar",
        onClick: () => openEdit(product),
        variant: "secondary",
      });
    }

    if (canDelete) {
      actions.push({
        icon: "trash",
        ariaLabel: "Eliminar",
        onClick: () => handleDelete(product),
        variant: "danger",
      });
    }

    return actions;
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

      <FilterPanel
        fields={PRODUCT_FILTER_FIELDS}
        values={values}
        onSet={set}
        onClear={clear}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, SKU o descripción..."
      />

      {loading ? (
        <PageState
          kind="loading"
          title="Cargando productos..."
          message="Esto puede tomar unos segundos"
        />
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No hay productos"
          message="Crea tu primer producto para poder cotizarlo"
        >
          {canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo producto
            </Button>
          )}
        </EmptyState>
      ) : (
        <section className="entity-grid">
          {data.data.map((product) => (
            <EntityCard
              key={product._id}
              eyebrow="Producto"
              title={product.name}
              status={product.status}
              fields={[
                ...(product.sku
                  ? [{ label: "SKU", value: product.sku }]
                  : []),
                {
                  label: "Precio",
                  value: formatCurrency(product.unitPrice, product.currency),
                },
              ]}
              actions={productActions(product)}
            >
              {product.description && (
                <p className="product-description">{product.description}</p>
              )}
            </EntityCard>
          ))}
        </section>
      )}

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

          <Button
            type="submit"
            variant="primary"
            icon="check"
            iconOnly
            disabled={saving}
          >
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
