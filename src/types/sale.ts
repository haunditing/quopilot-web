export type SaleStatus = "CONFIRMED" | "CANCELLED";

export interface SaleItem {
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalLine: number;
}

export interface Sale {
  _id: string;
  tenantId: string;
  customerId: string;
  quoteId?: string;
  items: SaleItem[];
  number: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  currency: string;
  status: SaleStatus;
  soldAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SaleListResponse {
  data: Sale[];
  pagination: SalePagination;
}
