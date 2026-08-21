// src/services/support-assistant-service.ts
// Solo el endpoint del asistente de soporte tenant-facing.
// El chat lo resuelve AssistantChat vía agent-assistant-service.
// La consola de gestión del asistente (config/knowledge/cases/métricas)
// vive en quopilot-web-admin.

export const SUPPORT_ASSISTANT_ENDPOINT = "/api/support/assistant";
