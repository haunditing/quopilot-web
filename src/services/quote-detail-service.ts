import { apiRequest } from "../lib/api.js";
import type { QuoteDetailResponse } from "../types/quote-detail.js";

export async function getQuoteDetail(
  quoteId: string,
): Promise<QuoteDetailResponse> {
  return apiRequest<QuoteDetailResponse>(`/api/quotes/${quoteId}`, {
    method: "GET",
  });
}
