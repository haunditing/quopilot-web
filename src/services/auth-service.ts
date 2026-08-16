import { apiRequest } from "../lib/api.js";

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "SUPER_ADMIN" | "TENANT_ADMIN" | "AGENT";
    tenantId?: string;
    mustChangePassword: boolean;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiRequest<void>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
