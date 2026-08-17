import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AgentConfigContext,
  AGENT_CONFIG_QUERY_KEY,
} from "../hooks/useAgentConfig.js";
import type { AgentConfigContextValue } from "../hooks/useAgentConfig.js";
import {
  getAgentConfig,
  updateAgentConfig,
} from "../services/agent-service.js";
import type {
  AgentConfig,
  AgentConfigInput,
} from "../types/agent.js";

const AGENT_CHANNEL_NAME = "quopilot:agent-config";
const AGENT_UPDATED_EVENT = "AGENT_UPDATED";

export default function AgentConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const channelRef = useRef<BroadcastChannel | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAgentConfig();
      setAgent(data);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cargar la configuración del agente",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateAgentConfig = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const saveAgentConfig = useCallback(
    async (input: AgentConfigInput) => {
      const updated = await updateAgentConfig(input);

      setAgent(updated);

      channelRef.current?.postMessage({
        type: AGENT_UPDATED_EVENT,
        queryKey: AGENT_CONFIG_QUERY_KEY,
      });

      return updated;
    },
    [],
  );

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      void Promise.resolve().then(load);

      return;
    }

    const channel = new BroadcastChannel(AGENT_CHANNEL_NAME);

    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      const message = event.data;

      if (
        message &&
        message.type === AGENT_UPDATED_EVENT &&
        JSON.stringify(message.queryKey) === JSON.stringify(AGENT_CONFIG_QUERY_KEY)
      ) {
        void invalidateAgentConfig();
      }
    };

    void Promise.resolve().then(load);

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [invalidateAgentConfig, load]);

  const value: AgentConfigContextValue = useMemo(
    () => ({
      agent,
      loading,
      error,
      invalidateAgentConfig,
      saveAgentConfig,
    }),
    [agent, error, invalidateAgentConfig, loading, saveAgentConfig],
  );

  return (
    <AgentConfigContext.Provider value={value}>
      {children}
    </AgentConfigContext.Provider>
  );
}