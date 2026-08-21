import { getAccessToken } from "../services/auth-storage.js";
import { clearAuth } from "../services/auth-storage.js";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * Cliente HTTP autenticado.
 *
 * Seguridad:
 * - Los errores del backend (4xx/5xx) SIEMPRE se propagan; jamás se
 *   sustituyen por datos simulados.
 * - Un 401 fuera del login invalida la sesión local y redirige a /login
 *   (evita sesiones zombis tras expirar el JWT).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    console.error(`[API] Network error for ${path}:`, error);
    throw new Error(
      "No fue posible contactar al servidor. Verifica tu conexión e inténtalo de nuevo.",
      { cause: error },
    );
  }

  if (!response.ok) {
    // Interceptor de sesión expirada: cualquier 401 fuera del propio login
    // significa token inválido/expirado -> limpiar y volver al login.
    if (response.status === 401 && !path.includes("/auth/login")) {
      clearAuth();
      window.location.assign("/login");
    }

    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // cuerpo no-JSON: conservar mensaje por status
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiFetch = apiRequest;
