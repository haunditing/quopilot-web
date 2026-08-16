import { useCallback, useEffect, useState } from "react";

export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
}

const DEFAULT_ERROR_MESSAGE = "No fue posible cargar la información";

/**
 * Carga datos de forma asíncrona al montar el componente.
 *
 * El `fetcher` debe ser estable entre renderizados (por ejemplo, una función
 * del módulo o envuelta en `useCallback`) para no recargar los datos en cada
 * render. Usa `reload` para volver a cargar tras una mutación.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const result = await fetcher();

        if (!cancelled) {
          setData(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : DEFAULT_ERROR_MESSAGE,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetcher, reloadKey]);

  return { data, loading, error, reload };
}
