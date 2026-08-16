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
}

export interface UpdateQuoteInput {
  customerId: string;
  items: UpdateQuoteItemInput[];
  validUntil?: string;
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
