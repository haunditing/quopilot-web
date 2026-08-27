import { useState } from "react";
import type { ReactNode } from "react";
import { Check, Copy, Globe, Code2 } from "lucide-react";
import { API_URL } from "../../lib/api.js";

/**
 * Molécula: sección de instalación del widget WebChat.
 *
 * Muestra el snippet de embed (CDN) y la URL standalone,
 * con copia al portapapeles y feedback visual.
 */

interface WebChatAccessPanelProps {
  /** Token público del canal (qp_live_xxx). */
  token: string;
  className?: string;
}

// Usa la base donde realmente está sirviendo el script (API con cert válido).
// En producción VITE_API_URL es el dominio público del API (ej: https://api.quopilot.com)
// Cuando el CDN https://cdn.quopilot.com tenga cert válido, cambiar a https://cdn.quopilot.com/v1/widget.js
const WIDGET_SCRIPT_URL = (() => {
  const base = API_URL.replace(/\/$/, "").replace(/\/api$/, "");
  // Si API_URL ya es https://admin.quopilot.com o https://api.quopilot.com, el script está en /api/public/chat-widget.js
  if (base.includes("localhost")) return `${base}/api/public/chat-widget.js`;
  return `${base}/api/public/chat-widget.js`;
})();
const CDN_SNIPPET = (token: string) =>
  `<script src="${WIDGET_SCRIPT_URL}" data-quopilot-token="${token}" async></script>`;

const STANDALONE_URL = (token: string) =>
  `https://app.quopilot.com/c/${token}`;

const CMS_INSTRUCTIONS: { name: string; detail: string }[] = [
  {
    name: "WordPress",
    detail:
      "Pega el script en un bloque HTML personalizado o en el footer del tema (Apariencia → Editor).",
  },
  {
    name: "Shopify",
    detail:
      "Tienda online → Preferencias → Código personalizado, antes del cierre de </body>.",
  },
  {
    name: "HTML propio",
    detail:
      "Pega el snippet justo antes del cierre de </body> en todas las páginas.",
  },
];

export default function WebChatAccessPanel({
  token,
  className,
}: WebChatAccessPanelProps) {
  const [copied, setCopied] = useState<"embed" | "standalone" | null>(null);

  async function copy(text: string, which: "embed" | "standalone") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback para contextos sin Clipboard API (http).
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  }

  const snippet = CDN_SNIPPET(token);
  const standaloneUrl = STANDALONE_URL(token);

  return (
    <div className={`flex flex-col gap-5 ${className || ""}`}>
      {/* ---------- Embed ---------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <header className="mb-3 flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
            aria-hidden="true"
          >
            <Code2 size={18} />
          </span>
          <div>
            <h4 className="text-sm font-bold text-ink-strong">
              Instalar en tu sitio web
            </h4>
            <p className="mt-0.5 text-xs text-ink-muted">
              Pega este código antes del cierre de{" "}
              <code className="font-mono text-[11px]">&lt;/body&gt;</code> en
              todas las páginas.
            </p>
          </div>
        </header>

        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 pr-12 font-mono text-[11px] leading-relaxed text-slate-100">
            {snippet}
          </pre>
          <button
            type="button"
            onClick={() => void copy(snippet, "embed")}
            aria-label="Copiar código de instalación"
            title="Copiar código"
            className="absolute right-2.5 top-2.5 rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            {copied === "embed" ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>

        {/* Instrucciones CMS */}
        <ul className="mt-4 flex flex-col gap-2">
          {CMS_INSTRUCTIONS.map((cms) => (
            <li key={cms.name} className="flex gap-2 text-xs text-ink-muted">
              <span className="font-semibold text-slate-600">{cms.name}:</span>
              <span>{cms.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Standalone ---------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <header className="mb-3 flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600"
            aria-hidden="true"
          >
            <Globe size={18} />
          </span>
          <div>
            <h4 className="text-sm font-bold text-ink-strong">
              Enlace directo (redes sociales)
            </h4>
            <p className="mt-0.5 text-xs text-ink-muted">
              Comparte esta URL en tu biografía de Instagram, WhatsApp Business
              o campañas.
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={standaloneUrl}
            onFocus={(event) => event.target.select()}
            className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-ink-strong focus:outline-none focus:border-accent"
            aria-label="URL directa del chat"
          />
          <CopyButton onClick={() => void copy(standaloneUrl, "standalone")}>
            {copied === "standalone" ? (
              <>
                <Check size={14} /> ¡Copiado!
              </>
            ) : (
              <>
                <Copy size={14} /> Copiar enlace
              </>
            )}
          </CopyButton>
        </div>
      </section>
    </div>
  );
}

/* Botón secundario local (mismo estilo que Button variant secondary, tamaño sm) */
function CopyButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-strong transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent"
    >
      {children}
    </button>
  );
}
