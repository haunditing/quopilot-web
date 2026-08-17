import { apiRequest } from "../lib/api.js";
import type { Quote, QuoteListResponse } from "../types/quote.js";

export interface GetQuotesParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  search?: string;
}

export async function getQuotes({
  page = 1,
  limit = 20,
  status,
  customerId,
  search,
}: GetQuotesParams = {}): Promise<QuoteListResponse> {
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

  return apiRequest<QuoteListResponse>(`/api/quotes?${params.toString()}`, {
    method: "GET",
  });
}

export interface CreateQuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface CreateQuoteInput {
  customerId: string;
  conversationId?: string;
  items: CreateQuoteItemInput[];
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export async function createQuote(
  input: CreateQuoteInput,
): Promise<{ quote: Quote }> {
  return apiRequest<{ quote: Quote }>(`/api/quotes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendQuote(quoteId: string): Promise<Quote> {
  return apiRequest<Quote>(`/api/quotes/${quoteId}/send`, {
    method: "POST",
  });
}

export async function acceptQuote(quoteId: string): Promise<Quote> {
  return apiRequest<Quote>(`/api/quotes/${quoteId}/accept`, {
    method: "POST",
  });
}

export interface UpdateQuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface UpdateQuoteInput {
  customerId: string;
  items: UpdateQuoteItemInput[];
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export async function updateQuote(
  quoteId: string,
  input: UpdateQuoteInput,
): Promise<Quote> {
  return apiRequest<Quote>(`/api/quotes/${quoteId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getNextQuoteNumber(): Promise<string> {
  const response = await apiRequest<{ number: string }>("/api/quotes/next-number");
  return response.number;
}
