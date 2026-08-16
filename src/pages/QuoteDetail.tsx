import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.js";
import DetailCard from "../components/DetailCard.js";
import type { EntityAction } from "../components/CardActions.js";
import FormMessage from "../components/FormMessage.js";
import PageState from "../components/PageState.js";
import QuoteEditModal from "../components/QuoteEditModal.js";
import Section from "../components/Section.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { formatCurrency, formatDateTime } from "../lib/format.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import { getQuoteDetail } from "../services/quote-detail-service.js";
import { acceptQuote, sendQuote } from "../services/quote-service.js";

interface QuoteDetailProps {
  quoteId: string;
}

export default function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => getQuoteDetail(quoteId), [quoteId]);
  const { data, loading, error, reload } = useAsyncData(fetcher);

  const toast = useToast();
  const { confirm } = useConfirm();

  const [actionLoading, setActionLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function runQuoteAction(
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> {
    setActionLoading(true);

    try {
      await action();
      reload();
      toast.success(successMessage);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible completar la acción",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <PageState kind="loading" title="Cargando cotización..." />;
  }

  if (error) {
    return <PageState kind="error" title="Error en cotización" message={error} />;
  }

  if (!data) {
    return <PageState title="Cotización no encontrada" />;
  }

  const { quote, events } = data;
  const role = getUserRole();
  const isDraft = quote.status === "DRAFT";

  const actions: EntityAction[] = [];

  if (can(role, "quotes", "update") && isDraft) {
    actions.push({
      icon: "edit",
      ariaLabel: "Editar",
      onClick: () => setEditOpen(true),
      variant: "secondary",
    });
  }

  if (can(role, "quotes", "send") && isDraft) {
    actions.push({
      icon: "send",
      ariaLabel: "Enviar",
      onClick: async () => {
        const confirmed = await confirm({
          title: "Enviar cotización",
          message: `¿Enviar la cotización ${quote.number} al cliente?`,
          confirmLabel: "Enviar",
        });

        if (confirmed) {
          await runQuoteAction(
            () => sendQuote(quoteId),
            "Cotización enviada",
          );
        }
      },
    });
  }

  if (
    can(role, "quotes", "accept") &&
    (quote.status === "SENT" || quote.status === "VIEWED")
  ) {
    actions.push({
      icon: "check",
      ariaLabel: "Aceptar",
      onClick: async () => {
        const confirmed = await confirm({
          title: "Aceptar cotización",
          message: `¿Confirmar la aceptación de la cotización ${quote.number}?`,
          confirmLabel: "Aceptar",
        });

        if (confirmed) {
          await runQuoteAction(
            () => acceptQuote(quoteId),
            "Cotización aceptada",
          );
        }
      },
    });
  }

  return (
    <main>
      <BackButton onClick={() => navigate(-1)}>Volver a cotizaciones</BackButton>

      <DetailCard
        eyebrow="Cotización"
        title={quote.number}
        status={quote.status}
        summary={[
          {
            label: "Total",
            value: formatCurrency(quote.total, quote.currency),
            highlight: true,
          },
          { label: "Items", value: String(quote.items.length) },
        ]}
        actions={actions}
      >
        {actionLoading && <FormMessage kind="info">Procesando...</FormMessage>}
      </DetailCard>

      <Section
        title="Items"
        description="Productos incluidos en la cotización."
      >
        <div className="quote-items">
          {quote.items.map((item) => (
            <article key={item.productId} className="quote-item">
              <div className="quote-item__main">
                <strong>{item.name}</strong>

                <span>
                  {item.quantity} ×{" "}
                  {formatCurrency(item.unitPrice, quote.currency)}
                </span>
              </div>

              <div className="quote-item__subtotal">
                <span>Subtotal</span>

                <strong>
                  {formatCurrency(item.subtotal, quote.currency)}
                </strong>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Historial"
        description="Actividad registrada para esta cotización."
      >
        <div className="quote-timeline">
          {events.map((event) => (
            <article key={event._id} className="timeline-item">
              <div className="timeline-item__marker" />

              <div className="timeline-item__content">
                <strong>{event.type}</strong>

                <time>{formatDateTime(event.createdAt)}</time>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <QuoteEditModal
        open={editOpen}
        quote={quote}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          reload();
        }}
      />
    </main>
  );
}

