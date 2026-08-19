import { apiRequest } from "../lib/api.js";
import type { Sale, SaleListResponse } from "../types/sale.js";

export interface GetSalesParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  search?: string;
}

export async function getSales({
  page = 1,
  limit = 20,
  status,
  customerId,
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

  if (search) {
    params.set("search", search);
  }

  return apiRequest<SaleListResponse>(`/api/sales?${params.toString()}`, {
    method: "GET",
  });
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface CreateSaleInput {
  customerId: string;
  quoteId?: string;
  items: CreateSaleItemInput[];
  notes?: string;
  terms?: string;
}

export async function createSale(
  input: CreateSaleInput,
): Promise<{ sale: Sale }> {
  return apiRequest<{ sale: Sale }>(`/api/sales`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendSale(saleId: string): Promise<Sale> {
  return apiRequest<Sale>(`/api/sales/${saleId}/send`, {
    method: "POST",
  });
}

export async function acceptSale(saleId: string): Promise<Sale> {
  return apiRequest<Sale>(`/api/sales/${saleId}/accept`, {
    method: "POST",
  });
}

export interface UpdateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface UpdateSaleInput {
  customerId: string;
  quoteId?: string;
  items: UpdateSaleItemInput[];
  notes?: string;
  terms?: string;
}

export async function updateSale(
  saleId: string,
  input: UpdateSaleInput,
): Promise<Sale> {
  return apiRequest<Sale>(`/api/sales/${saleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteSale(saleId: string): Promise<void> {
  await apiRequest<void>(`/api/sales/${saleId}`, {
    method: "DELETE",
  });
}

export async function getNextSaleNumber(): Promise<string> {
  const response = await apiRequest<{ number: string }>(
    "/api/sales/next-number",
  );
  return response.number;
}
