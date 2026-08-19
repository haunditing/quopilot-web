import DocumentPdf from "./DocumentPdf.js";
import type { Customer } from "../../types/customer.js";
import type { Sale } from "../../types/sale.js";
import type { Tenant } from "../../types/tenant.js";

interface SalePdfProps {
  tenant: Tenant;
  sale: Sale;
  customer: Customer;
}

export default function SalePdf({ tenant, sale, customer }: SalePdfProps) {
  return (
    <DocumentPdf
      documentTypeLabel="Venta"
      tenant={tenant}
      document={sale}
      customer={customer}
      issueDateKey="soldAt"
      showExpiryDate={false}
    />
  );
}