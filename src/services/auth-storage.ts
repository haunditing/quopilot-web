import type { UserRole } from "../types/user.js";

export interface StoredUser {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  tenantId?: string;
  mustChangePassword?: boolean;
}

export function getAccessToken(): string | null {
  return localStorage.getItem("token");
}

export function saveAccessToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeAccessToken(): void {
  localStorage.removeItem("token");
}

export function getUser(): StoredUser | null {
  const userRaw = localStorage.getItem("user");

  if (!userRaw) {
    return null;
  }

  try {
    return JSON.parse(userRaw) as StoredUser;
  } catch {
    return null;
  }
}

export function getUserRole(): UserRole | undefined {
  return getUser()?.role;
}

export function saveUser(user: StoredUser): void {
  localStorage.setItem("user", JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem("user");
}

export function clearAuth(): void {
  removeAccessToken();
  removeUser();
}

const REMEMBERED_CREDENTIALS_KEY = "remembered-credentials";

export interface RememberedCredentials {
  email: string;
  password: string;
}

export function saveRememberedCredentials(
  credentials: RememberedCredentials,
): void {
  localStorage.setItem(REMEMBERED_CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function getRememberedCredentials(): RememberedCredentials | null {
  const raw = localStorage.getItem(REMEMBERED_CREDENTIALS_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RememberedCredentials>;

    if (typeof parsed.email === "string" && typeof parsed.password === "string") {
      return parsed as RememberedCredentials;
    }

    return null;
  } catch {
    return null;
  }
}

export function clearRememberedCredentials(): void {
  localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY);
}
