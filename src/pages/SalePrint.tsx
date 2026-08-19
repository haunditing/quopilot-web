import { useCallback, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import Button from "../components/Button.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { getCustomer } from "../services/customer-service.js";
import { getCurrentTenant } from "../services/tenant-service.js";
import { getSaleDetail } from "../services/sale-detail-service.js";
import type { Customer } from "../types/customer.js";
import type { Sale } from "../types/sale.js";
import type { Tenant } from "../types/tenant.js";
import SalePrintTemplate from "../components/SalePrintTemplate.js";
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetcher = useCallback(() => loadSalePrintData(saleId), [saleId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const navigate = useNavigate();

  const handleDownloadPdf = async () => {
    if (!contentRef.current || !data) return;
    setIsGeneratingPdf(true);

    try {
      const element = contentRef.current;
      const opt = {
        margin: 10,
        filename: `Venta_${data.sale.number}.pdf`,
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
        ref={contentRef}
        tenant={tenant}
        sale={sale}
        customer={customer}
      />
    </main>
  );
}
