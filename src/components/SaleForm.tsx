import { useNavigate } from "react-router-dom";
import DocumentDetailForm from "./DocumentDetailForm.js";
import type {
  ActionDefinition,
  DocumentDetailData,
  GenericDocument,
} from "./DocumentDetailForm.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";

import { getSaleDetail } from "../services/sale-detail-service.js";
import { cancelSale, deleteSale } from "../services/sale-service.js";

const TAX_OPTIONS = [
  { label: "Exento 0%", value: 0 },
  { label: "IVA 5%", value: 0.05 },
  { label: "IVA 19%", value: 0.19 },
];

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  CREATED: "Creada",
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

    // Acción: Cancelar venta
    if (can(role, "sales", "delete") && sale.status === "CONFIRMED") {
      actions.push({
        icon: "close",
        ariaLabel: "Cancelar venta",
        variant: "danger",
        disabled: saving,
        onClick: async () => {
          const confirmed = await confirm({
            title: "Cancelar venta",
            message: `¿Cancelar la venta ${sale.number}?`,
            confirmLabel: "Cancelar venta",
            danger: true,
          });

          if (confirmed && saleId) {
            await runSaleAction(
              () => cancelSale(saleId),
              reloadDetail,
              "Venta cancelada",
            );
          }
        },
      });
    }

    // Acción: Eliminar venta (solo canceladas)
    if (can(role, "sales", "delete") && sale.status === "CANCELLED") {
      actions.push({
        icon: "trash",
        ariaLabel: "Eliminar venta",
        variant: "danger",
        disabled: saving,
        onClick: async () => {
          const confirmed = await confirm({
            title: "Eliminar venta",
            message: `¿Eliminar la venta ${sale.number}? Esta acción no se puede deshacer.`,
            confirmLabel: "Eliminar",
            danger: true,
          });

          if (confirmed && saleId) {
            await runSaleAction(
              () => deleteSale(saleId),
              reloadDetail,
              "Venta eliminada",
            );
            navigate("/sales");
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
      onSuccessRedirect="/sales"
      getExtraActions={getExtraActions}
    />
  );
}