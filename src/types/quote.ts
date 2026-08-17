export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface QuoteItem {
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

export interface Quote {
  _id: string;
  tenantId: string;
  customerId: string;
  conversationId?: string;
  documentType: "QUOTE";
  number: string;
  items: QuoteItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  currency: string;
  status: QuoteStatus;
  validUntil?: string;
  notes?: string;
  terms?: string;
  sentAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface QuoteListResponse {
  data: Quote[];
  pagination: QuotePagination;
}
