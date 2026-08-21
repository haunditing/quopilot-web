import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMyCapabilities,
  type CapabilityDomain,
  type MeCapabilities,
} from "../services/me-capabilities-service.js";
import { getAccessToken } from "../services/auth-storage.js";

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<MeCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getAccessToken()) {
        setCapabilities(null);
        setLoading(false);
        return;
      }
      try {
        const data = await getMyCapabilities();
        if (!cancelled) setCapabilities(data);
      } catch {
        // Fail-closed: sin datos, la UI oculta acciones protegidas.
        if (!cancelled) setCapabilities(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const codeSet = useMemo(
    () => new Set(capabilities?.codes ?? []),
    [capabilities],
  );

  const domainSet = useMemo(() => {
    const set = new Set<CapabilityDomain>();
    for (const [domain, caps] of Object.entries(
      capabilities?.byDomain ?? {},
    ) as [CapabilityDomain, unknown[]][]) {
      if (caps.length > 0) set.add(domain);
    }
    return set;
  }, [capabilities]);

  const hasCapability = useCallback(
    (code: string) => codeSet.has(code),
    [codeSet],
  );

  const hasAnyCapability = useCallback(
    (codes: string[]) => codes.some((c) => codeSet.has(c)),
    [codeSet],
  );

  const hasDomain = useCallback(
    (domain: CapabilityDomain) => domainSet.has(domain),
    [domainSet],
  );

  return { capabilities, loading, hasCapability, hasAnyCapability, hasDomain };
}
