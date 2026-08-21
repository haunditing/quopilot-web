import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Info, Sparkles } from "lucide-react";

import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import {
  ITEM_TYPE_OPTIONS,
  PRICE_LIST_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  TAX_RATE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
  WAREHOUSE_OPTIONS,
} from "../config/product-options.js";
import { useToast } from "../hooks/useToast.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
import { formatCurrency, formatPercentage } from "../lib/format.js";
import {
  createProduct,
  getProduct,
  updateProduct,
} from "../services/product-service.js";
import type {
  ItemType,
  PriceListEntry,
  Product,
  UnitOfMeasure,
  WarehouseStock,
} from "../types/product.js";

interface ProductDetailProps {
  productId?: string;
}

interface Draft {
  name: string;
  itemType: ItemType;
  unitOfMeasure: string;
  warehouse: string;
}

const SAVE_MESSAGE = "No fue posible guardar el producto";

interface FormState {
  itemType: ItemType;
  name: string;
  reference: string;
  sku: string;
  barcode: string;
  category: string;
  description: string;
  imageUrl: string;
  unitOfMeasure: string;
  basePrice: string;
  cost: string;
  taxRate: string;
  priceLists: PriceListEntry[];
  accountingAccount: string;
  incomeAccount: string;
  inventoryAccount: string;
  fiscalCode: string;
  warehouses: WarehouseStock[];
  minStock: string;
  maxStock: string;
  lowStockAlert: boolean;
}

function formFromProduct(product: Product): FormState {
  return {
    itemType: product.itemType,
    name: product.name,
    reference: product.reference ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    category: product.category ?? "",
    description: product.description ?? "",
    imageUrl: product.image?.url ?? "",
    unitOfMeasure: product.unitOfMeasure ?? "UNIT",
    basePrice: String(product.basePrice),
    cost: product.cost !== undefined ? String(product.cost) : "",
    taxRate: String(product.taxRate),
    priceLists: product.priceLists ?? [],
    accountingAccount: product.accountingAccount ?? "",
    incomeAccount: product.incomeAccount ?? "",
    inventoryAccount: product.inventoryAccount ?? "",
    fiscalCode: product.fiscalCode ?? "",
    warehouses: product.warehouses ?? [],
    minStock: product.minStock !== undefined ? String(product.minStock) : "",
    maxStock: product.maxStock !== undefined ? String(product.maxStock) : "",
    lowStockAlert: product.lowStockAlert ?? false,
  };
}

function formFromDraft(draft: Draft | undefined): FormState {
  const base = {
    itemType: "PRODUCT" as ItemType,
    name: "",
    reference: "",
    sku: "",
    barcode: "",
    category: "",
    description: "",
    imageUrl: "",
    unitOfMeasure: "UNIT",
    basePrice: "",
    cost: "",
    taxRate: "0",
    priceLists: [],
    accountingAccount: "",
    incomeAccount: "",
    inventoryAccount: "",
    fiscalCode: "",
    warehouses: [],
    minStock: "",
    maxStock: "",
    lowStockAlert: false,
  };

  if (!draft) {
    return base;
  }

  return {
    ...base,
    itemType: draft.itemType,
    name: draft.name,
    unitOfMeasure: draft.unitOfMeasure,
    warehouses: [{ name: draft.warehouse, quantity: 0 }],
  } as FormState;
}

function toUnitOfMeasure(value: string): UnitOfMeasure | undefined {
  const valid = UNIT_OF_MEASURE_OPTIONS.some(
    (option) => option.value === value,
  );

  return valid ? (value as UnitOfMeasure) : undefined;
}

