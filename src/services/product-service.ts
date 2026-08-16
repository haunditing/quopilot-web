import { apiRequest } from "../lib/api.js";
import type {
  Product,
  ProductListResponse,
  ProductStatus,
} from "../types/product.js";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  unitPrice: number;
  currency: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  sku?: string;
  unitPrice?: number;
  currency?: string;
}

export async function getProducts({
  page = 1,
  limit = 20,
  status,
  search,
  currency,
  minPrice,
  maxPrice,
}: GetProductsParams = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  if (search) {
    params.set("search", search);
  }

  if (currency) {
    params.set("currency", currency);
  }

  if (minPrice !== undefined) {
    params.set("minPrice", String(minPrice));
  }

  if (maxPrice !== undefined) {
    params.set("maxPrice", String(maxPrice));
  }

  return apiRequest<ProductListResponse>(`/api/products?${params.toString()}`, {
    method: "GET",
  });
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return apiRequest<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  return apiRequest<Product>(`/api/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateProductStatus(
  productId: string,
  status: ProductStatus,
): Promise<Product> {
  return apiRequest<Product>(`/api/products/${productId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  return apiRequest<void>(`/api/products/${productId}`, {
    method: "DELETE",
  });
}
