export type CustomerType = "CUSTOMER" | "SUPPLIER";

export type IdentificationType =
  | "CC"
  | "CE"
  | "NIT"
  | "PASSPORT"
  | "OTHER";

export interface Customer {
  _id: string;
  tenantId: string;
  name: string;
  customerType?: CustomerType;
  firstName?: string;
  lastName?: string;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  municipality?: string;
  department?: string;
  address?: string;
  postalCode?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  sendStatement?: boolean;
  whatsappId?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: CustomerPagination;
}