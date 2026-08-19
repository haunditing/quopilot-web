import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.js";
import PageHeader from "../components/PageHeader.js";
import QuoteForm from "../components/QuoteForm.js";

interface QuoteDetailProps {
  quoteId: string;
}

export default function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const navigate = useNavigate();

  return (
    <main>
      <BackButton onClick={() => navigate(`/quotes/${quoteId}`)}>
        Volver a cotizaciones
      </BackButton>

      <PageHeader
        title="Cotización"
        description="Consulta o edita la cotización"
      />

      <QuoteForm mode="edit" quoteId={quoteId} />
    </main>
  );
}
