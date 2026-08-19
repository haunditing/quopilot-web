import { apiRequest } from "../lib/api.js";
import type { Sale, SaleListResponse } from "../types/sale.js";

export interface GetSalesParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  productId?: string;
  search?: string;
}

export async function getSales({
  page = 1,
  limit = 20,
  status,
  customerId,
  productId,
  search,
}: GetSalesParams = {}): Promise<SaleListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  if (customerId) {
    params.set("customerId", customerId);
  }

  if (productId) {
    params.set("productId", productId);
  }

  if (search) {
    params.set("search", search);
  }

  return apiRequest<SaleListResponse>(`/api/sales?${params.toString()}`, {
    method: "GET",
  });
}

export async function cancelSale(saleId: string): Promise<{ sale: Sale }> {
  return apiRequest<{ sale: Sale }>(`/api/sales/${saleId}/cancel`, {
    method: "POST",
  });
}

export async function deleteSale(saleId: string): Promise<void> {
  await apiRequest<void>(`/api/sales/${saleId}`, {
    method: "DELETE",
  });
}