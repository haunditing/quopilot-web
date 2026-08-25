import { useEffect, type ReactNode } from "react";
import { brandingService, type Branding } from "../services/branding-service.js";
import { API_URL } from "../lib/api.js";

function resolveAssetUrl(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL.replace(/\/api$/, "")}${url}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLight(hex: string): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

/**
 * Aplica la identidad de marca global de la plataforma de forma centralizada:
 * colores (variables CSS), nombre (título), favicon y tipografía.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    async function apply() {
      let branding: Branding | null = null;
      try {
        branding = await brandingService.get();
      } catch {
        // Si no se puede cargar (sin backend), se mantiene el tema por defecto.
        branding = null;
      }

      if (cancelled || !branding) return;

      const root = document.documentElement;
      const primary = branding.primaryColor;
      const secondary = branding.secondaryColor;

      if (primary) {
        const text = isLight(primary) ? "#0f172a" : "#ffffff";
        root.style.setProperty("--accent", primary);
        root.style.setProperty("--accent-text", text);
        root.style.setProperty("--accent-bg", hexToRgba(primary, 0.1));
        root.style.setProperty("--accent-border", hexToRgba(primary, 0.5));
      }

      root.style.setProperty("--brand-primary", primary ?? "");
      root.style.setProperty("--brand-secondary", secondary ?? "");

      if (branding.fontFamily) {
        root.style.setProperty("--sans", branding.fontFamily);
        root.style.setProperty("--heading", branding.fontFamily);
        root.style.setProperty("--brand-font", branding.fontFamily);
      }

      // Fuerza la marca dentro del layout con sobreescritura (los temas por
      // rol tienen su propio --accent en .app-layout--<rol>).
      const styleTag = document.getElementById("branding-theme") as HTMLStyleElement | null;
      const primaryRule = primary
        ? `--accent:${primary} !important;--accent-text:${isLight(primary) ? "#0f172a" : "#ffffff"} !important;--accent-bg:${hexToRgba(primary, 0.1)} !important;--accent-border:${hexToRgba(primary, 0.5)} !important;`
        : "";
      const themeCss = `.app-layout{${primaryRule}}`;

      if (styleTag) {
        styleTag.textContent = themeCss;
      } else {
        const tag = document.createElement("style");
        tag.id = "branding-theme";
        tag.textContent = themeCss;
        document.head.appendChild(tag);
      }

      // Nombre del sitio.
      if (branding.brandName) {
        document.title = branding.brandName;
      }

      // Favicon / isotipo.
      if (branding.faviconUrl) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = resolveAssetUrl(branding.faviconUrl);
      }
    }

    void apply();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
