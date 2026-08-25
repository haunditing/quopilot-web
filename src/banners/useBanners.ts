import { useCallback, useEffect, useState } from "react";
import type { Banner } from "../types/banner";
import { fetchPublicBanners } from "../services/banners-service";

interface UseBannersResult {
  banners: Banner[];
  loading: boolean;
  error: string;
  revalidate: () => void;
}

/**
 * Hook de banners con caché (SWR-like):
 *  - Devuelve la caché (si existe) de inmediato; en background refetch.
 *  - `revalidate()` fuerza un refetch.
 */
export function useBanners(): UseBannersResult {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [key, setKey] = useState(0);

  const revalidate = useCallback(() => setKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetchPublicBanners()
      .then((data) => {
        if (cancelled) return;
        setBanners(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "No se pudieron cargar los banners");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { banners, loading, error, revalidate };
}
