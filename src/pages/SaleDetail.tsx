import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.js";
import PageHeader from "../components/PageHeader.js";
import SaleForm from "../components/SaleForm.js";

interface SaleDetailProps {
  saleId: string;
}

export default function SaleDetail({ saleId }: SaleDetailProps) {
  const navigate = useNavigate();

  return (
    <main>
      <BackButton onClick={() => navigate("/sales")}>
        Volver a ventas
      </BackButton>

      <PageHeader title="Venta" description="Consulta o edita la venta" />

      <SaleForm mode="edit" saleId={saleId} />
    </main>
  );
}
