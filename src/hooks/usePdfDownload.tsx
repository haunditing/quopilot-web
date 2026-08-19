import { useCallback, useState } from "react";
import { downloadPdf } from "../lib/pdf.js";
import { useToast } from "./useToast.js";
import { getCustomer } from "../services/customer-service.js";
import { getQuoteDetail } from "../services/quote-detail-service.js";
import { getSaleDetail } from "../services/sale-detail-service.js";
import { getCurrentTenant } from "../services/tenant-service.js";
import type { Customer } from "../types/customer.js";
import type { Quote } from "../types/quote.js";
import type { Sale } from "../types/sale.js";
import type { Tenant } from "../types/tenant.js";

function useDocumentLoader() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const toast = useToast();

  const runWithDownload = useCallback(
    async (
      id: string,
      task: () => Promise<void>,
      errorMessage: string,
    ): Promise<void> => {
      setDownloadingId(id);

      try {
        await task();
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : errorMessage,
        );
      } finally {
        setDownloadingId((current) => (current === id ? null : current));
      }
    },
    [toast],
  );

  const loadPdfData = useCallback(
    async <T extends { customerId: string }>(
      documentId: string,
      fetchDetail: (id: string) => Promise<{ document: T }>,
    ): Promise<{ document: T; customer: Customer; tenant: Tenant }> => {
      const [detail, tenant] = await Promise.all([
        fetchDetail(documentId),
        getCurrentTenant(),
      ]);

      const customer = await getCustomer(detail.document.customerId);

      return {
        document: detail.document,
        customer,
        tenant,
      };
    },
    [],
  );

  return {
    downloadingId,
    runWithDownload,
    loadPdfData,
  };
}

export function usePdfDownload() {
  const { downloadingId, runWithDownload, loadPdfData } = useDocumentLoader();

  const downloadQuote = useCallback(
    async (quote: Quote): Promise<void> => {
      await runWithDownload(quote._id, async () => {
        const data = await loadPdfData(quote._id, async (id) => {
          const detail = await getQuoteDetail(id);
          return { document: detail.quote };
        });

        const { default: QuotePdf } = await import(
          "../components/pdf/QuotePdf.js"
        );

        await downloadPdf(
          <QuotePdf
            tenant={data.tenant}
            quote={data.document}
            customer={data.customer}
          />,
          `Cotizacion_${quote.number}.pdf`,
        );
      }, "No fue posible generar el PDF de la cotización");
    },
    [runWithDownload, loadPdfData],
  );

  const downloadSale = useCallback(
    async (sale: Sale): Promise<void> => {
      await runWithDownload(sale._id, async () => {
        const data = await loadPdfData(sale._id, async (id) => {
          const detail = await getSaleDetail(id);
          return { document: detail.sale };
        });

        const { default: SalePdf } = await import(
          "../components/pdf/SalePdf.js"
        );

        await downloadPdf(
          <SalePdf
            tenant={data.tenant}
            sale={data.document}
            customer={data.customer}
          />,
          `Venta_${sale.number}.pdf`,
        );
      }, "No fue posible generar el PDF de la venta");
    },
    [runWithDownload, loadPdfData],
  );

  return {
    downloadingId,
    downloadQuote,
    downloadSale,
  };
}