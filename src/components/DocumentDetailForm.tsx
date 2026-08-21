import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Field from "./Field.js";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button.js";
import CardActions from "./CardActions.js";
import type { EntityAction } from "./CardActions.js";
import FormMessage from "./FormMessage.js";
import Icon from "./Icon.js";
import LoadingOverlay from "./LoadingOverlay.js";
import PageState from "./PageState.js";
import ProductSearch from "./ProductSearch.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDateTime } from "../lib/format.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
import { getCustomers } from "../services/customer-service.js";
import { getCurrentTenant } from "../services/tenant-service.js";
import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";

// --- Types & Interfaces ---

export interface DocumentItem {
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalLine: number;
}

export interface DocumentEvent {
  _id: string;
  type: string;
  createdAt: string;
}

export interface GenericDocument {
  _id: string;
  number: string;
  customerId: string;
  createdAt: string;
  validUntil?: string;
  status: string;
  currency?: string;
  notes?: string;
  terms?: string;
  items: DocumentItem[];
}

export interface DocumentDetailData {
  document: GenericDocument;
  events?: DocumentEvent[];
}

export interface DocumentPayload {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
  }>;
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export interface ActionDefinition {
  icon: string;
  ariaLabel: string;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  busy?: boolean;
  onClick?: () => void | Promise<void>;
}

export interface DocumentTenantInfo {
  name: string;
  legalName?: string;
  email?: string;
  logoUrl?: string;
  currency?: string;
}

export interface DocumentDetailProps {
  mode: "create" | "edit";
  documentId?: string;
  documentTypeLabel: string;
  documentTypeKey: "quotes" | "sales";
  statusLabels: Record<string, string>;
  taxOptions?: Array<{ label: string; value: number }>;

  fetchDetail?: (id: string) => Promise<DocumentDetailData | null>;
  fetchNextNumber?: () => Promise<string>;
  onCreate?: (payload: DocumentPayload) => Promise<void>;
  onUpdate?: (id: string, payload: DocumentPayload) => Promise<void>;
  onSuccessRedirect?: string;

  getExtraActions?: (params: {
    document: GenericDocument;
    saving: boolean;
    reloadDetail: () => void;
  }) => ActionDefinition[];
}

interface LineDraft {
  id: string;
  productId: string;
  product: Product | null;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: number;
}

const DEFAULT_TAX_OPTIONS = [
  { label: "Exento 0%", value: 0 },
  { label: "IVA 5%", value: 0.05 },
  { label: "IVA 19%", value: 0.19 },
];

// --- Helper Functions ---

