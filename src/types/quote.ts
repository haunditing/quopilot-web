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
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Quote {
  _id: string;
  tenantId: string;
  customerId: string;
  conversationId?: string;
  number: string;
  items: QuoteItem[];
  subtotal: number;
  total: number;
  currency: string;
  status: QuoteStatus;
  validUntil?: string;
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