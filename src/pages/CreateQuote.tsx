import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import PageHeader from "../components/PageHeader.js";
import QuoteForm from "../components/QuoteForm.js";

export default function CreateQuote() {
  const navigate = useNavigate();

  return (
    <main>
      <PageHeader
        title="Nueva cotización"
        description="Crea una cotización profesional para tu cliente"
        actions={
          <Button
            type="button"
            variant="secondary"
            icon="close"
            iconOnly
            onClick={() => navigate("/quotes")}
          >
            Cancelar
          </Button>
        }
      />

      <QuoteForm mode="create" />
    </main>
  );
}
