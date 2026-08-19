export interface PrintTenantInfo {
  name: string;
  legalName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  logoMode?: "main" | "custom";
  documentLogoUrl?: string;
  brandColor?: string;
  footerText?: string;
}

export interface PrintCustomerInfo {
  name?: string;
  address?: string;
  municipality?: string;
  phone?: string;
  identificationNumber?: string;
}

export interface PrintItemInfo {
  name: string;
  unitPrice: number;
  quantity: number;
  discountPercent?: number;
  subtotal: number;
}

export interface PrintDocumentInfo {
  number: string;
  createdAt: string;
  validUntil?: string | null;
  soldAt?: string | null;
  currency?: string;
  total?: number;
  items: PrintItemInfo[];
}