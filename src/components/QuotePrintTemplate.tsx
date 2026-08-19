import DocumentPrintTemplate from "./DocumentPrintTemplate.js";
import type { Customer } from "../types/customer.js";
import type { Quote } from "../types/quote.js";
import type { Tenant } from "../types/tenant.js";

interface QuotePrintTemplateProps {
  tenant: Tenant;
  quote: Quote;
  customer: Customer;
}

export default function QuotePrintTemplate({
  tenant,
  quote,
  customer,
}: QuotePrintTemplateProps) {
  return (
    <DocumentPrintTemplate
      documentTypeLabel="Cotización"
      tenant={tenant}
      document={quote}
      customer={customer}
    />
  );
}