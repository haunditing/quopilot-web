import { forwardRef } from "react";
import DocumentPrintTemplate from "./DocumentPrintTemplate.js";
import type { Customer } from "../types/customer.js";
import type { Sale } from "../types/sale.js";
import type { Tenant } from "../types/tenant.js";

interface SalePrintTemplateProps {
  tenant: Tenant;
  sale: Sale;
  customer: Customer;
}

const SalePrintTemplate = forwardRef<HTMLDivElement, SalePrintTemplateProps>(
  ({ tenant, sale, customer }, ref) => {
    return (
      <DocumentPrintTemplate
        ref={ref}
        documentTypeLabel="Venta"
        tenant={tenant}
        document={sale}
        customer={customer}
      />
    );
  },
);

SalePrintTemplate.displayName = "SalePrintTemplate";
export default SalePrintTemplate;
