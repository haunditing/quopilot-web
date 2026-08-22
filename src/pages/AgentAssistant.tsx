import AssistantChat from "../components/AssistantChat.js";
import PageHeader from "../components/PageHeader.js";

export default function AgentAssistant() {
  return (
    <main className="w-full max-w-[860px] mx-auto px-4">
      <PageHeader
        title="Asistente de IA"
        description="Configura tu agente de IA comercial mediante conversación"
      />

      <AssistantChat className="mt-6" />
    </main>
  );
}
