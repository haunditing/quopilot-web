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

const REMEMBERED_EMAIL_KEY = "remembered-email";

/** "Recordarme" guarda únicamente el correo, nunca credenciales. */
export function saveRememberedEmail(email: string): void {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
}

export function getRememberedEmail(): string | null {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export function clearRememberedEmail(): void {
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
