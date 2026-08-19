import type { Sale } from "./sale.js";

export type SaleEventType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface SaleEvent {
  _id: string;
  tenantId: string;
  saleId: string;
  type: SaleEventType;
  createdAt: string;
}

export interface SaleDetailResponse {
  sale: Sale;
  events: SaleEvent[];
}
