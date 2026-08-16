import type { Quote } from "./quote.js";

export type QuoteEventType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface QuoteEvent {
  _id: string;
  tenantId: string;
  quoteId: string;
  type: QuoteEventType;
  createdAt: string;
}

export interface QuoteDetailResponse {
  quote: Quote;
  events: QuoteEvent[];
}
