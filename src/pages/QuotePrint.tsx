import { useCallback, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import Button from "../components/Button.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import QuotePrintTemplate from "../components/QuotePrintTemplate.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { getCustomer } from "../services/customer-service.js";
import { getQuoteDetail } from "../services/quote-detail-service.js";
import { getCurrentTenant } from "../services/tenant-service.js";
import type { Customer } from "../types/customer.js";
import type { Quote } from "../types/quote.js";
import type { Tenant } from "../types/tenant.js";
import BackButton from "../components/BackButton.js";
import { useNavigate } from "react-router-dom";

interface QuotePrintData {
  quote: Quote;
  customer: Customer;
  tenant: Tenant;
}

interface QuotePrintProps {
  quoteId: string;
}

async function loadQuotePrintData(quoteId: string): Promise<QuotePrintData> {
  const [quoteData, tenant] = await Promise.all([
    getQuoteDetail(quoteId),
    getCurrentTenant(),
  ]);

  const customer = await getCustomer(quoteData.quote.customerId);

  return {
    quote: quoteData.quote,
    customer,
    tenant,
  };
}

export default function QuotePrint({ quoteId }: QuotePrintProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const navigate = useNavigate();

  const fetcher = useCallback(() => loadQuotePrintData(quoteId), [quoteId]);
  const { data, loading, error } = useAsyncData(fetcher);

  const handleDownloadPdf = async () => {
    if (!contentRef.current || !data) return;
    setIsGeneratingPdf(true);

    try {
      const element = contentRef.current;
      const opt = {
        margin: 10,
        filename: `Cotizacion_${data.quote.number}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm" as const,
          format: "a4",
          orientation: "portrait" as const,
        },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading || isGeneratingPdf) {
    return (
      <LoadingOverlay
        title={isGeneratingPdf ? "Generando PDF..." : "Cargando cotización..."}
      />
    );
  }

  if (error || !data) {
    return (
      <PageState
        kind="error"
        title="Error"
        message={error || "No fue posible cargar la cotización"}
      />
    );
  }

  const { quote, customer, tenant } = data;

  return (
    <main className="quote-print-page">
      <BackButton onClick={() => navigate("/quotes")}>
        Volver a cotizaciones
      </BackButton>
      <div className="quote-print-page__toolbar">
        <Button
          icon="download"
          iconOnly
          variant="secondary"
          className="btn-icon-action btn-download"
          onClick={handleDownloadPdf}
        >
          Descargar PDF
        </Button>
      </div>

      <QuotePrintTemplate
        ref={contentRef}
        tenant={tenant}
        quote={quote}
        customer={customer}
      />
    </main>
  );
}
