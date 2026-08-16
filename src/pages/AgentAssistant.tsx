import AssistantChat from "../components/AssistantChat.js";
import PageHeader from "../components/PageHeader.js";

export default function AgentAssistant() {
  return (
    <main className="assistant-chat">
      <PageHeader
        title="Asistente de IA"
        description="Configura tu agente de IA comercial mediante conversación"
      />

      <AssistantChat className="assistant-chat__card--page" />
    </main>
  );
}
