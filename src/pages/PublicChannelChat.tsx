import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import PublicChat, {
  readInjectedPublicChannel,
  type InjectedPublicChannel,
} from "./PublicChat.js";
import Loading from "../components/Loading.js";

/**
 * Vista pública montada en /c/:token.
 *
 * Resuelve el canal por token (estado inyectado por el SSR de la API
 * o fetch directo) y delega en PublicChat con el modo adaptativo
 * (embed dentro del widget · standalone para enlaces de bio).
 */
export default function PublicChannelChat() {
  const { token = "" } = useParams<{ token: string }>();

  const [config, setConfig] = useState<InjectedPublicChannel | null>(() =>
    readInjectedPublicChannel(),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!config);

  useEffect(() => {
    if (config) return;

    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const data = await apiRequest<InjectedPublicChannel>(
          `/api/v1/public/channels/${encodeURIComponent(token)}`,
        );

        if (!cancelled && data?.tenantId) {
          setConfig(data);
        } else if (!cancelled) {
          setError("Chat no disponible");
        }
      } catch {
        if (!cancelled) setError("Chat no disponible");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, config]);

  const isEmbed = useMemo(
    () => Boolean(config) && window.self !== window.top,
    [config],
  );

  function handleEmbedClose(): void {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "quopilot:close" }, "*");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-light">
        <Loading variant="inline" label="Iniciando chat…" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-light p-6 text-center">
        <p className="text-sm text-ink-muted">
          {error || "Chat no disponible"}
        </p>
      </div>
    );
  }

  const variant = isEmbed ? "embed" : "page";

  return (
    <PublicChat
      key={config.tenantId}
      tenantId={config.tenantId}
      variant={variant}
      onEmbedClose={isEmbed ? handleEmbedClose : undefined}
    />
  );
}
