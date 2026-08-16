import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.js";
import DetailCard from "../components/DetailCard.js";
import type { EntityAction } from "../components/CardActions.js";
import FormMessage from "../components/FormMessage.js";
import PageState from "../components/PageState.js";
import Section from "../components/Section.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDate } from "../lib/format.js";
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
    return <PageState kind="loading" title="Cargando venta..." />;
  }

  if (error) {
    return <PageState kind="error" title="Error en venta" message={error} />;
  }

  if (!data) {
    return <PageState title="Venta no encontrada" />;
  }

  const { sale, quote, customer } = data;

  const actions: EntityAction[] = [
    {
      icon: "trash",
      ariaLabel: "Eliminar",
      onClick: async () => {
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
      },
      variant: "danger",
    },
  ];

  return (
    <main>
      <BackButton onClick={() => navigate(-1)}>Volver a ventas</BackButton>

      <DetailCard
        eyebrow="Venta"
        title={sale.number}
        status={sale.status}
        summary={[
          {
            label: "Total",
            value: formatCurrency(sale.total, sale.currency),
            highlight: true,
          },
          { label: "Fecha", value: formatDate(sale.soldAt) },
        ]}
        actions={actions}
      >
        {deleting && <FormMessage kind="info">Procesando...</FormMessage>}
      </DetailCard>

      <Section title="Cliente" description="Datos del cliente de esta venta.">
        {customer ? (
          <div className="detail-card">
            <div className="detail-card__body">
              <div>
                <span className="detail-card__label">Nombre</span>

                <strong className="detail-card__value">{customer.name}</strong>
              </div>

              {customer.email && (
                <div>
                  <span className="detail-card__label">Email</span>

                  <strong className="detail-card__value">
                    {customer.email}
                  </strong>
                </div>
              )}

              {customer.phone && (
                <div>
                  <span className="detail-card__label">Teléfono</span>

                  <strong className="detail-card__value">
                    {customer.phone}
                  </strong>
                </div>
              )}

              {customer.country && (
                <div>
                  <span className="detail-card__label">País</span>

                  <strong className="detail-card__value">
                    {customer.country}
                  </strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <FormMessage kind="info">
            No se encontraron datos del cliente.
          </FormMessage>
        )}
      </Section>

      <Section
        title="Productos"
        description="Productos incluidos en la venta."
      >
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
      </Section>
    </main>
  );
}
