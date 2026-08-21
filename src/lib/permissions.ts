/**
 * @deprecated Matriz estática de permisos en el cliente.
 *
 * La fuente de verdad es el registro declarativo del backend
 * (GET /api/me/capabilities -> hook useCapabilities). Este archivo solo
 * se conserva como UX temporal para ocultar botones; NO debe usarse para
 * nuevas decisiones de autorización. El backend re-valida todo.
 */

import type { UserRole } from "../types/user.js";

export type CrudEntity =
  | "users"
  | "tenants"
  | "quotes"
  | "products"
  | "customers"
  | "channels"
  | "sales";

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
    sales: [],
  },

  TENANT_ADMIN: {
    tenants: [],
    users: ["view", "create", "update", "delete", "changeStatus"],
    quotes: ["view", "create", "update", "send", "accept"],
    products: ["view", "create", "update", "delete", "changeStatus"],
    customers: ["view", "create", "update", "delete"],
    channels: ["view", "create", "update", "delete", "changeStatus"],
    sales: ["view", "delete"],
  },

  AGENT: {
    tenants: [],
    users: [],
    quotes: ["view", "create", "update", "send"],
    products: ["view"],
    customers: ["view", "create", "update"],
    channels: [],
    sales: ["view"],
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
