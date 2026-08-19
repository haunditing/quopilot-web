import { useNavigate } from "react-router-dom";
import DocumentDetailForm from "./DocumentDetailForm.js";
import type {
  ActionDefinition,
  DocumentDetailData,
  DocumentPayload,
  GenericDocument,
} from "./DocumentDetailForm.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";

import { getSaleDetail } from "../services/sale-detail-service.js";
import {
  acceptSale,
  createSale,
  getNextSaleNumber,
  sendSale,
  updateSale,
} from "../services/sale-service.js";

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

interface SaleFormProps {
  mode: "create" | "edit";
  saleId?: string;
}

export default function SaleForm({ mode, saleId }: SaleFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const role = getUserRole();

  // Adapta la respuesta del backend al tipo genérico esperado por el Form
  async function fetchDetailAdapter(
    id: string,
  ): Promise<DocumentDetailData | null> {
    const data = await getSaleDetail(id);
    if (!data) return null;

    return {
      document: data.sale as unknown as GenericDocument,
      events: data.events,
    };
  }

  async function handleCreate(payload: DocumentPayload): Promise<void> {
    await createSale(payload);
  }

  async function handleUpdate(
    id: string,
    payload: DocumentPayload,
  ): Promise<void> {
    await updateSale(id, payload);
  }

  async function runSaleAction(
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
    const sale = document as unknown as GenericDocument;
    const saleId = sale._id;
    const actions: ActionDefinition[] = [];

    // Acción: Descargar PDF
    actions.push({
      icon: "download",
      ariaLabel: "Descargar PDF",
      variant: "secondary",
      onClick: () => navigate(`/sales/${saleId}/print`),
    });

    // Acción: Enviar Cotización
    if (can(role, "sales", "send") && sale.status === "DRAFT") {
      actions.push({
        icon: "send",
        ariaLabel: "Enviar",
        variant: "secondary",
        disabled: saving,
        onClick: async () => {
          const confirmed = await confirm({
            title: "Enviar venta",
            message: `¿Enviar la venta ${sale.number} al cliente?`,
            confirmLabel: "Enviar",
          });

          if (confirmed && saleId) {
            await runSaleAction(
              () => sendSale(saleId),
              reloadDetail,
              "Venta enviada",
            );
          }
        },
      });
    }

    // Acción: Aceptar Cotización
    if (
      can(role, "sales", "accept") &&
      (sale.status === "SENT" || sale.status === "VIEWED")
    ) {
      actions.push({
        icon: "check",
        ariaLabel: "Aceptar venta",
        variant: "primary",
        disabled: saving,
        onClick: async () => {
          const confirmed = await confirm({
            title: "Aceptar venta",
            message: `¿Confirmar la aceptación de la venta ${sale.number}?`,
            confirmLabel: "Aceptar",
          });

          if (confirmed && saleId) {
            await runSaleAction(
              () => acceptSale(saleId),
              reloadDetail,
              "Venta aceptada",
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
      documentId={saleId}
      documentTypeLabel="Venta"
      documentTypeKey="sales"
      statusLabels={STATUS_LABELS}
      taxOptions={TAX_OPTIONS}
      fetchDetail={fetchDetailAdapter}
      fetchNextNumber={getNextSaleNumber}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onSuccessRedirect="/sales"
      getExtraActions={getExtraActions}
    />
  );
}
