export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "AGENT";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UserListResponse {
  data: User[];
  pagination: UserPagination;
}
