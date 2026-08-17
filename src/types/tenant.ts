export type TenantStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Tenant {
  _id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface TenantListResponse {
  data: Tenant[];
  pagination: TenantPagination;
}
