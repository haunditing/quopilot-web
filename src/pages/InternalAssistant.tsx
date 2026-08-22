import AssistantChat from "../components/AssistantChat.js";
import PageHeader from "../components/PageHeader.js";
import { INTERNAL_ASSISTANT_ENDPOINT } from "../services/agent-assistant-service.js";

const SUGGESTIONS: string[] = [
  "Resumen de mi negocio",
  "Lista mis productos activos",
  "Configura la política comercial: términos de pago a 30 días",
  "¿Qué canales de venta tengo configurados?",
  "Muestra las últimas cotizaciones enviadas",
  "¿Cuántas ventas confirmadas tengo este mes?",
  "Cambia el tono del agente a amigable",
  "Agrega un producto llamado Asesoría Premium",
];

export default function InternalAssistant() {
  return (
    <main className="w-full max-w-[860px] mx-auto px-4">
      <PageHeader
        title="Asistente de QuoPilot"
        description="Configura y consulta tu negocio con lenguaje natural"
      />

      <AssistantChat
        className="mt-6"
        endpoint={INTERNAL_ASSISTANT_ENDPOINT}
        title="Asistente de QuoPilot"
        subtitle="Configura tu plataforma y consulta tu negocio"
        welcomeMessage="Hola, soy el asistente de QuoPilot. Puedo ayudarte a configurar tu agente, productos, canales y políticas comerciales, y a consultar la información de tu negocio."
        placeholder="Ej.: resumen de mi negocio"
        suggestions={SUGGESTIONS}
      />
    </main>
  );
}