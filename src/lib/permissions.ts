import type { UserRole } from "../types/user.js";

export type CrudEntity =
  | "users"
  | "tenants"
  | "quotes"
  | "products"
  | "customers"
  | "channels";

export type CrudOperation =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "changeStatus"
  | "send"
  | "accept";

const PERMISSIONS: Record<UserRole, Record<CrudEntity, CrudOperation[]>> = {
  SUPER_ADMIN: {
    tenants: ["view", "create", "changeStatus"],
    users: [],
    quotes: [],
    products: [],
    customers: [],
    channels: [],
  },

  TENANT_ADMIN: {
    tenants: [],
    users: ["view", "create", "update", "delete", "changeStatus"],
    quotes: ["view", "create", "update", "send", "accept"],
    products: ["view", "create", "update", "delete", "changeStatus"],
    customers: ["view", "create", "update", "delete"],
    channels: ["view", "create", "update", "delete", "changeStatus"],
  },

  AGENT: {
    tenants: [],
    users: [],
    quotes: ["view", "create", "update", "send"],
    products: ["view"],
    customers: ["view"],
    channels: [],
  },
};

export function can(
  role: UserRole | undefined,
  entity: CrudEntity,
  operation: CrudOperation,
): boolean {
  if (!role) {
    return false;
  }

  return PERMISSIONS[role][entity].includes(operation);
}
