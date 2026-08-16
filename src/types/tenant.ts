export type TenantStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Tenant {
  _id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  country?: string;
  currency: string;
  timezone: string;
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
