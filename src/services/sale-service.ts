import { apiRequest } from "../lib/api.js";
import type {
  SaleDetailResponse,
  SaleListResponse,
} from "../types/sale.js";

export interface GetSalesParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  productId?: string;
  search?: string;
  minTotal?: number;
  maxTotal?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function getSales({
  page = 1,
  limit = 20,
  status,
  customerId,
  productId,
  search,
  minTotal,
  maxTotal,
  dateFrom,
  dateTo,
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

  if (minTotal !== undefined) {
    params.set("minTotal", String(minTotal));
  }

  if (maxTotal !== undefined) {
    params.set("maxTotal", String(maxTotal));
  }

  if (dateFrom) {
    params.set("dateFrom", dateFrom);
  }

  if (dateTo) {
    params.set("dateTo", dateTo);
  }

  return apiRequest<SaleListResponse>(`/api/sales?${params.toString()}`, {
    method: "GET",
  });
}

export async function getSaleDetail(
  saleId: string,
): Promise<SaleDetailResponse> {
  return apiRequest<SaleDetailResponse>(`/api/sales/${saleId}`, {
    method: "GET",
  });
}

export async function deleteSale(saleId: string): Promise<void> {
  return apiRequest<void>(`/api/sales/${saleId}`, {
    method: "DELETE",
  });
}
