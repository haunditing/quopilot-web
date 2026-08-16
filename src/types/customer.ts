export interface Customer {
  _id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
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
