import DocumentPrintTemplate from "./DocumentPrintTemplate.js";
import type { Customer } from "../types/customer.js";
import type { Sale } from "../types/sale.js";
import type { Tenant } from "../types/tenant.js";

interface SalePrintTemplateProps {
  tenant: Tenant;
  sale: Sale;
  customer: Customer;
}

export default function SalePrintTemplate({
  tenant,
  sale,
  customer,
}: SalePrintTemplateProps) {
  return (
    <DocumentPrintTemplate
      documentTypeLabel="Venta"
      tenant={tenant}
      document={sale}
      customer={customer}
      issueDateKey="soldAt"
      showExpiryDate={false}
    />
  );
}