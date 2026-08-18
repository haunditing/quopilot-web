import { getAccessToken } from "../services/auth-storage.js";
import { getMockResponse } from "./mockFallback.js";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Si la petición falla y el usuario quiere ver data mock para evitar que se rompa todo
      console.warn(
        `[Mock Fallback] API request failed for ${path} (${response.status}), returning mock data.`,
      );
      return getMockResponse(path) as T;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    // Si fetch lanza una excepcion de red (e.g., backend esta abajo por completo)
    console.error(
      `[Mock Fallback] Network error for ${path}, returning mock data. Error:`,
      error,
    );
    return getMockResponse(path) as T;
  }
}
