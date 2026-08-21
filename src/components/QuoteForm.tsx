import DocumentDetailForm from "./DocumentDetailForm.js";
import type {
  ActionDefinition,
  DocumentDetailData,
  DocumentPayload,
  GenericDocument,
} from "./DocumentDetailForm.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { usePdfDownload } from "../hooks/usePdfDownload.js";
import { useToast } from "../hooks/useToast.js";
import { useCapabilities } from "../hooks/useCapabilities.js";
import {} from "../services/auth-storage.js";
import { getQuoteDetail } from "../services/quote-detail-service.js";
import {
  acceptQuote,
  createQuote,
  getNextQuoteNumber,
  sendQuote,
  updateQuote,
} from "../services/quote-service.js";
import type { Quote } from "../types/quote.js";

const TAX_OPTIONS = [
  { label: "Exento 0%", value: 0 },
  { label: "IVA 5%", value: 0.05 },
  { label: "IVA 19%", value: 0.19 },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  VIEWED: "Vista",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
};

interface QuoteFormProps {
  mode: "create" | "edit";
  quoteId?: string;
}

export default function QuoteForm({ mode, quoteId }: QuoteFormProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { downloadingId, downloadQuote } = usePdfDownload();
  const { hasCapability } = useCapabilities();

  // Adapta la respuesta del backend al tipo genérico esperado por el Form
  async function fetchDetailAdapter(
    id: string,
  ): Promise<DocumentDetailData | null> {
    const data = await getQuoteDetail(id);
    if (!data) return null;

    return {
      document: data.quote as unknown as GenericDocument,
      events: data.events,
    };
  }

  async function handleCreate(payload: DocumentPayload): Promise<void> {
    await createQuote(payload);
  }

  async function handleUpdate(
    id: string,
    payload: DocumentPayload,
  ): Promise<void> {
    await updateQuote(id, payload);
  }

  async function runQuoteAction(
    action: () => Promise<unknown>,
    reloadDetail: () => void,
    successMessage: string,
  ): Promise<void> {
    try {
      await action();
      reloadDetail();
      toast.success(successMessage);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible completar la acción",
      );
    }
  }

  function getExtraActions({
    document,
    saving,
    reloadDetail,
  }: {
    document: GenericDocument;
    saving: boolean;
    reloadDetail: () => void;
  }): ActionDefinition[] {
    const quote = document as unknown as Quote;
    const actions: ActionDefinition[] = [];

    // Acción: Descargar PDF
    if (quote._id) {
      actions.push({
        icon: "download",
        ariaLabel: "Descargar PDF",
        variant: "secondary",
        busy: downloadingId === quote._id,
        disabled: downloadingId !== null && downloadingId !== quote._id,
        onClick: () => downloadQuote(quote),
      });
    }

    // Acción: Enviar Cotización
    if (hasCapability("quotes.send") && quote.status === "DRAFT") {
      actions.push({
        icon: "send",
        ariaLabel: "Enviar",
        variant: "secondary",
        disabled: saving,
        onClick: async () => {
          const confirmed = await confirm({
            title: "Enviar cotización",
            message: `¿Enviar la cotización ${quote.number} al cliente?`,
            confirmLabel: "Enviar",
          });

          if (confirmed && quoteId) {
            await runQuoteAction(
              () => sendQuote(quoteId),
              reloadDetail,
              "Cotización enviada",
            );
          }
        },
      });
    }

    // Acción: Aceptar Cotización
    if (
      hasCapability("quotes.accept") &&
      (quote.status === "SENT" || quote.status === "VIEWED")
    ) {
      actions.push({
        icon: "check",
        ariaLabel: "Aceptar cotización",
        variant: "primary",
        disabled: saving,
        onClick: async () => {
          const confirmed = await confirm({
            title: "Aceptar cotización",
            message: `¿Confirmar la aceptación de la cotización ${quote.number}?`,
            confirmLabel: "Aceptar",
          });

          if (confirmed && quoteId) {
            await runQuoteAction(
              () => acceptQuote(quoteId),
              reloadDetail,
              "Cotización aceptada",
            );
          }
        },
      });
    }

    return actions;
  }

  return (
    <DocumentDetailForm
      mode={mode}
      documentId={quoteId}
      documentTypeLabel="Cotización"
      documentTypeKey="quotes"
      statusLabels={STATUS_LABELS}
      taxOptions={TAX_OPTIONS}
      fetchDetail={fetchDetailAdapter}
      fetchNextNumber={getNextQuoteNumber}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onSuccessRedirect="/quotes"
      getExtraActions={getExtraActions}
    />
  );
}