function warehouseNames(): string[] {
  return WAREHOUSE_OPTIONS.map((option) => option.value);
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const isEdit = Boolean(productId);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<FormState>(() =>
    formFromDraft((location.state as { draft?: Draft } | null)?.draft),
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    pricing: true,
    inventory: false,
    accounting: false,
    copilot: false,
  });

  const [nameError, setNameError] = useState("");
  const [basePriceError, setBasePriceError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotNotice, setCopilotNotice] = useState("");

  const { hasCapability } = useCapabilities();
  const canEdit = hasCapability("products.update");

  useEffect(() => {
    if (!productId) {
      return;
    }

    const id = productId;
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const product = await getProduct(id);

        if (active) {
          setForm(formFromProduct(product));
        }
      } catch (requestError: unknown) {
        if (active) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar el producto",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [productId]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));

      if (key === "name") {
        setNameError("");
      }

      if (key === "basePrice") {
        setBasePriceError("");
      }
    },
    [],
  );

  const isService = form.itemType === "SERVICE";
  const isCombo = form.itemType === "COMBO";
  const isProduct = form.itemType === "PRODUCT";

  const taxPercent = useMemo(() => {
    const parsed = Number(form.taxRate);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [form.taxRate]);

  const totalPrice = useMemo(() => {
    const base = Number(form.basePrice);

    if (!Number.isFinite(base) || base < 0) {
      return null;
    }

    return Number((base * (1 + taxPercent / 100)).toFixed(2));
  }, [form.basePrice, taxPercent]);

  const marginPercent = useMemo(() => {
    const base = Number(form.basePrice);
    const cost = Number(form.cost);

    if (
      !Number.isFinite(base) ||
      base <= 0 ||
      !Number.isFinite(cost) ||
      cost < 0
    ) {
      return null;
    }

    return Number((((base - cost) / base) * 100).toFixed(1));
  }, [form.basePrice, form.cost]);

  const totalStock = useMemo(
    () =>
      form.warehouses.reduce((sum, warehouse) => sum + warehouse.quantity, 0),
    [form.warehouses],
  );

  const taxOptionValue =
    TAX_RATE_OPTIONS.find((option) => Number(option.value) === taxPercent)
      ?.value ?? String(taxPercent);

  function toggleSection(key: string) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateWarehouse(index: number, patch: Partial<WarehouseStock>) {
    setForm((current) => ({
      ...current,
      warehouses: current.warehouses.map((warehouse, i) =>
        i === index ? { ...warehouse, ...patch } : warehouse,
      ),
    }));
  }

  function updatePriceList(
    priceListId: string,
    value: string,
    priceListName: string,
  ) {
    const price = Number(value);
    const parsed = Number.isFinite(price) && price >= 0 ? price : 0;

    setForm((current) => {
      const existing = current.priceLists.some(
        (entry) => entry.priceListId === priceListId,
      );

      if (!existing) {
        return {
          ...current,
          priceLists: [
            ...current.priceLists,
            { priceListId, priceListName, price: parsed },
          ],
        };
      }

      return {
        ...current,
        priceLists: current.priceLists.map((entry) =>
          entry.priceListId === priceListId
            ? { ...entry, price: parsed }
            : entry,
        ),
      };
    });
  }

  function addWarehouse() {
    const names = warehouseNames();
    const used = new Set(form.warehouses.map((warehouse) => warehouse.name));
    const available = names.find((name) => !used.has(name));

    if (!available) {
      return;
    }

    setField("warehouses", [
      ...form.warehouses,
      { name: available, quantity: 0 },
    ]);
  }

  function removeWarehouse(index: number) {
    setForm((current) => ({
      ...current,
      warehouses: current.warehouses.filter((_, i) => i !== index),
    }));
  }

  function handleGenerateDescription() {
    if (!form.name.trim()) {
      setNameError("El nombre es obligatorio");
      toast.error("Escribe un nombre para generar la descripción");
      return;
    }

    setCopilotLoading(true);
    setCopilotNotice("");

    window.setTimeout(() => {
      const template = isService
        ? `Servicio de ${form.name}. Incluye atención personalizada, ejecución con estándares de calidad y soporte durante todo el proceso.`
        : `${form.name} diseñado para ofrecer la mejor relación calidad-precio. Fabricado con materiales duraderos y verificado por nuestro equipo antes del despacho.`;

      setForm((current) => ({
        ...current,
        description: current.description.trim()
          ? template
          : current.description,
      }));
      setCopilotLoading(false);
      setCopilotNotice(
        "Descripción comercial generada por el copiloto. Revisa y ajusta antes de guardar.",
      );
    }, 900);
  }

  function handleSuggestPrice() {
    const cost = Number(form.cost);

    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error(
        "Ingresa un costo inicial para que el copiloto sugiera un precio",
      );
      return;
    }

    setCopilotLoading(true);
    setCopilotNotice("");

    window.setTimeout(() => {
      const suggested = Number((cost * 1.35).toFixed(2));

      setForm((current) => ({
        ...current,
        basePrice: String(suggested),
      }));
      setCopilotLoading(false);
      setCopilotNotice(
        `Sugerencia de precio: ${formatCurrency(
          suggested,
          "COP",
        )} (margen objetivo ~26%). Ajusta según tu estrategia comercial.`,
      );
    }, 900);
  }

  function buildInput() {
    const basePrice = Number(form.basePrice);
    const cost = Number(form.cost);
    const minStock = Number(form.minStock);
    const maxStock = Number(form.maxStock);

    return {
      itemType: form.itemType,
      name: form.name,
      description: form.description.trim() || undefined,
      reference: form.reference.trim() || undefined,
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      category: form.category || undefined,
      unitOfMeasure: toUnitOfMeasure(form.unitOfMeasure),
      basePrice: Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0,
      cost: Number.isFinite(cost) && cost > 0 ? cost : 0,
      taxRate: taxPercent,
      priceLists: form.priceLists.length ? form.priceLists : undefined,
      accountingAccount: form.accountingAccount.trim() || undefined,
      incomeAccount: form.incomeAccount.trim() || undefined,
      inventoryAccount: form.inventoryAccount.trim() || undefined,
      fiscalCode: form.fiscalCode.trim() || undefined,
      image: form.imageUrl.trim() ? { url: form.imageUrl.trim() } : undefined,
      warehouses: isProduct
        ? form.warehouses.filter((warehouse) => warehouse.quantity > 0)
        : [],
      minStock: Number.isFinite(minStock) && minStock > 0 ? minStock : 0,
      maxStock: Number.isFinite(maxStock) && maxStock > 0 ? maxStock : 0,
      lowStockAlert: isProduct && form.lowStockAlert,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!form.name.trim()) {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    const parsedBase = Number(form.basePrice);

    if (form.basePrice === "" || Number.isNaN(parsedBase)) {
      setBasePriceError("Ingresa un precio base válido");
      hasErrors = true;
    } else if (parsedBase < 0) {
      setBasePriceError("El precio no puede ser negativo");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      if (productId) {
        await updateProduct(productId, buildInput());
        toast.success("Cambios guardados");
      } else {
        await createProduct({
          ...buildInput(),
          currency: "COP",
        });
        toast.success("Producto creado");
      }

      navigate("/products");
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="master-detail">
        <LoadingOverlay title="Cargando producto..." />
      </main>
    );
  }

  if (loadError) {
    return (
      <PageState
        kind="error"
        title="No fue posible cargar"
        message={loadError}
      />
    );
  }

  return (
    <main className="master-detail">
      <PageHeader
        title={
          isEdit ? "Editar producto / servicio" : "Nuevo producto / servicio"
        }
        description="Formulario avanzado con inventario, contabilidad y automatización"
      />

      <form className="master-detail__body" onSubmit={handleSubmit}>
        <div className="master-detail__main">
          {/* Sección A: Información general */}
          <section className="master-detail-card">
            <button
              type="button"
              className="master-detail-card__heading"
              onClick={() => toggleSection("general")}
              aria-expanded={openSections.general}
            >
              <span className="master-detail-card__heading-text">
                <strong>A · Información general</strong>
                <small>Tipo de ítem, nombre, referencia e imagen</small>
              </span>

              {openSections.general ? (
                <ChevronUp size={18} className="master-detail-card__chevron" />
              ) : (
                <ChevronDown
                  size={18}
                  className="master-detail-card__chevron"
                />
              )}
            </button>

            {openSections.general && (
              <>
                {isEdit && (
                  <div className="product-callout" role="note">
                    <Info size={18} className="product-callout__icon" />

                    <div className="product-callout__text">
                      <strong>El tipo de ítem no se puede modificar</strong>

                      <p>
                        {form.itemType === "PRODUCT"
                          ? "Este ítem es un Producto."
                          : form.itemType === "SERVICE"
                            ? "Este ítem es un Servicio."
                            : "Este ítem es un Combo / Kit."}
                      </p>
                    </div>
                  </div>
                )}

                <div
                  className="product-card__type"
                  role="group"
                  aria-label="Tipo de ítem"
                >
                  {ITEM_TYPE_OPTIONS.map((option) => {
                    const isActive = form.itemType === option.value;
                    const disabled = isEdit && !isActive;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          isActive
                            ? "product-card__type-tab product-card__type-tab--active"
                            : "product-card__type-tab"
                        }
                        aria-pressed={isActive}
                        disabled={disabled}
                        onClick={() => setField("itemType", option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="master-detail-card__grid">
                  <Field
                    id="product-name"
                    label="Nombre"
                    type="text"
                    value={form.name}
                    error={nameError}
                    onChange={(event) => setField("name", event.target.value)}
                    required
                  />

                  <div className="form-field">
                    <label htmlFor="product-category">
                      Categoría / Familia
                    </label>

                    <select
                      id="product-category"
                      value={form.category}
                      onChange={(event) =>
                        setField("category", event.target.value)
                      }
                    >
                      <option value="">Sin categoría</option>

                      {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="master-detail-card__grid">
                  <Field
                    id="product-reference"
                    label="Referencia / SKU"
                    type="text"
                    value={form.reference}
                    onChange={(event) =>
                      setField("reference", event.target.value)
                    }
                    placeholder="Ej.: HP-14-X360"
                  />

                  <Field
                    id="product-sku"
                    label="Código interno (SKU)"
                    type="text"
                    value={form.sku}
                    onChange={(event) => setField("sku", event.target.value)}
                    placeholder="Ej.: SKU-0001"
                  />
                </div>

                <div className="master-detail-card__grid">
                  <Field
                    id="product-barcode"
                    label="Código de barras (EAN/UPC)"
                    type="text"
                    value={form.barcode}
                    onChange={(event) =>
                      setField("barcode", event.target.value)
                    }
                    placeholder="Ej.: 7701234567890"
                  />

                  <Field
                    id="product-image"
                    label="Imagen principal (URL)"
                    type="text"
                    value={form.imageUrl}
                    onChange={(event) =>
                      setField("imageUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="product-description">
                    Descripción detallada
                  </label>

                  <textarea
                    id="product-description"
                    rows={4}
                    value={form.description}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                  />
                </div>
              </>
            )}
          </section>

          {/* Sección B: Precios e impuestos */}
          <section className="master-detail-card">
            <button
              type="button"
              className="master-detail-card__heading"
              onClick={() => toggleSection("pricing")}
              aria-expanded={openSections.pricing}
            >
              <span className="master-detail-card__heading-text">
                <strong>B · Precios e impuestos</strong>
                <small>Precio base, impuesto, listas de precios y margen</small>
              </span>

              {openSections.pricing ? (
                <ChevronUp size={18} className="master-detail-card__chevron" />
              ) : (
                <ChevronDown
                  size={18}
                  className="master-detail-card__chevron"
                />
              )}
            </button>

            {openSections.pricing && (
              <>
                <div className="master-detail-card__grid">
                  <Field
                    id="product-base-price"
                    label="Precio base (sin impuestos)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basePrice}
                    error={basePriceError}
                    onChange={(event) =>
                      setField("basePrice", event.target.value)
                    }
                    required
                  />

                  <div className="form-field">
                    <label htmlFor="product-tax-rate">Impuesto / IVA</label>

                    <select
                      id="product-tax-rate"
                      value={taxOptionValue}
                      onChange={(event) =>
                        setField("taxRate", event.target.value)
                      }
                    >
                      {TAX_RATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="master-detail-card__grid">
                  <Field
                    id="product-cost"
                    label="Costo (sin impuestos)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(event) => setField("cost", event.target.value)}
                  />
                </div>

                <div className="product-price-summary">
                  <div>
                    <span>Precio total</span>
                    <small>Precio base + {taxPercent}% de impuesto</small>
                  </div>

                  <strong>
                    {totalPrice === null ? "—" : formatCurrency(totalPrice)}
                  </strong>

                  <div className="product-price-summary__margin">
                    {marginPercent === null ? (
                      <small>Ingresa costo y precio para ver el margen</small>
                    ) : (
                      <small>
                        Margen estimado:{" "}
                        <strong>{formatPercentage(marginPercent)}</strong>
                      </small>
                    )}
                  </div>
                </div>

                <div className="product-card__list-title">
                  Listas de precios múltiples
                </div>

                {PRICE_LIST_OPTIONS.map((priceList) => {
                  const entry = form.priceLists.find(
                    (item) => item.priceListId === priceList.value,
                  );

                  return (
                    <div
                      key={priceList.value}
                      className="master-detail-card__grid"
                    >
                      <div className="form-field">
                        <label>{priceList.label}</label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry?.price ?? ""}
                          placeholder="Sin precio"
                          onChange={(event) =>
                            updatePriceList(
                              priceList.value,
                              event.target.value,
                              priceList.label,
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </section>

          {/* Sección C: Inventario y almacenes */}
          <section className="master-detail-card">
            <button
              type="button"
              className="master-detail-card__heading"
              onClick={() => toggleSection("inventory")}
              aria-expanded={openSections.inventory}
              disabled={isService || isCombo}
            >
              <span className="master-detail-card__heading-text">
                <strong>C · Inventario y almacenes</strong>
                <small>
                  {isProduct
                    ? "Stock por bodega, niveles mín/máx y alertas"
                    : "Solo disponible para productos"}
                </small>
              </span>

              {openSections.inventory ? (
                <ChevronUp size={18} className="master-detail-card__chevron" />
              ) : (
                <ChevronDown
                  size={18}
                  className="master-detail-card__chevron"
                />
              )}
            </button>

            {openSections.inventory && isProduct && (
              <>
                <div className="master-detail-card__grid">
                  <Field
                    id="product-min-stock"
                    label="Stock mínimo"
                    type="number"
                    min="0"
                    step="1"
                    value={form.minStock}
                    onChange={(event) =>
                      setField("minStock", event.target.value)
                    }
                  />

                  <Field
                    id="product-max-stock"
                    label="Stock máximo"
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxStock}
                    onChange={(event) =>
                      setField("maxStock", event.target.value)
                    }
                  />
                </div>

                <div className="product-card__list-title">
                  Gestión multilocación
                  <span className="product-card__total-stock">
                    Stock total: {totalStock}
                  </span>
                </div>

                {form.warehouses.length === 0 ? (
                  <p className="product-card__empty">
                    Aún no hay bodegas configuradas para este producto.
                  </p>
                ) : (
                  <div className="product-warehouse-list">
                    {form.warehouses.map((warehouse, index) => (
                      <div key={index} className="product-warehouse-row">
                        <div className="form-field">
                          <label>Bodega</label>

                          <select
                            value={warehouse.name}
                            onChange={(event) =>
                              updateWarehouse(index, {
                                name: event.target.value,
                              })
                            }
                          >
                            {WAREHOUSE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>Cantidad</label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={warehouse.quantity}
                            onChange={(event) =>
                              updateWarehouse(index, {
                                quantity: Number(event.target.value) || 0,
                              })
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="product-warehouse-row__remove"
                          title="Quitar bodega"
                          aria-label="Quitar bodega"
                          onClick={() => removeWarehouse(index)}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="product-card__add"
                  onClick={addWarehouse}
                >
                  + Agregar bodega
                </button>

                <label className="product-switch">
                  <input
                    type="checkbox"
                    checked={form.lowStockAlert}
                    onChange={(event) =>
                      setField("lowStockAlert", event.target.checked)
                    }
                  />

                  <span className="product-switch__track" aria-hidden="true" />

                  <span className="product-switch__label">
                    Activar alerta de reabastecimiento cuando el stock baje del
                    mínimo
                  </span>
                </label>
              </>
            )}
          </section>

          {/* Sección D: Contabilidad */}
          <section className="master-detail-card">
            <button
              type="button"
              className="master-detail-card__heading"
              onClick={() => toggleSection("accounting")}
              aria-expanded={openSections.accounting}
            >
              <span className="master-detail-card__heading-text">
                <strong>D · Contabilidad y clasificación fiscal</strong>
                <small>Cuentas contables y códigos de homologación</small>
              </span>

              {openSections.accounting ? (
                <ChevronUp size={18} className="master-detail-card__chevron" />
              ) : (
                <ChevronDown
                  size={18}
                  className="master-detail-card__chevron"
                />
              )}
            </button>

            {openSections.accounting && (
              <>
                <div className="master-detail-card__grid">
                  <Field
                    id="product-income-account"
                    label="Cuenta contable de ingresos"
                    type="text"
                    value={form.incomeAccount}
                    onChange={(event) =>
                      setField("incomeAccount", event.target.value)
                    }
                    placeholder="Ej.: 4105-01"
                  />

                  <Field
                    id="product-accounting-account"
                    label="Cuenta contable general"
                    type="text"
                    value={form.accountingAccount}
                    onChange={(event) =>
                      setField("accountingAccount", event.target.value)
                    }
                    placeholder="Ej.: 1435-01"
                  />
                </div>

                <div className="master-detail-card__grid">
                  <Field
                    id="product-inventory-account"
                    label="Cuenta de inventario / costo de ventas"
                    type="text"
                    value={form.inventoryAccount}
                    onChange={(event) =>
                      setField("inventoryAccount", event.target.value)
                    }
                    placeholder="Ej.: 6135-01"
                  />

                  <Field
                    id="product-fiscal-code"
                    label="Código de homologación fiscal (UNSPSC)"
                    type="text"
                    value={form.fiscalCode}
                    onChange={(event) =>
                      setField("fiscalCode", event.target.value)
                    }
                    placeholder="Ej.: 43211507"
                  />
                </div>
              </>
            )}
          </section>

          {/* Sección E: Copiloto y automatización */}
          <section className="master-detail-card">
            <button
              type="button"
              className="master-detail-card__heading"
              onClick={() => toggleSection("copilot")}
              aria-expanded={openSections.copilot}
            >
              <span className="master-detail-card__heading-text">
                <strong>E · Copiloto &amp; automatización QuoPilot</strong>
                <small>Descripciones IA, sugerencia de precio y triggers</small>
              </span>

              {openSections.copilot ? (
                <ChevronUp size={18} className="master-detail-card__chevron" />
              ) : (
                <ChevronDown
                  size={18}
                  className="master-detail-card__chevron"
                />
              )}
            </button>

            {openSections.copilot && (
              <>
                <div className="product-copilot">
                  <div className="product-copilot__action">
                    <Sparkles size={20} className="product-copilot__icon" />

                    <div className="product-copilot__text">
                      <strong>Generador de descripciones con IA</strong>

                      <p>
                        Genera una descripción comercial a partir del nombre y
                        el tipo de ítem.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={copilotLoading}
                      onClick={handleGenerateDescription}
                    >
                      {copilotLoading
                        ? "Generando..."
                        : "Autogenerar descripción"}
                    </Button>
                  </div>

                  <div className="product-copilot__action">
                    <Sparkles size={20} className="product-copilot__icon" />

                    <div className="product-copilot__text">
                      <strong>Sugerencia de precio</strong>

                      <p>
                        Analiza el costo y propone un precio con margen objetivo
                        según la categoría.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={copilotLoading}
                      onClick={handleSuggestPrice}
                    >
                      {copilotLoading ? "Analizando..." : "Sugerir precio"}
                    </Button>
                  </div>

                  {copilotNotice && (
                    <FormMessage kind="info">{copilotNotice}</FormMessage>
                  )}

                  <div className="product-copilot__trigger">
                    <strong>Disparadores / Triggers</strong>

                    <p>
                      Configura alertas o webhooks automáticos cuando el stock
                      baje del mínimo.
                    </p>

                    <label className="product-switch">
                      <input
                        type="checkbox"
                        checked={isProduct && form.lowStockAlert}
                        disabled={!isProduct}
                        onChange={(event) =>
                          setField("lowStockAlert", event.target.checked)
                        }
                      />

                      <span
                        className="product-switch__track"
                        aria-hidden="true"
                      />

                      <span className="product-switch__label">
                        Alerta automática de stock bajo
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Panel lateral */}
        <aside className="master-detail__sidebar">
          <div className="master-detail-sidebar">
            <div className="master-detail-sidebar__title">
              {form.name.trim() || "Nuevo producto"}
            </div>

            <div className="master-detail-sidebar__meta">
              <div>
                <span>Precio total</span>
                <strong>
                  {totalPrice === null ? "—" : formatCurrency(totalPrice)}
                </strong>
              </div>

              <div>
                <span>Margen estimado</span>
                <strong>
                  {marginPercent === null
                    ? "—"
                    : formatPercentage(marginPercent)}
                </strong>
              </div>

              {isProduct && (
                <div>
                  <span>Stock total</span>
                  <strong>{totalStock}</strong>
                </div>
              )}
            </div>

            <div className="master-detail-sidebar__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/products")}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={saving || (isEdit && !canEdit)}
              >
                {saving
                  ? "Guardando..."
                  : isEdit
                    ? "Guardar cambios"
                    : "Crear producto"}
              </Button>
            </div>
          </div>
        </aside>

        {saveError && <FormMessage kind="error">{saveError}</FormMessage>}
      </form>
    </main>
  );
}
