import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { brandingService, type Branding } from "../services/branding-service.js";
import { API_URL } from "../lib/api.js";

export function resolveBrandAssetUrl(url?: string | null): string {
  if (!url) return "";
  if (/^data:/i.test(url)) return url;
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

interface BrandingContextValue {
  branding: Branding | null;
  /** Logo principal resuelto a URL absoluta (o "" si no hay). */
  logoUrl: string;
  /** Favicon resuelto a URL absoluta (o "" si no hay). */
  faviconUrl: string;
  /** Imagen del asistente resuelta a URL absoluta (o "" si no hay). */
  assistantImageUrl: string;
  brandName: string;
  primaryColor: string | null;
  secondaryColor: string | null;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  logoUrl: "",
  faviconUrl: "",
  assistantImageUrl: "",
  brandName: "QuoPilot",
  primaryColor: null,
  secondaryColor: null,
});

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}

/**
 * Aplica la identidad de marca global de la plataforma de forma centralizada:
 * colores (variables CSS), nombre (título), favicon y tipografía; y expone
 * los datos vía contexto para que la UI (sidebar, login) muestre logo y marca.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function apply() {
      let loaded: Branding | null = null;
      try {
        loaded = await brandingService.get();
      } catch {
        // Si no se puede cargar (sin backend), se mantiene el tema por defecto.
        loaded = null;
      }

      if (cancelled || !loaded) return;

      setBranding(loaded);

      const root = document.documentElement;
      const primary = loaded.primaryColor;

      if (primary) {
        const text = isLight(primary) ? "#0f172a" : "#ffffff";
        root.style.setProperty("--accent", primary);
        root.style.setProperty("--accent-text", text);
        root.style.setProperty("--accent-bg", hexToRgba(primary, 0.1));
        root.style.setProperty("--accent-border", hexToRgba(primary, 0.5));
      }

      root.style.setProperty("--brand-primary", primary ?? "");
      root.style.setProperty("--brand-secondary", loaded.secondaryColor ?? "");

      if (loaded.fontFamily) {
        root.style.setProperty("--sans", loaded.fontFamily);
        root.style.setProperty("--heading", loaded.fontFamily);
        root.style.setProperty("--brand-font", loaded.fontFamily);
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
      if (loaded.brandName) {
        document.title = loaded.brandName;
      }

      // Favicon / isotipo.
      if (loaded.faviconUrl) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = resolveBrandAssetUrl(loaded.faviconUrl);
      }
    }

    void apply();

    return () => {
      cancelled = true;
    };
  }, []);

  const value: BrandingContextValue = {
    branding,
    logoUrl: branding?.logoUrl ? resolveBrandAssetUrl(branding.logoUrl) : "",
    faviconUrl: branding?.faviconUrl
      ? resolveBrandAssetUrl(branding.faviconUrl)
      : "",
    assistantImageUrl: branding?.assistantImageUrl
      ? resolveBrandAssetUrl(branding.assistantImageUrl)
      : "",
    brandName: branding?.brandName || "QuoPilot",
    primaryColor: branding?.primaryColor ?? null,
    secondaryColor: branding?.secondaryColor ?? null,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}
