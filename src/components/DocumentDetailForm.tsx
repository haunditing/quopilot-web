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
    <form id={formId} className="max-w-[1400px] mx-auto p-4 md:p-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 items-start xl:grid-cols-[1fr_360px] xl:gap-8">
        <div className="min-w-0">
          {/* Header del Documento */}
          <section className="flex flex-col gap-4 bg-surface-card border border-line rounded-2xl p-4 mb-4 md:flex-row md:justify-between md:items-center md:gap-6 md:p-8 md:mb-6">
            <div className="flex items-center gap-4">
              {tenant?.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="w-16 h-16 object-contain rounded-[10px] border border-line bg-white p-1"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--accent),#7e22ce)] text-white font-bold text-xl">
                  {tenant?.name ? tenant.name.slice(0, 2).toUpperCase() : "EM"}
                </div>
              )}
              <div className="flex flex-col gap-1 [&>strong]:text-ink-strong [&>strong]:text-[17px] [&>strong]:font-bold [&>span]:text-[13px] text-ink-muted">
                <strong>
                  {tenant?.legalName ?? tenant?.name ?? "Empresa"}
                </strong>
                {tenant?.email && <span>{tenant.email}</span>}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0 md:flex-none [&>label]:text-[11px] [&>label]:font-bold [&>label]:uppercase [&>label]:tracking-[0.06em] [&>label]:text-ink-muted [&>select]:px-3 [&>select]:py-2.5 [&>select]:border [&>select]:border-line [&>select]:rounded-lg [&>select]:text-base [&>select]:bg-white [&>select]:w-full md:[&>select]:text-sm md:[&>select]:w-auto md:[&>select]:min-w-[150px]">
                <label htmlFor="document-type">Documento</label>
                <select id="document-type" defaultValue="DEFAULT" disabled>
                  <option value="DEFAULT">{documentTypeLabel}</option>
                </select>
              </div>
              <div className="flex flex-col items-start gap-0.5 md:items-end [&>span]:text-[11px] [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.06em] [&>span]:text-ink-muted [&>strong]:text-xl md:[&>strong]:text-[28px] [&>strong]:text-accent [&>strong]:font-extrabold [&>strong]:leading-none [&>strong]:tracking-[-0.02em]">
                <span>No.</span>
                <strong>{docNumber}</strong>
                {doc && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-bold uppercase tracking-[0.06em]">
                    {statusLabels[doc.status] ?? doc.status}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Datos Generales */}
          <section className="bg-surface-card border border-line rounded-2xl p-4 mb-4 md:p-8 md:mb-6">
            <h3 className="m-0 mb-4 text-base font-bold text-ink-strong tracking-[-0.01em]">Datos generales</h3>
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-4">
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
          <section className="bg-surface-card border border-line rounded-2xl p-4 mb-4 md:p-8 md:mb-6">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
              <h3 className="m-0 mb-4 text-base font-bold text-ink-strong tracking-[-0.01em]">Productos y servicios</h3>
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
              <div className="text-center py-12 px-6 text-ink-muted [&>p]:mt-3 [&>p]:text-sm">
                <Icon name="empty" size={40} />
                <p>
                  {readOnly
                    ? "El documento no tiene líneas"
                    : "Agrega líneas para armar el documento"}
                </p>
              </div>
            ) : (
              <div className="overflow-visible border border-line rounded-xl hidden lg:block">
                <table className="w-full border-collapse [&_th]:p-3 [&_th]:px-2 [&_th]:text-left [&_th]:border-b [&_th]:border-line [&_th]:align-middle [&_td]:p-3 [&_td]:px-2 [&_td]:text-left [&_td]:border-b [&>td]:border-line [&_td]:align-middle [&>td]:border-line [&_th]:bg-[#f8f7fa] [&_th]:font-bold [&_th]:text-ink-strong [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-[0.05em] [&_th]:whitespace-nowrap [&_tbody_tr:hover]:bg-slate-50 [&_tbody_tr:last-child_td]:border-b-0 [&_thead_th:first-child]:rounded-tl-[11px] [&_thead_th:last-child]:rounded-tr-[11px]">
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
                          <td className="min-w-[200px] max-w-[340px]">
                            {line.product ? (
                              <div className="[&>strong]:block [&>strong]:text-ink-strong [&>strong]:font-semibold [&>span]:text-xs text-ink-muted">
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
                              className="w-full max-w-16 px-2.5 py-2 rounded-lg border border-line text-sm leading-snug bg-white transition-colors duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]"
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
                              className="w-full max-w-24 px-2.5 py-2 rounded-lg border border-line text-sm leading-snug bg-white transition-colors duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]"
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
                              className="w-full max-w-16 px-2.5 py-2 rounded-lg border border-line text-sm leading-snug bg-white transition-colors duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]"
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
                              className="w-full max-w-24 px-2.5 py-2 rounded-lg border border-line text-sm leading-snug bg-white transition-colors duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]"
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
                          <td className="font-bold text-ink-strong whitespace-nowrap">
                            {formatCurrency(values.subtotal, currency)}
                          </td>
                          {!readOnly && (
                            <td>
                              <button
                                type="button"
                                className="flex items-center justify-center w-[34px] h-[34px] border-none rounded-lg bg-transparent text-danger cursor-pointer transition-colors duration-150 hover:bg-red-100"
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
              <div className="flex flex-col items-start gap-2 mt-4 p-3.5 bg-[#f8f7fa] rounded-[10px] border border-dashed border-line [&>span]:text-[13px] text-ink-muted md:flex-row md:justify-between md:items-center md:gap-4">
                <span>{selectedLineIds.size} línea(s) seleccionada(s)</span>
                <div className="flex items-center gap-2 [&>input]:w-20 [&>input]:px-2.5 [&>input]:py-2 [&>input]:border [&>input]:border-line [&>input]:rounded-lg [&>input]:text-sm">
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
          <section className="bg-surface-card border border-line rounded-2xl p-4 mb-4 md:p-8 md:mb-6">
            <h3 className="m-0 mb-4 text-base font-bold text-ink-strong tracking-[-0.01em]">Notas y términos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <aside className="static xl:sticky xl:top-6">
          <div className="bg-surface-card border border-line rounded-2xl p-4 shadow-card md:p-8 [&_.entity-card__action]:w-auto [&_.entity-card__action]:flex-1">
            <h3 className="m-0 mb-4 text-base font-bold text-ink-strong tracking-[-0.01em]">Resumen</h3>
            <div className="flex justify-between items-center py-3.5 border-b border-line [&>span]:text-sm [&>span]:text-ink-muted [&>strong]:text-ink-strong [&>strong]:font-bold">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal, currency)}</strong>
            </div>
            <div className="flex justify-between items-center py-3.5 border-b border-line [&>span]:text-sm [&>span]:text-ink-muted [&>strong]:text-ink-strong [&>strong]:font-bold">
              <span>Descuentos</span>
              <strong>{formatCurrency(totalDiscount, currency)}</strong>
            </div>
            <div className="flex justify-between items-center py-3.5 border-b border-line [&>span]:text-sm [&>span]:text-ink-muted [&>strong]:text-ink-strong [&>strong]:font-bold">
              <span>Impuestos</span>
              <strong>{formatCurrency(totalTax, currency)}</strong>
            </div>
            <div className="flex justify-between items-center py-[18px] pt-[18px] mt-1 border-b-0 [&>span]:text-base [&>span]:font-extrabold [&>span]:uppercase [&>span]:tracking-[0.03em] [&>strong]:text-[26px] [&>strong]:text-accent [&>strong]:font-bold">
              <span>Total</span>
              <strong>{formatCurrency(total, currency)}</strong>
            </div>

            {actions.length > 0 && <CardActions actions={actions} />}
          </div>

          {isEdit && (
            <div className="mt-4 bg-surface-card border border-line rounded-2xl p-4 md:p-6 [&_.timeline-item]:pb-2 [&_.timeline-item]:mb-2">
              <h3 className="m-0 mb-4 text-base font-bold text-ink-strong tracking-[-0.01em]">Historial</h3>
              {events.length === 0 ? (
                <p className="m-0 text-[13px] text-ink-muted">
                  Sin eventos registrados
                </p>
              ) : (
                <div className="flex flex-col">
                  {events.map((e) => (
                    <article key={e._id} className="relative flex gap-3.5 min-h-[64px] before:absolute before:left-[5px] before:top-3 before:bottom-0 before:w-px before:bg-line last:before:hidden">
                      <div className="relative z-10 w-[11px] h-[11px] mt-1 shrink-0 border-2 border-accent rounded-full bg-surface-card" />
                      <div className="flex flex-col gap-[3px] [&>time]:text-[13px] text-ink-muted">
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
