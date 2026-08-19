import type { Customer } from "./customer.js";
import type { Quote } from "./quote.js";
import type { Sale } from "./sale.js";

export type SaleEventType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface SaleEvent {
  _id: string;
  tenantId: string;
  saleId: string;
  type: SaleEventType;
  createdAt: string;
}

export interface SaleDetailResponse {
  sale: Sale;
  quote: Quote | null;
  customer: Customer | null;
  events: SaleEvent[];
}