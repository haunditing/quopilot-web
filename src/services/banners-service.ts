import { apiRequest } from "../lib/api";
import type { Banner } from "../types/banner";

/**
 * Servicio de banners (SDUI) en la app.
 *
 * Consume `GET /api/banners` del mismo origen que el resto de la API
 * (`quopilot-api`), que devuelve `{ banners: Banner[] }` con los banners
 * ACTIVOS ordenados por prioridad. Capa de caché en memoria
 * (stale-while-revalidate manual) para evitar fetch en cada render.
 */

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  banners: Banner[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<Banner[]> | null = null;

export async function fetchPublicBanners(): Promise<Banner[]> {
  // Cache fresca.
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.banners;
  }

  // Reusar la petición en curso.
  if (inflight) return inflight;

  inflight = apiRequest<{ banners: Banner[] }>("/banners")
    .then((json) => {
      const banners = Array.isArray(json?.banners) ? json.banners : [];
      cache = { banners, fetchedAt: Date.now() };
      return banners;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Fuerza la revalidación (quita la caché). */
export function invalidateBannersCache(): void {
  cache = null;
}
