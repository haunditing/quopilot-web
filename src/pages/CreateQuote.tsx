import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import CardActions from "../components/CardActions.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import ProductSearch from "../components/ProductSearch.js";
import QuotePrintTemplate from "../components/QuotePrintTemplate.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency } from "../lib/format.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import { getCustomers } from "../services/customer-service.js";
import { createQuote, getNextQuoteNumber } from "../services/quote-service.js";
import { getCurrentTenant } from "../services/tenant-service.js";
import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";
import type { Quote, QuoteItem } from "../types/quote.js";

const TAX_OPTIONS = [
  { label: "Exento 0%", value: 0 },
  { label: "IVA 5%", value: 0.05 },
  { label: "IVA 19%", value: 0.19 },
];

interface QuoteLineDraft {
  id: string;
  productId: string;
  product: Product | null;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: number;
}

function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function parseAmount(raw: string): number {
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateLineValues(line: QuoteLineDraft): QuoteItem {
  const quantity = Math.max(0, parseAmount(line.quantity));
  const unitPrice = Math.max(0, parseAmount(line.unitPrice));
  const discountPercent = Math.min(
    100,
    Math.max(0, parseAmount(line.discountPercent)),
  );
  const taxRate = line.taxRate;

  const grossSubtotal = unitPrice * quantity;
  const discountAmount = grossSubtotal * (discountPercent / 100);
  const subtotal = grossSubtotal - discountAmount;
  const taxAmount = subtotal * taxRate;
  const totalLine = subtotal + taxAmount;

  return {
    productId: line.productId,
    name: line.product?.name ?? "Producto sin nombre",
    description: line.product?.description,
    quantity,
    unitPrice,
    discountPercent,
    taxRate,
    subtotal: round(subtotal),
    taxAmount: round(taxAmount),
    totalLine: round(totalLine),
  };
}

export default function CreateQuote() {
  const navigate = useNavigate();
  const toast = useToast();
  const formId = useId();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [createdAt, setCreatedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [lines, setLines] = useState<QuoteLineDraft[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(
    new Set(),
  );
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [nextNumber, setNextNumber] = useState("Q-000001");

  const { data: tenant, loading: loadingTenant } = useAsyncData(getCurrentTenant);

  useEffect(() => {
    let cancelled = false;

    getCustomers({ limit: 100 })
      .then((response) => {
        if (cancelled) return;
        setCustomers(response.data);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("No fue posible cargar los clientes");
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomers(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getNextQuoteNumber()
      .then((number) => {
        if (!cancelled) setNextNumber(number);
      })
      .catch(() => {
        // Keep fallback number
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canCreate = can(getUserRole(), "quotes", "create");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === customerId),
    [customers, customerId],
  );

  const currency = useMemo(
    () => lines[0]?.product?.currency ?? tenant?.currency ?? "COP",
    [lines, tenant],
  );

  const quoteItems = useMemo(
    () => lines.map((line) => calculateLineValues(line)),
    [lines],
  );

  const { subtotal, totalDiscount, totalTax, total } = useMemo(() => {
    return quoteItems.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.unitPrice * item.quantity,
        totalDiscount:
          acc.totalDiscount +
          item.unitPrice * item.quantity * (item.discountPercent / 100),
        totalTax: acc.totalTax + item.taxAmount,
        total: acc.total + item.totalLine,
      }),
      { subtotal: 0, totalDiscount: 0, totalTax: 0, total: 0 },
    );
  }, [quoteItems]);

  const previewQuote: Quote | null = useMemo(() => {
    if (!tenant || !selectedCustomer || lines.length === 0) return null;

    const now = new Date();
    const createdAtDate = createdAt
      ? new Date(`${createdAt}T12:00:00`)
      : now;

    return {
      _id: "preview",
      tenantId: tenant._id,
      customerId: selectedCustomer._id,
      documentType: "QUOTE",
      number: nextNumber,
      items: quoteItems,
      subtotal: round(subtotal),
      totalDiscount: round(totalDiscount),
      totalTax: round(totalTax),
      total: round(total),
      currency,
      status: "DRAFT",
      validUntil: validUntil
        ? new Date(`${validUntil}T12:00:00`).toISOString()
        : undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      createdAt: createdAtDate.toISOString(),
      updatedAt: now.toISOString(),
    };
  }, [
    tenant,
    selectedCustomer,
    lines.length,
    quoteItems,
    subtotal,
    totalDiscount,
    totalTax,
    total,
    currency,
    createdAt,
    validUntil,
    notes,
    terms,
    nextNumber,
  ]);

  if (!canCreate) {
    return (
      <PageState
        kind="error"
        title="Acceso denegado"
        message="No tienes permisos para crear cotizaciones"
      />
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        id: generateLineId(),
        productId: "",
        product: null,
        quantity: "1",
        unitPrice: "0",
        discountPercent: "0",
        taxRate: 0,
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
    setSelectedLineIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function updateLine(id: string, updates: Partial<QuoteLineDraft>) {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, ...updates } : line,
      ),
    );
  }

  function handleSelectProduct(lineId: string, product: Product) {
    updateLine(lineId, {
      productId: product._id,
      product,
      unitPrice: String(product.unitPrice),
    });
  }

  function toggleSelectLine(id: string) {
    setSelectedLineIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedLineIds.size === lines.length && lines.length > 0) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(lines.map((line) => line.id)));
    }
  }

  function applyGlobalDiscount() {
    if (selectedLineIds.size === 0) {
      toast.info("Selecciona al menos una línea para aplicar el descuento");
      return;
    }

    setLines((current) =>
      current.map((line) =>
        selectedLineIds.has(line.id)
          ? { ...line, discountPercent: String(globalDiscount) }
          : line,
      ),
    );

    toast.success(`Descuento del ${globalDiscount}% aplicado`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!customerId) {
      setFormError("Selecciona un cliente");
      return;
    }

    if (lines.length === 0) {
      setFormError("Agrega al menos una línea");
      return;
    }

    const hasInvalidLine = lines.some(
      (line) =>
        !line.productId ||
        !Number.isInteger(parseAmount(line.quantity)) ||
        parseAmount(line.quantity) < 1,
    );

    if (hasInvalidLine) {
      setFormError("Completa el producto y la cantidad de cada línea");
      return;
    }

    setSaving(true);

    try {
      await createQuote({
        customerId,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: parseAmount(line.quantity),
          unitPrice: parseAmount(line.unitPrice),
          discountPercent: parseAmount(line.discountPercent),
          taxRate: line.taxRate,
        })),
        validUntil: validUntil
          ? new Date(`${validUntil}T12:00:00`).toISOString()
          : undefined,
        notes: notes || undefined,
        terms: terms || undefined,
      });

      toast.success("Cotización creada con éxito");
      navigate("/quotes");
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible crear la cotización",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingCustomers || loadingTenant) {
    return <PageState kind="loading" title="Cargando..." />;
  }

  if (loadError) {
    return <PageState kind="error" title="Error" message={loadError} />;
  }

  return (
    <main>
      <PageHeader
        title="Nueva cotización"
        description="Crea una cotización profesional para tu cliente"
        actions={
          <Button
            type="button"
            variant="secondary"
            icon="close"
            iconOnly
            onClick={() => navigate("/quotes")}
          >
            Cancelar
          </Button>
        }
      />

      <form id={formId} className="quote-erp" onSubmit={handleSubmit}>
        <div className="quote-erp__layout">
          <div className="quote-erp__main">
            <section className="quote-erp__header-doc">
              <div className="quote-erp__issuer">
                {tenant?.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="quote-erp__logo"
                  />
                ) : (
                  <div className="quote-erp__logo-placeholder">
                    {tenant?.name.slice(0, 2).toUpperCase() ?? "EM"}
                  </div>
                )}
                <div className="quote-erp__issuer-info">
                  <strong>{tenant?.legalName ?? tenant?.name}</strong>
                  {tenant?.email && <span>{tenant.email}</span>}
                </div>
              </div>

              <div className="quote-erp__doc-meta">
                <div className="quote-erp__doc-type">
                  <label htmlFor="document-type">Documento</label>
                  <select id="document-type" defaultValue="QUOTE">
                    <option value="QUOTE">Cotización</option>
                  </select>
                </div>
                <div className="quote-erp__doc-number">
                  <span>No.</span>
                  <strong>{nextNumber}</strong>
                </div>
              </div>
            </section>

            <section className="quote-erp__card">
              <h3 className="quote-erp__card-title">Datos generales</h3>

              <div className="quote-erp__grid-3">
                <div className="form-field">
                  <label htmlFor="quote-customer">Cliente *</label>
                  <select
                    id="quote-customer"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecciona un cliente
                    </option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="quote-created">Fecha de creación</label>
                  <input
                    id="quote-created"
                    type="date"
                    value={createdAt}
                    onChange={(e) => setCreatedAt(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="quote-valid">Válida hasta</label>
                  <input
                    id="quote-valid"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="quote-erp__card">
              <div className="quote-erp__table-header">
                <h3 className="quote-erp__card-title">
                  Productos y servicios
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  icon="plus"
                  iconOnly
                  onClick={addLine}
                  aria-label="Agregar línea"
                  title="Agregar línea"
                >
                  Agregar línea
                </Button>
              </div>

              {lines.length === 0 && (
                <div className="quote-erp__table-empty">
                  <Icon name="empty" size={40} />
                  <p>Agrega líneas para armar la cotización</p>
                </div>
              )}

              {lines.length > 0 && (
                <div className="quote-erp__table-wrapper">
                  <table className="quote-erp__table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={selectedLineIds.size === lines.length}
                            onChange={toggleSelectAll}
                            aria-label="Seleccionar todas las líneas"
                          />
                        </th>
                        <th>Producto / Servicio</th>
                        <th>Cantidad</th>
                        <th>Precio unitario</th>
                        <th>% Desc.</th>
                        <th>Impuesto</th>
                        <th>Subtotal</th>
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const values = calculateLineValues(line);

                        return (
                          <tr key={line.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedLineIds.has(line.id)}
                                onChange={() => toggleSelectLine(line.id)}
                                aria-label="Seleccionar línea"
                              />
                            </td>
                            <td className="quote-erp__product-cell">
                              {line.product ? (
                                <div className="quote-erp__product-selected">
                                  <strong>{line.product.name}</strong>
                                  {line.product.sku && (
                                    <span>Ref: {line.product.sku}</span>
                                  )}
                                </div>
                              ) : (
                                <ProductSearch
                                  onSelect={(product) =>
                                    handleSelectProduct(line.id, product)
                                  }
                                  placeholder="Buscar producto..."
                                />
                              )}
                            </td>
                            <td>
                              <input
                                type="number"
                                className="quote-erp__input-sm"
                                min={1}
                                step={1}
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    quantity: e.target.value,
                                  })
                                }
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="quote-erp__input-md"
                                min={0}
                                step={0.01}
                                value={line.unitPrice}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    unitPrice: e.target.value,
                                  })
                                }
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="quote-erp__input-sm"
                                min={0}
                                max={100}
                                step={0.01}
                                value={line.discountPercent}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    discountPercent: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <select
                                className="quote-erp__input-md"
                                value={line.taxRate}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    taxRate: Number(e.target.value),
                                  })
                                }
                              >
                                {TAX_OPTIONS.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="quote-erp__amount">
                              {formatCurrency(values.subtotal, currency)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="quote-erp__remove"
                                onClick={() => removeLine(line.id)}
                                aria-label="Quitar línea"
                              >
                                <Icon name="trash" size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {lines.length > 0 && (
                <div className="quote-erp__lines-mobile">
                  {lines.map((line, index) => {
                    const values = calculateLineValues(line);

                    return (
                      <article
                        key={line.id}
                        className={
                          selectedLineIds.has(line.id)
                            ? "quote-line-card quote-line-card--selected"
                            : "quote-line-card"
                        }
                      >
                        <header className="quote-line-card__header">
                          <label className="quote-line-card__select">
                            <input
                              type="checkbox"
                              checked={selectedLineIds.has(line.id)}
                              onChange={() => toggleSelectLine(line.id)}
                            />
                            <span>Línea {index + 1}</span>
                          </label>

                          <button
                            type="button"
                            className="quote-erp__remove"
                            onClick={() => removeLine(line.id)}
                            aria-label="Quitar línea"
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </header>

                        <div className="quote-line-card__product">
                          {line.product ? (
                            <div className="quote-erp__product-selected">
                              <strong>{line.product.name}</strong>
                              {line.product.sku && (
                                <span>Ref: {line.product.sku}</span>
                              )}
                            </div>
                          ) : (
                            <ProductSearch
                              onSelect={(product) =>
                                handleSelectProduct(line.id, product)
                              }
                              placeholder="Buscar producto..."
                            />
                          )}
                        </div>

                        <div className="quote-line-card__fields">
                          <div className="quote-line-card__field">
                            <label>Cantidad</label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  quantity: e.target.value,
                                })
                              }
                              required
                            />
                          </div>

                          <div className="quote-line-card__field">
                            <label>Precio unitario</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={line.unitPrice}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  unitPrice: e.target.value,
                                })
                              }
                              required
                            />
                          </div>

                          <div className="quote-line-card__field">
                            <label>Descuento %</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={line.discountPercent}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  discountPercent: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="quote-line-card__field">
                            <label>Impuesto</label>
                            <select
                              value={line.taxRate}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  taxRate: Number(e.target.value),
                                })
                              }
                            >
                              {TAX_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <footer className="quote-line-card__footer">
                          <span>Subtotal</span>
                          <strong>
                            {formatCurrency(values.subtotal, currency)}
                          </strong>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="quote-erp__bulk">
                <span>
                  {selectedLineIds.size} línea(s) seleccionada(s)
                </span>
                <div className="quote-erp__bulk-action">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                    aria-label="Descuento global %"
                  />
                  <span>%</span>
                  <Button
                    type="button"
                    variant="secondary"
                    icon="check"
                    iconOnly
                    onClick={applyGlobalDiscount}
                    disabled={selectedLineIds.size === 0}
                    aria-label="Aplicar descuento"
                    title="Aplicar descuento"
                  >
                    Aplicar descuento
                  </Button>
                </div>
              </div>
            </section>

            <section className="quote-erp__card">
              <h3 className="quote-erp__card-title">Notas y términos</h3>

              <div className="quote-erp__grid-2">
                <div className="form-field">
                  <label htmlFor="quote-notes">Notas</label>
                  <textarea
                    id="quote-notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales para el cliente..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="quote-terms">Términos y condiciones</label>
                  <textarea
                    id="quote-terms"
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Políticas de pago, tiempo de entrega, validez..."
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="quote-erp__sidebar">
            <div className="quote-erp__totals">
              <h3 className="quote-erp__card-title">Resumen</h3>

              <div className="quote-erp__total-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal, currency)}</strong>
              </div>
              <div className="quote-erp__total-row">
                <span>Descuentos</span>
                <strong>{formatCurrency(totalDiscount, currency)}</strong>
              </div>
              <div className="quote-erp__total-row">
                <span>Impuestos</span>
                <strong>{formatCurrency(totalTax, currency)}</strong>
              </div>
              <div className="quote-erp__total-row quote-erp__total-row--final">
                <span>Total</span>
                <strong>{formatCurrency(total, currency)}</strong>
              </div>

              <CardActions
                actions={[
                  {
                    icon: "eye",
                    ariaLabel: "Vista previa",
                    variant: "secondary",
                    onClick: () => setShowPreview((current) => !current),
                  },
                  {
                    icon: "check",
                    ariaLabel: saving ? "Guardando..." : "Guardar",
                    variant: "primary",
                    type: "submit",
                    disabled: saving,
                  },
                ]}
              />
            </div>
          </aside>
        </div>

        {formError && <FormMessage kind="error">{formError}</FormMessage>}
      </form>

      {showPreview && previewQuote && tenant && selectedCustomer && (
        <div className="quote-erp__preview-modal">
          <div className="quote-erp__preview-backdrop" onClick={() => setShowPreview(false)} />
          <div className="quote-erp__preview-content">
            <div className="quote-erp__preview-toolbar">
              <h3>Vista previa de cotización</h3>
              <Button
                type="button"
                variant="secondary"
                icon="close"
                iconOnly
                onClick={() => setShowPreview(false)}
              >
                Cerrar
              </Button>
            </div>
            <QuotePrintTemplate
              tenant={tenant}
              quote={previewQuote}
              customer={selectedCustomer}
            />
          </div>
        </div>
      )}
    </main>
  );
}