function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseAmount(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function calculateLineValues(line: LineDraft): DocumentItem {
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

function lineFromItem(item: DocumentItem): LineDraft {
  const product: Product = {
    _id: item.productId,
    tenantId: "",
    name: item.name,
    description: item.description,
    unitPrice: item.unitPrice,
    currency: "",
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
    itemType: "PRODUCT",
    basePrice: 0,
    taxRate: 0,
  };

  return {
    id: generateLineId(),
    productId: item.productId,
    product,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discountPercent: String(item.discountPercent ?? 0),
    taxRate: item.taxRate ?? 0,
  };
}

// --- Inner Form Component (Stateful UI Only) ---

interface FormContentProps extends DocumentDetailProps {
  doc?: GenericDocument;
  events?: DocumentEvent[];
  tenant: DocumentTenantInfo | null;
  nextNumber: string;
  reloadDetail: () => void;
}

function DocumentDetailFormContent({
  mode,
  documentId,
  documentTypeLabel,
  documentTypeKey,
  statusLabels,
  taxOptions = DEFAULT_TAX_OPTIONS,
  doc,
  events = [],
  tenant,
  nextNumber,
  onCreate,
  onUpdate,
  onSuccessRedirect,
  getExtraActions,
  reloadDetail,
}: FormContentProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const formId = useId();

  const isEdit = mode === "edit" && Boolean(documentId);
  const readOnly = Boolean(isEdit && doc && doc.status !== "DRAFT");
  const { hasCapability } = useCapabilities();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [customerId, setCustomerId] = useState(doc?.customerId ?? "");
  const [createdAt, setCreatedAt] = useState(
    doc?.createdAt
      ? doc.createdAt.split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [validUntil, setValidUntil] = useState(
    doc?.validUntil ? doc.validUntil.split("T")[0] : "",
  );
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [terms, setTerms] = useState(doc?.terms ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    doc?.items ? doc.items.map(lineFromItem) : [],
  );

  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(
    new Set(),
  );
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomers({ limit: 100 })
      .then((res) => {
        if (!cancelled) setCustomers(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("No fue posible cargar los clientes");
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currency = useMemo(
    () => doc?.currency ?? tenant?.currency ?? "COP",
    [doc, tenant],
  );
  const docItems = useMemo(() => lines.map(calculateLineValues), [lines]);

  const { subtotal, totalDiscount, totalTax, total } = useMemo(() => {
    return docItems.reduce(
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
  }, [docItems]);

  const docNumber = isEdit ? (doc?.number ?? "") : nextNumber;

  if (loadingCustomers) {
    return <LoadingOverlay title="Cargando catálogo de clientes..." />;
  }

  if (loadError) {
    return <PageState kind="error" title="Error" message={loadError} />;
  }

  function addLine() {
    setLines((curr) => [
      ...curr,
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
    setLines((curr) => curr.filter((l) => l.id !== id));
    setSelectedLineIds((curr) => {
      const next = new Set(curr);
      next.delete(id);
      return next;
    });
  }

  function updateLine(id: string, updates: Partial<LineDraft>) {
    setLines((curr) =>
      curr.map((l) => (l.id === id ? { ...l, ...updates } : l)),
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
    setSelectedLineIds((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedLineIds.size === lines.length && lines.length > 0) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(lines.map((l) => l.id)));
    }
  }

  function applyGlobalDiscount() {
    if (selectedLineIds.size === 0) {
      toast.info("Selecciona al menos una línea para aplicar el descuento");
      return;
    }
    setLines((curr) =>
      curr.map((l) =>
        selectedLineIds.has(l.id)
          ? { ...l, discountPercent: String(globalDiscount) }
          : l,
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
      (l) =>
        !l.productId ||
        !Number.isInteger(parseAmount(l.quantity)) ||
        parseAmount(l.quantity) < 1,
    );

    if (hasInvalidLine) {
      setFormError("Completa el producto y la cantidad de cada línea");
      return;
    }

    setSaving(true);

    const payload: DocumentPayload = {
      customerId,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: parseAmount(l.quantity),
        unitPrice: parseAmount(l.unitPrice),
        discountPercent: parseAmount(l.discountPercent),
        taxRate: l.taxRate,
      })),
      validUntil: validUntil
        ? new Date(`${validUntil}T12:00:00`).toISOString()
        : undefined,
      notes: notes || undefined,
      terms: terms || undefined,
    };

    try {
      if (isEdit && documentId && onUpdate) {
        await onUpdate(documentId, payload);
        toast.success(`${documentTypeLabel} actualizada`);
        reloadDetail();
      } else if (onCreate) {
        await onCreate(payload);
        toast.success(`${documentTypeLabel} creada con éxito`);
        if (onSuccessRedirect) navigate(onSuccessRedirect);
      }
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : `No fue posible guardar el registro`,
      );
    } finally {
      setSaving(false);
    }
  }

  const actions: EntityAction[] = [];

  if (isEdit && doc && getExtraActions) {
    const extra = getExtraActions({ document: doc, saving, reloadDetail });
    actions.push(...(extra as EntityAction[]));
  }

  if (!readOnly && (isEdit ? hasCapability(`${documentTypeKey}.update`) : true)) {
    actions.push({
      icon: "check",
      ariaLabel: saving
        ? "Guardando..."
        : isEdit
          ? "Guardar cambios"
          : "Guardar",
      variant: isEdit && doc?.status !== "DRAFT" ? "secondary" : "primary",
      type: "submit",
      disabled: saving,
    });
  }

  return (
    <form id={formId} className="quote-erp" onSubmit={handleSubmit}>
      <div className="quote-erp__layout">
        <div className="quote-erp__main">
          {/* Header del Documento */}
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
                  {tenant?.name ? tenant.name.slice(0, 2).toUpperCase() : "EM"}
                </div>
              )}
              <div className="quote-erp__issuer-info">
                <strong>
                  {tenant?.legalName ?? tenant?.name ?? "Empresa"}
                </strong>
                {tenant?.email && <span>{tenant.email}</span>}
              </div>
            </div>

            <div className="quote-erp__doc-meta">
              <div className="quote-erp__doc-type">
                <label htmlFor="document-type">Documento</label>
                <select id="document-type" defaultValue="DEFAULT" disabled>
                  <option value="DEFAULT">{documentTypeLabel}</option>
                </select>
              </div>
              <div className="quote-erp__doc-number">
                <span>No.</span>
                <strong>{docNumber}</strong>
                {doc && (
                  <span className="quote-erp__doc-status">
                    {statusLabels[doc.status] ?? doc.status}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Datos Generales */}
          <section className="quote-erp__card">
            <h3 className="quote-erp__card-title">Datos generales</h3>
            <div className="quote-erp__grid-3">
              <Field
                id="doc-customer"
                label="Cliente"
                as="select"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={readOnly}
              >
                <option value="" disabled>
                  Selecciona un cliente
                </option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Field>

              <Field
                id="doc-created"
                label="Fecha de creación"
                type="date"
                required
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                disabled={readOnly || isEdit}
              />

              <Field
                id="doc-valid"
                label="Válida hasta"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </section>

          {/* Tabla de Productos */}
          <section className="quote-erp__card">
            <div className="quote-erp__table-header">
              <h3 className="quote-erp__card-title">Productos y servicios</h3>
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  icon="plus"
                  iconOnly
                  onClick={addLine}
                  aria-label="Agregar línea"
                >
                  Agregar línea
                </Button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="quote-erp__table-empty">
                <Icon name="empty" size={40} />
                <p>
                  {readOnly
                    ? "El documento no tiene líneas"
                    : "Agrega líneas para armar el documento"}
                </p>
              </div>
            ) : (
              <div className="quote-erp__table-wrapper">
                <table className="quote-erp__table">
                  <thead>
                    <tr>
                      {!readOnly && (
                        <th>
                          <input
                            type="checkbox"
                            checked={selectedLineIds.size === lines.length}
                            onChange={toggleSelectAll}
                          />
                        </th>
                      )}
                      <th>Producto / Servicio</th>
                      <th>Cantidad</th>
                      <th>Precio unitario</th>
                      <th>% Desc.</th>
                      <th>Impuesto</th>
                      <th>Subtotal</th>
                      {!readOnly && <th aria-label="Acciones" />}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const values = calculateLineValues(line);
                      return (
                        <tr key={line.id}>
                          {!readOnly && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedLineIds.has(line.id)}
                                onChange={() => toggleSelectLine(line.id)}
                              />
                            </td>
                          )}
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
                                onSelect={(p) =>
                                  handleSelectProduct(line.id, p)
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
                              disabled={readOnly}
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
                              disabled={readOnly}
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
                              disabled={readOnly}
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
                              disabled={readOnly}
                            >
                              {taxOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="quote-erp__amount">
                            {formatCurrency(values.subtotal, currency)}
                          </td>
                          {!readOnly && (
                            <td>
                              <button
                                type="button"
                                className="quote-erp__remove"
                                onClick={() => removeLine(line.id)}
                              >
                                <Icon name="trash" size={18} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!readOnly && lines.length > 0 && (
              <div className="quote-erp__bulk">
                <span>{selectedLineIds.size} línea(s) seleccionada(s)</span>
                <div className="quote-erp__bulk-action">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                  />
                  <span>%</span>
                  <Button
                    type="button"
                    variant="secondary"
                    icon="check"
                    iconOnly
                    onClick={applyGlobalDiscount}
                    disabled={selectedLineIds.size === 0}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Notas y Términos */}
          <section className="quote-erp__card">
            <h3 className="quote-erp__card-title">Notas y términos</h3>
            <div className="quote-erp__grid-2">
              <Field
                id="doc-notes"
                label="Notas"
                as="textarea"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={readOnly}
              />
              <Field
                id="doc-terms"
                label="Términos y condiciones"
                as="textarea"
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </section>
        </div>

        {/* Sidebar */}
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

            {actions.length > 0 && <CardActions actions={actions} />}
          </div>

          {isEdit && (
            <div className="quote-erp__events">
              <h3 className="quote-erp__card-title">Historial</h3>
              {events.length === 0 ? (
                <p className="quote-erp__events-empty">
                  Sin eventos registrados
                </p>
              ) : (
                <div className="quote-timeline">
                  {events.map((e) => (
                    <article key={e._id} className="timeline-item">
                      <div className="timeline-item__marker" />
                      <div className="timeline-item__content">
                        <strong>{statusLabels[e.type] ?? e.type}</strong>
                        <time>{formatDateTime(e.createdAt)}</time>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {formError && <FormMessage kind="error">{formError}</FormMessage>}
    </form>
  );
}

// --- Main Container Component (Data Fetcher & Wrapper) ---

export default function DocumentDetailForm(props: DocumentDetailProps) {
  const {
    mode,
    documentId,
    documentTypeLabel,
    documentTypeKey,
    fetchDetail,
    fetchNextNumber,
  } = props;
  const isEdit = mode === "edit" && Boolean(documentId);
  const { hasCapability } = useCapabilities();

  const [nextNumber, setNextNumber] = useState("DOC-000001");

  const { data: tenant, loading: loadingTenant } =
    useAsyncData<DocumentTenantInfo | null>(getCurrentTenant);

  const detailFetcher =
    useCallback(async (): Promise<DocumentDetailData | null> => {
      if (!isEdit || !documentId || !fetchDetail) return null;
      return fetchDetail(documentId);
    }, [isEdit, documentId, fetchDetail]);

  const {
    data: detail,
    loading: loadingDetail,
    error: detailError,
    reload: reloadDetail,
  } = useAsyncData(detailFetcher);

  useEffect(() => {
    if (isEdit || !fetchNextNumber) return;
    let cancelled = false;
    fetchNextNumber()
      .then((num) => {
        if (!cancelled) setNextNumber(num);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEdit, fetchNextNumber]);

  if (!isEdit && !hasCapability(`${documentTypeKey}.create`)) {
    return (
      <PageState
        kind="error"
        title="Acceso denegado"
        message={`No tienes permisos para crear ${documentTypeLabel.toLowerCase()}s`}
      />
    );
  }

  if (loadingTenant || (isEdit && loadingDetail)) {
    return <LoadingOverlay title="Cargando información del documento..." />;
  }

  if (detailError) {
    return <PageState kind="error" title="Error" message={detailError} />;
  }

  const doc = isEdit ? detail?.document : undefined;

  if (isEdit && !doc) {
    return (
      <PageState kind="error" title={`${documentTypeLabel} no encontrada`} />
    );
  }

  return (
    <DocumentDetailFormContent
      key={doc?._id ?? "new"}
      {...props}
      doc={doc}
      events={detail?.events}
      tenant={tenant}
      nextNumber={nextNumber}
      reloadDetail={reloadDetail}
    />
  );
}
