import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "./useAsyncData.js";

export type FilterValues = Record<string, string>;

export function useFilteredList<F extends FilterValues, T>(
  buildFetcher: (params: F & { search: string }) => () => Promise<T>,
  initial: F,
) {
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<F>(initial);

  const set = useCallback((id: string, value: string) => {
    setValues((previous) =>
      previous[id] === value ? previous : { ...previous, [id]: value },
    );
  }, []);

  const reset = useCallback(() => {
    setValues(initial);
  }, [initial]);

  const params = useMemo(
    () => ({ ...values, search }) as F & { search: string },
    [values, search],
  );

  const fetcher = useCallback(
    () => buildFetcher(params)(),
    [buildFetcher, params],
  );

  const { data, loading, error, reload } = useAsyncData(fetcher);

  const clear = useCallback(() => {
    setValues(initial);
    setSearch("");
  }, [initial]);

  const activeCount = Object.values(values).filter(
    (value) => value !== "",
  ).length;

  return {
    data,
    loading,
    error,
    reload,
    search,
    setSearch,
    values,
    set,
    reset,
    clear,
    activeCount,
  };
}
