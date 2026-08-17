export type ProductStatus = "ACTIVE" | "INACTIVE";

export type ItemType = "PRODUCT" | "SERVICE" | "COMBO";

export type UnitOfMeasure =
  | "UNIT"
  | "KG"
  | "LB"
  | "LITER"
  | "METER"
  | "HOUR"
  | "PACKAGE"
  | "BOX"
  | "SET";

export interface PriceListEntry {
  priceListId: string;
  priceListName: string;
  price: number;
}

export interface WarehouseStock {
  name: string;
  quantity: number;
}

export interface Product {
  _id: string;
  tenantId: string;
  itemType: ItemType;
  name: string;
  reference?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: UnitOfMeasure;
  code?: string;
  sku?: string;
  barcode?: string;
  basePrice: number;
  cost?: number;
  taxRate: number;
  unitPrice: number;
  currency: string;
  status: ProductStatus;
  priceLists?: PriceListEntry[];
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