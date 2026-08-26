/**
 * QuoPilot WebChat Widget — punto de entrada para CDN (IIFE, cero dependencias).
 *
 * Uso por parte del cliente:
 *   <script src="https://cdn.quopilot.com/v1/widget.js" data-quopilot-token="qp_live_xxx"></script>
 *
 * Atributos opcionales del <script>:
 *   data-quopilot-origin  — origen donde vive el chat (default: https://app.quopilot.com)
 *   data-quopilot-position — "bottom-right" | "bottom-left"
 *
 * API programática (CTA de landing con contexto de plan):
 *   window.QuoPilotChat.selectPlan("PRO")
 *   window.QuoPilotChat.open({ plan: "PRO" })
 *   window.QuoPilotChat.close()
 */

declare global {
  interface Window {
    QuoPilotChat?: {
      open: (opts?: { plan?: string; planContext?: string }) => void;
      selectPlan: (planKey: string) => void;
      close: () => void;
    };
  }
}

(() => {
  "use strict";

  /* ============================================================
   * Guardas defensivas
   * ============================================================ */

  // Evitar doble ejecución si el snippet se pega dos veces.
  if ((window as unknown as { __QUOPILOT_WIDGET__?: boolean }).__QUOPILOT_WIDGET__) {
    return;
  }
  Object.defineProperty(window, "__QUOPILOT_WIDGET__", { value: true });

  const currentScript = document.currentScript as HTMLScriptElement | null;
  const token = currentScript?.dataset.quopilotToken ?? "";

  // Formato canónico del token emitido por la API (fail-closed).
  const TOKEN_PATTERN = /^qp_live_[a-f0-9]{32}$/;

  if (!TOKEN_PATTERN.test(token)) {
    console.error(
      "[QuoPilot] data-quopilot-token inválido o ausente. " +
        "Se esperaba el formato qp_live_xxx entregado por el panel.",
    );
    return;
  }

  /* ============================================================
   * Configuración
   * ============================================================ */

  const APP_ORIGIN =
    normalizeOrigin(currentScript?.dataset.quopilotOrigin) ??
    "https://app.quopilot.com";

  const POSITION: "right" | "left" =
    currentScript?.dataset.quopilotPosition === "bottom-left" ? "left" : "right";

  function normalizeOrigin(raw?: string): string | null {
    if (!raw) return null;
    try {
      return new URL(raw).origin;
    } catch {
      console.error("[QuoPilot] data-quopilot-origin inválido:", raw);
      return null;
    }
  }

  /** Origen válido contra el que se valida cada mensaje del iframe. */
  const TRUSTED_ORIGIN = APP_ORIGIN;

  /* ============================================================
   * Estilos encapsulados (prefijo qp- evita colisiones)
   * ============================================================ */

  const SIDE = POSITION;

  const css = `
.qp-widget-fab {
  position: fixed;
  ${SIDE}: 20px;
  bottom: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, var(--accent, #aa3bff), #7e22ce);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  z-index: 2147483000;
}
.qp-widget-fab:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
}
.qp-widget-fab svg {
  width: 30px;
  height: 30px;
  fill: #ffffff;
}

.qp-widget-frame {
  position: fixed;
  ${SIDE}: 20px;
  bottom: 92px;
  width: 380px;
  height: min(600px, calc(100vh - 120px));
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 112px);
  border: none;
  border-radius: 16px;
  background: transparent;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  opacity: 0;
  transform: translateY(16px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 2147483001;
}
.qp-widget-frame--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

@media (max-width: 480px) {
  .qp-widget-frame {
    inset: 0;
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }
}
`;

  /* ============================================================
   * Inyección DOM
   * ============================================================ */

  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Iframe oculto hacia la página SSR/hidratada del canal.
  const frameUrl = `${APP_ORIGIN.replace(/\/$/, "")}/c/${encodeURIComponent(token)}`;

  const frame = document.createElement("iframe");
  frame.className = "qp-widget-frame";
  frame.src = frameUrl;
  frame.title = "Chat en línea";
  frame.allow = "microphone; clipboard-write";
  frame.setAttribute("aria-hidden", "true");

  // Botón flotante.
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "qp-widget-fab";
  fab.setAttribute("aria-label", "Abrir chat de asistencia");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.09.9 3.99 2.38 5.42-.13 1.05-.56 2.36-1.62 3.33a.6.6 0 0 0 .42 1.04c1.94-.08 3.53-.75 4.65-1.49 1 .29 2.06.45 3.17.45 4.97 0 9-3.58 9-8s-4.03-8-9-8z"/></svg>';

  /* ============================================================
   * Estado e interacción
   * ============================================================ */

  let isOpen = false;

  function setOpen(next: boolean): void {
    isOpen = next;

    frame.classList.toggle("qp-widget-frame--visible", isOpen);
    frame.setAttribute("aria-hidden", String(!isOpen));
    fab.setAttribute("aria-expanded", String(isOpen));
    fab.setAttribute(
      "aria-label",
      isOpen ? "Cerrar chat de asistencia" : "Abrir chat de asistencia",
    );

    // Notificar al iframe para que reaccione (focus, pausa de polling…).
    frame.contentWindow?.postMessage(
      { type: "quopilot:visibility", visible: isOpen },
      TRUSTED_ORIGIN,
    );
  }

  fab.addEventListener("click", () => setOpen(!isOpen));

  /* ============================================================
   * Comunicación segura (PostMessage)
   * ============================================================ */

  window.addEventListener("message", (event: MessageEvent) => {
    // Validación de origen: descarta cualquier ventana no confiable.
    if (event.origin !== TRUSTED_ORIGIN) {
      return;
    }

    // Validar que el mensaje provenga del propio iframe.
    if (event.source && event.source !== frame.contentWindow) {
      return;
    }

    const type = (
      event.data as { type?: unknown } | null
    )?.type;

    switch (type) {
      case "quopilot:close":
        setOpen(false);
        break;
      case "quopilot:open":
        setOpen(true);
        break;
    }
  });

  /* ============================================================
   * Contexto de plan (CTA de landing) + API programática
   * ============================================================ */

  let planContext: string | null = null;

  function iframeUrlWithPlan(): string {
    return planContext
      ? `${frameUrl}?plan=${encodeURIComponent(planContext)}`
      : frameUrl;
  }

  function applyPlan(planKey: string): void {
    planContext = planKey;
    // Recarga el iframe del chat con el plan en la URL para que la
    // conversación arranque con ese contexto.
    frame.src = iframeUrlWithPlan();
  }

  window.QuoPilotChat = {
    selectPlan(planKey: string): void {
      applyPlan(planKey);
    },
    open(opts?: { plan?: string; planContext?: string }): void {
      const plan = opts?.plan ?? opts?.planContext;
      if (plan) applyPlan(plan);
      setOpen(true);
    },
    close(): void {
      setOpen(false);
    },
  };

  /* ============================================================
   * Montaje
   * ============================================================ */

  function mount(): void {
    document.body.appendChild(frame);
    document.body.appendChild(fab);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
