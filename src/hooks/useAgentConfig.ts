import { createContext, useContext } from "react";
import type { AgentConfig, AgentConfigInput } from "../types/agent.js";

export const AGENT_CONFIG_QUERY_KEY = ["agentConfig"] as const;

export interface AgentConfigContextValue {
  agent: AgentConfig | null;
  loading: boolean;
  error: string;
  invalidateAgentConfig: () => Promise<void>;
  saveAgentConfig: (input: AgentConfigInput) => Promise<AgentConfig>;
}

export const AgentConfigContext = createContext<AgentConfigContextValue | null>(
  null,
);

export function useAgentConfig(): AgentConfigContextValue {
  const context = useContext(AgentConfigContext);

  if (!context) {
    throw new Error("useAgentConfig debe usarse dentro de AgentConfigProvider");
  }

  return context;
}