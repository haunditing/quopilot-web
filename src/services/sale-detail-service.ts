import { apiRequest } from "../lib/api.js";
import type { SaleDetailResponse } from "../types/sale-detail.js";

export async function getSaleDetail(
  saleId: string,
): Promise<SaleDetailResponse> {
  return apiRequest<SaleDetailResponse>(`/api/sales/${saleId}`, {
    method: "GET",
  });
}
