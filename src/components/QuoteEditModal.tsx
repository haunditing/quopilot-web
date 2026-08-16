import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Button from "./Button.js";
import FormMessage from "./FormMessage.js";
import Icon from "./Icon.js";
import Modal from "./Modal.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency } from "../lib/format.js";
import { getCustomers } from "../services/customer-service.js";
import { getProducts } from "../services/product-service.js";
import { updateQuote } from "../services/quote-service.js";
import type { Customer } from "../types/customer.js";
import type { Product } from "../types/product.js";
import type { Quote } from "../types/quote.js";

interface QuoteEditModalProps {
  open: boolean;
  quote: Quote | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ItemRow {
  productId: string;
  quantity: number;
}

function toDateInputValue(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default function QuoteEditModal({
  open,
  quote,
  onClose,
  onSaved,
}: QuoteEditModalProps) {
  if (!open || !quote) {
    return null;
  }

  return (
    <Modal
      open
      title={`Editar ${quote.number}`}
      onClose={onClose}
    >
      <QuoteEditForm quote={quote} onSaved={onSaved} />
    </Modal>
  );
}

function QuoteEditForm({
  quote,
  onSaved,
}: {
  quote: Quote;
  onSaved: () => void;
}) {
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [customerId, setCustomerId] = useState(quote.customerId);
  const [validUntil, setValidUntil] = useState(
    toDateInputValue(quote.validUntil),
  );
  const [items, setItems] = useState<ItemRow[]>(
    quote.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [itemsError, setItemsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getCustomers({ limit: 100 }),
      getProducts({ limit: 100 }),
    ])
      .then(([customerResponse, productResponse]) => {
        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.data);
        setProducts(productResponse.data);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setLoadError(
          requestError instanceof Error
            ? requestError.message
            : "No fue posible cargar los datos",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function addItem() {
    setItems((current) => [...current, { productId: "", quantity: 1 }]);
    setItemsError("");
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
    setItemsError("");
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setItemsError("");
  }

  const productById = new Map(
    products.map((product) => [product._id, product]),
  );

  const total = items.reduce((sum, row) => {
    const product = productById.get(row.productId);
    const quantity = Number.isFinite(row.quantity) ? row.quantity : 0;

    return sum + (product ? product.unitPrice * quantity : 0);
  }, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!customerId) {
      setCustomerError("Selecciona un cliente");
      hasErrors = true;
    }

    const hasInvalidItem = items.some(
      (row) =>
        !row.productId ||
        !Number.isFinite(row.quantity) ||
        row.quantity < 1,
    );

    if (items.length === 0) {
      setItemsError("Agrega al menos un producto");
      hasErrors = true;
    } else if (hasInvalidItem) {
      setItemsError("Completa el producto y la cantidad de cada línea");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await updateQuote(quote._id, {
        customerId,
        items: items.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
        })),
        ...(validUntil
          ? { validUntil: new Date(`${validUntil}T12:00:00`).toISOString() }
          : {}),
      });

      toast.success("Cotización actualizada");

      onSaved();
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible guardar los cambios",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="modal__form" onSubmit={handleSubmit}>
      {loading ? (
        <FormMessage kind="info">Cargando datos...</FormMessage>
      ) : loadError ? (
        <FormMessage kind="error">{loadError}</FormMessage>
      ) : (
        <>
          <div className="form-card__grid">
            <div
              className={
                customerError
                  ? "form-field form-field--invalid"
                  : "form-field"
              }
            >
              <label htmlFor="quote-customer">Cliente</label>

              <select
                id="quote-customer"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setCustomerError("");
                }}
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

              {customerError && (
                <span className="form-field__error">{customerError}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="quote-valid-until">Válida hasta</label>

              <input
                id="quote-valid-until"
                type="date"
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
              />
            </div>
          </div>

          <div className="quote-items-editor">
            <div className="section-heading">
              <h3>Productos</h3>
            </div>

            {items.length === 0 && !itemsError && (
              <FormMessage kind="info">
                Agrega al menos un producto
              </FormMessage>
            )}

            {itemsError && (
              <FormMessage kind="error">{itemsError}</FormMessage>
            )}

            {items.map((row, index) => {
              const product = productById.get(row.productId);

              return (
                <div key={index} className="quote-item-row">
                  <div className="form-field">
                    <label>Producto</label>

                    <select
                      value={row.productId}
                      onChange={(event) =>
                        updateItem(index, { productId: event.target.value })
                      }
                      required
                    >
                      <option value="" disabled>
                        Selecciona
                      </option>

                      {products.map((productOption) => (
                        <option
                          key={productOption._id}
                          value={productOption._id}
                        >
                          {productOption.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Cantidad</label>

                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={row.quantity}
                      onChange={(event) =>
                        updateItem(index, {
                          quantity: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </div>

                  <div className="quote-item-row__subtotal">
                    {product
                      ? formatCurrency(
                          product.unitPrice *
                            (Number.isFinite(row.quantity) ? row.quantity : 0),
                          product.currency,
                        )
                      : "—"}
                  </div>

                  <button
                    type="button"
                    className="quote-item-row__remove"
                    onClick={() => removeItem(index)}
                    aria-label="Quitar producto"
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="secondary"
              icon="plus"
              iconOnly
              onClick={addItem}
            >
              Agregar producto
            </Button>
          </div>

          <div className="quote-total-preview">
            <span>Total</span>

            <strong>
              {formatCurrency(total, products[0]?.currency ?? "COP")}
            </strong>
          </div>

          {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

          <Button type="submit" icon="check" iconOnly disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </>
      )}
    </form>
  );
}
