import { useCallback, useState } from "react";
import Button from "../components/Button.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import SalePrintTemplate from "../components/SalePrintTemplate.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { downloadPdf } from "../lib/pdf.js";
import { getCustomer } from "../services/customer-service.js";
import { getCurrentTenant } from "../services/tenant-service.js";
import { getSaleDetail } from "../services/sale-detail-service.js";
import type { Customer } from "../types/customer.js";
import type { Sale } from "../types/sale.js";
import type { Tenant } from "../types/tenant.js";
import BackButton from "../components/BackButton.js";
import { useNavigate } from "react-router-dom";

interface SalePrintData {
  sale: Sale;
  customer: Customer;
  tenant: Tenant;
}

interface SalePrintProps {
  saleId: string;
}

async function loadSalePrintData(saleId: string): Promise<SalePrintData> {
  const [saleData, tenant] = await Promise.all([
    getSaleDetail(saleId),
    getCurrentTenant(),
  ]);

  const customer = await getCustomer(saleData.sale.customerId);

  return {
    sale: saleData.sale,
    customer,
    tenant,
  };
}

export default function SalePrint({ saleId }: SalePrintProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetcher = useCallback(() => loadSalePrintData(saleId), [saleId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const navigate = useNavigate();

  const handleDownloadPdf = async () => {
    if (!data) return;
    setIsGeneratingPdf(true);

    try {
      const { default: SalePdf } = await import(
        "../components/pdf/SalePdf.js"
      );

      await downloadPdf(
        <SalePdf
          tenant={data.tenant}
          sale={data.sale}
          customer={data.customer}
        />,
        `Venta_${data.sale.number}.pdf`,
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading || isGeneratingPdf) {
    return (
      <LoadingOverlay
        title={isGeneratingPdf ? "Generando PDF..." : "Cargando venta..."}
      />
    );
  }

  if (error || !data) {
    return (
      <PageState
        kind="error"
        title="Error"
        message={error || "No fue posible cargar la venta"}
      />
    );
  }

  const { sale, customer, tenant } = data;

  return (
    <main className="quote-print-page">
      <BackButton onClick={() => navigate(`/sales/${saleId}`)}>
        Volver a ventas
      </BackButton>
      <div
        className="quote-print-page__toolbar"
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginBottom: "24px",
        }}
      >
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

      <SalePrintTemplate
        tenant={tenant}
        sale={sale}
        customer={customer}
      />
    </main>
  );
}