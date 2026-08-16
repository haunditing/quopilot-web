import type { UserRole } from "../types/user.js";

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super administrador";

    case "TENANT_ADMIN":
      return "Administrador";

    case "AGENT":
      return "Agente";
  }
}

export function getRoleScope(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Administración";

    case "TENANT_ADMIN":
      return "Empresa";

    case "AGENT":
      return "Ventas";
  }
}

export function getHeaderTitle(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Administración de plataforma";

    case "TENANT_ADMIN":
      return "Administración comercial";

    case "AGENT":
      return "Panel comercial";
  }
}

export function getRoleThemeClass(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "app-layout--super-admin";

    case "TENANT_ADMIN":
      return "app-layout--tenant-admin";

    case "AGENT":
      return "app-layout--agent";
  }
}
