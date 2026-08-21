// src/services/me-capabilities-service.ts

import { apiRequest } from "../lib/api.js";

export type CapabilityDomain =
  | "COMMERCIAL"
  | "ADMINISTRATION"
  | "SUPER_ADMIN";

export interface DomainCapability {
  code: string;
  module: string;
  name: string;
  description: string;
  kind: string;
}

export interface MeCapabilities {
  planKey: string | null;
  role: string | null;
  totalCapabilities: number;
  codes: string[];
  byDomain: Record<CapabilityDomain, DomainCapability[]>;
}

export function getMyCapabilities(): Promise<MeCapabilities> {
  return apiRequest<MeCapabilities>("/api/me/capabilities");
}
