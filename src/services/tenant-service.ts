// src/services/tenant-service.ts
// Servicio tenant-facing: solo endpoints del propio tenant (/api/tenants/me*).
// La gestión global de tenants (super admin) vive en quopilot-web-admin.

import { apiRequest } from "../lib/api.js";
import type { Tenant } from "../types/tenant.js";
import type { CapabilityMatrixEntry } from "../types/support-assistant.js";

export async function getMyTenantCapabilities(): Promise<{
  planKey: string;
  featureKeys: string[];
  capabilityCodes: string[];
  effectiveCodes: string[];
  entries: CapabilityMatrixEntry[];
}> {
  return apiRequest("/api/tenants/me/capabilities", { method: "GET" });
}

export async function getCurrentTenant(): Promise<Tenant> {
  return apiRequest<Tenant>("/api/tenants/me");
}

export interface UpdateTenantInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  address?: string;
  city?: string;
  department?: string;
  postalCode?: string;
  website?: string;
  logoUrl?: string;
  documentLogoUrl?: string;
  brandColor?: string;
  footerText?: string;
  decimalPrecision?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

export async function updateCurrentTenant(
  input: UpdateTenantInput,
): Promise<Tenant> {
  return apiRequest<Tenant>("/api/tenants/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
