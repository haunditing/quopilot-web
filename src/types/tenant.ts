export type TenantStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Tenant {
  _id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  personType?: string;
  taxLiability?: string;
  taxRegime?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  department?: string;
  postalCode?: string;
  website?: string;
  country?: string;
  currency: string;
  timezone: string;
  decimalPrecision?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  logoUrl?: string;
  documentLogoUrl?: string;
  brandColor?: string;
  footerText?: string;
  status: TenantStatus;
  plan?: string;
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