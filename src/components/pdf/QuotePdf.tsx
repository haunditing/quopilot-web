import DocumentPdf from "./DocumentPdf.js";
import type { Customer } from "../../types/customer.js";
import type { Quote } from "../../types/quote.js";
import type { Tenant } from "../../types/tenant.js";

interface QuotePdfProps {
  tenant: Tenant;
  quote: Quote;
  customer: Customer;
}

export default function QuotePdf({ tenant, quote, customer }: QuotePdfProps) {
  return (
    <DocumentPdf
      documentTypeLabel="Cotización"
      tenant={tenant}
      document={quote}
      customer={customer}
    />
  );
}