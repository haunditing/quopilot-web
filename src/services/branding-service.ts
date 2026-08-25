import { apiFetch } from "../lib/api.js";

export interface Branding {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  brandName?: string | null;
  fontFamily?: string | null;
}

export const brandingService = {
  // Public GET /api/branding (se consume en la carga inicial, también sin sesión).
  get: async (): Promise<Branding> => {
    return apiFetch<Branding>("/api/branding");
  },
};
