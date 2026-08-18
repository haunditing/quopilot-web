import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import BackButton from "../components/BackButton.js";
import Button from "../components/Button.js";
import FormMessage from "../components/FormMessage.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import PageHeader from "../components/PageHeader.js";

import { useAsyncData } from "../hooks/useAsyncData.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDateTime } from "../lib/format.js";
import { deleteSale, getSaleDetail } from "../services/sale-service.js";

interface SaleDetailProps {
  saleId: string;
}

export default function SaleDetail({ saleId }: SaleDetailProps) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => getSaleDetail(saleId), [saleId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const toast = useToast();
  const { confirm } = useConfirm();
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return <LoadingOverlay title="Cargando venta..." />;
  }

  if (error) {
    return <PageState kind="error" title="Error en venta" message={error} />;
  }

  if (!data) {
    return <PageState title="Venta no encontrada" />;
  }

  const { sale, quote, customer } = data;

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Eliminar venta",
      message: `¿Eliminar la venta ${sale.number}? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await deleteSale(sale._id);
      toast.success("Venta eliminada");
      navigate("/sales");
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible eliminar la venta",
      );
      setDeleting(false);
    }
  };

  return (
    <main className="master-detail">
      <BackButton onClick={() => navigate(-1)}>Volver a ventas</BackButton>

      <PageHeader
        title={`Venta ${sale.number}`}
        description="Detalles completos de la venta y los productos despachados."
      />

      <div className="master-detail__body">
        <div className="master-detail__main">
          {/* Información de la venta */}
          <section className="master-detail-card">
            <h2 className="master-detail-card__title">
              Información de la venta
            </h2>
            <div className="master-detail-card__grid">
              <div>
                <span className="master-detail-card__label">Número</span>
                <strong className="master-detail-card__value">
                  {sale.number}
                </strong>
              </div>
              <div>
                <span className="master-detail-card__label">Fecha</span>
                <strong className="master-detail-card__value">
                  {formatDateTime(sale.soldAt)}
                </strong>
              </div>
            </div>
            <div className="master-detail-card__grid">
              <div>
                <span className="master-detail-card__label">Estado</span>
                <strong className="master-detail-card__value">
                  <span
                    className={`badge ${sale.status === "CONFIRMED" ? "badge-success" : "badge-danger"}`}
                  >
                    {sale.status === "CONFIRMED" ? "Confirmada" : "Cancelada"}
                  </span>
                </strong>
              </div>
            </div>
          </section>

          {/* Cliente */}
          <section className="master-detail-card">
            <h2 className="master-detail-card__title">Cliente</h2>
            {customer ? (
              <>
                <div className="master-detail-card__grid">
                  <div>
                    <span className="master-detail-card__label">Nombre</span>
                    <strong className="master-detail-card__value">
                      {customer.name}
                    </strong>
                  </div>
                  <div>
                    <span className="master-detail-card__label">Documento</span>
                    <strong className="master-detail-card__value">
                      {customer.identificationNumber || "—"}
                    </strong>
                  </div>
                </div>
                <div className="master-detail-card__grid">
                  <div>
                    <span className="master-detail-card__label">Email</span>
                    <strong className="master-detail-card__value">
                      {customer.email || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="master-detail-card__label">Teléfono</span>
                    <strong className="master-detail-card__value">
                      {customer.phone || "—"}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <FormMessage kind="info">
                No se encontraron datos del cliente.
              </FormMessage>
            )}
          </section>

          {/* Productos */}
          <section className="master-detail-card">
            <h2 className="master-detail-card__title">Productos</h2>
            {quote ? (
              <div className="quote-items">
                {quote.items.map((item) => (
                  <article key={item.productId} className="quote-item">
                    <div className="quote-item__main">
                      <strong>{item.name}</strong>
                      <span>
                        {item.quantity} ×{" "}
                        {formatCurrency(item.unitPrice, sale.currency)}
                      </span>
                    </div>
                    <div className="quote-item__subtotal">
                      <span>Subtotal</span>
                      <strong>
                        {formatCurrency(item.subtotal, sale.currency)}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <FormMessage kind="info">
                No se encontraron los productos de esta venta.
              </FormMessage>
            )}
          </section>
        </div>

        {/* Panel lateral */}
        <aside className="master-detail__sidebar">
          <div className="master-detail-sidebar">
            <div className="master-detail-sidebar__title">Resumen</div>
            <div className="master-detail-sidebar__meta">
              <div>
                <span>Total de la venta</span>
                <strong style={{ fontSize: "24px", color: "var(--accent)" }}>
                  {formatCurrency(sale.total, sale.currency)}
                </strong>
              </div>
              {quote && (
                <div>
                  <span>Artículos</span>
                  <strong>
                    {quote.items.reduce((acc, item) => acc + item.quantity, 0)}{" "}
                    items
                  </strong>
                </div>
              )}
            </div>

            {deleting && <FormMessage kind="info">Procesando...</FormMessage>}

            <div className="master-detail-sidebar__actions">
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Eliminando..." : "Eliminar venta"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
