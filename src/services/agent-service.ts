import { apiRequest } from "../lib/api.js";
import type {
  AgentConfig,
  AgentConfigInput,
} from "../types/agent.js";

export async function getAgentConfig(): Promise<AgentConfig> {
  return apiRequest<AgentConfig>("/api/agent/config", {
    method: "GET",
  });
}

export async function updateAgentConfig(
  input: AgentConfigInput,
): Promise<AgentConfig> {
  return apiRequest<AgentConfig>("/api/agent/config", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
