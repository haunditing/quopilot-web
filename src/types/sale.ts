import type { Customer } from "./customer.js";
import type { Quote } from "./quote.js";

export type SaleStatus = "CONFIRMED" | "CANCELLED";

export interface Sale {
  _id: string;
  tenantId: string;
  customerId: string;
  quoteId: string;
  number: string;
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

export interface SaleDetailResponse {
  sale: Sale;
  quote: Quote | null;
  customer: Customer | null;
}
