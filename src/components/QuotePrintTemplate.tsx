import { forwardRef } from "react";
import DocumentPrintTemplate from "./DocumentPrintTemplate.js";
import type { Customer } from "../types/customer.js";
import type { Quote } from "../types/quote.js";
import type { Tenant } from "../types/tenant.js";

interface QuotePrintTemplateProps {
  tenant: Tenant;
  quote: Quote;
  customer: Customer;
}

const QuotePrintTemplate = forwardRef<HTMLDivElement, QuotePrintTemplateProps>(
  ({ tenant, quote, customer }, ref) => {
    return (
      <DocumentPrintTemplate
        ref={ref}
        documentTypeLabel="Cotización"
        tenant={tenant}
        document={quote}
        customer={customer}
      />
    );
  },
);

QuotePrintTemplate.displayName = "QuotePrintTemplate";
export default QuotePrintTemplate;
