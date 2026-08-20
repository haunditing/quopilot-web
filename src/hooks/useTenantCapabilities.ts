import { useEffect, useState } from "react";
import { getMyTenantCapabilities } from "../services/tenant-service.js";
import type { CapabilityMatrixEntry } from "../types/support-assistant.js";

export function useTenantCapabilities() {
  const [loading, setLoading] = useState(true);
  const [effectiveCodes, setEffectiveCodes] = useState<string[]>([]);
  const [entries, setEntries] = useState<CapabilityMatrixEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getMyTenantCapabilities();
        setEffectiveCodes(data.effectiveCodes ?? []);
        setEntries(data.entries ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading capabilities");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function isEffective(code: string): boolean {
    return effectiveCodes.includes(code);
  }

  return { loading, effectiveCodes, entries, error, isEffective };
}
