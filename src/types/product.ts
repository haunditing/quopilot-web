export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  sku?: string;
  unitPrice: number;
  currency: string;
  status: ProductStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductListResponse {
  data: Product[];
  pagination: ProductPagination;
}
