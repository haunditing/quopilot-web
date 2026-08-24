import { useMemo } from "react";

/**
 * Detecta si la aplicación corre embebida en un iframe
 * (`window.self !== window.top`).
 *
 * El acceso a `window.top` desde un iframe de otro origen lanza
 * SecurityError en algunos navegadores: se interpreta como embebido.
 */
export function useEmbedMode(): boolean {
  return useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);
}
