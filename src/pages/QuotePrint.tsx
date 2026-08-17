import { useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
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

  const fetcher = useCallback(
    () => loadQuotePrintData(quoteId),
    [quoteId],
  );
  const { data, loading, error } = useAsyncData(fetcher);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Cotización ${data?.quote.number ?? quoteId}`,
  });

if (loading) {
    return <LoadingOverlay title="Cargando cotización..." />;
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
      <div className="quote-print-page__toolbar">
        <Button icon="print" iconOnly onClick={() => handlePrint()}>
          Imprimir / Guardar PDF
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
