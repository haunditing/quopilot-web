import { apiRequest } from "../lib/api.js";
import type { Tenant, TenantListResponse, TenantStatus } from "../types/tenant.js";
import type { UserListResponse } from "../types/user.js";

export interface TenantInput {
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  country?: string;
  currency: string;
  timezone: string;
  adminName: string;
  password: string;
  confirmPassword: string;
}

export interface GetTenantsParams {
  page?: number;
  limit?: number;
  status?: TenantStatus;
  search?: string;
}

export async function getTenants({
  page = 1,
  limit = 20,
  status,
  search,
}: GetTenantsParams = {}): Promise<TenantListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  if (search) {
    params.set("search", search);
  }

  return apiRequest<TenantListResponse>(`/api/tenants?${params.toString()}`);
}

export async function getTenant(tenantId: string): Promise<Tenant> {
  return apiRequest<Tenant>(`/api/tenants/${tenantId}`);
}

export async function getCurrentTenant(): Promise<Tenant> {
  return apiRequest<Tenant>("/api/tenants/me");
}

export interface GetTenantUsersParams {
  page?: number;
  limit?: number;
}

export async function getTenantUsers(
  tenantId: string,
  { page = 1, limit = 100 }: GetTenantUsersParams = {},
): Promise<UserListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  return apiRequest<UserListResponse>(
    `/api/tenants/${tenantId}/users?${params.toString()}`,
  );
}

export async function createTenant(input: TenantInput): Promise<Tenant> {
  return apiRequest<Tenant>("/api/tenants", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface UpdateTenantInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  phone?: string;
  country?: string;
  currency?: string;
  timezone?: string;
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
): Promise<Tenant> {
  return apiRequest<Tenant>(`/api/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateTenantStatus(
  tenantId: string,
  status: TenantStatus,
): Promise<Tenant> {
  return apiRequest<Tenant>(`/api/tenants/${tenantId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
    }),
  });
}
