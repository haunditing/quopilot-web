import { apiRequest } from "../lib/api.js";
import type {
  ItemType,
  Product,
  ProductListResponse,
  ProductStatus,
  UnitOfMeasure,
  WarehouseStock,
} from "../types/product.js";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  category?: string;
  itemType?: ItemType;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateProductInput {
  itemType: ItemType;
  name: string;
  description?: string;
  reference?: string;
  category?: string;
  unitOfMeasure?: UnitOfMeasure;
  code?: string;
  sku?: string;
  barcode?: string;
  basePrice: number;
  cost?: number;
  taxRate: number;
  currency: string;
  priceLists?: Array<{
    priceListId: string;
    priceListName: string;
    price: number;
  }>;
  accountingAccount?: string;
  incomeAccount?: string;
  inventoryAccount?: string;
  fiscalCode?: string;
  image?: {
    url: string;
    publicId?: string;
    filename?: string;
  };
  warehouses?: WarehouseStock[];
  minStock?: number;
  maxStock?: number;
  lowStockAlert?: boolean;
}

export interface UpdateProductInput {
  itemType?: ItemType;
  name?: string;
  description?: string;
  reference?: string;
  category?: string;
  unitOfMeasure?: UnitOfMeasure;
  code?: string;
  sku?: string;
  barcode?: string;
  basePrice?: number;
  cost?: number;
  taxRate?: number;
  currency?: string;
  priceLists?: CreateProductInput["priceLists"];
  accountingAccount?: string;
  incomeAccount?: string;
  inventoryAccount?: string;
  fiscalCode?: string;
  image?: CreateProductInput["image"];
  warehouses?: WarehouseStock[];
  minStock?: number;
  maxStock?: number;
  lowStockAlert?: boolean;
}

export async function getProducts({
  page = 1,
  limit = 20,
  status,
  search,
  category,
  itemType,
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

  if (category) {
    params.set("category", category);
  }

  if (itemType) {
    params.set("itemType", itemType);
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

export async function getProduct(productId: string): Promise<Product> {
  return apiRequest<Product>(`/api/products/${productId}`, {
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