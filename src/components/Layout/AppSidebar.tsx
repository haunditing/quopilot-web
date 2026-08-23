import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Icon from "../Icon.js";
import type { IconName } from "../Icon.js";
import Button from "../Button.js";
import { clearAuth, getUser } from "../../services/auth-storage.js";
import { getRoleLabel, getRoleScope } from "../../lib/roles.js";
import { useCapabilities } from "../../hooks/useCapabilities.js";

export interface SidebarItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  /** Roles autorizados; si se omite, visible para todos. */
  roles?: import("../../types/user.js").UserRole[];
  /** Capacidad requerida (fail-closed mientras carga o ante error). */
  requiredCapability?: string;
}

export interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
}

const navigationGroups: SidebarGroup[] = [
  {
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
        requiredCapability: "dashboard.view",
      },
    ],
  },
  {
    label: "Comercial",
    items: [
      {
        to: "/conversations",
        label: "Conversaciones",
        icon: "inbox",
        roles: ["TENANT_ADMIN", "AGENT"],
        requiredCapability: "conversations.view",
      },
      {
        to: "/customers",
        label: "Clientes",
        icon: "customers",
        roles: ["TENANT_ADMIN", "AGENT"],
        requiredCapability: "customers.view",
      },
      {
        to: "/quotes",
        label: "Cotizaciones",
        icon: "quotes",
        roles: ["TENANT_ADMIN", "AGENT"],
        requiredCapability: "quotes.view",
      },
      {
        to: "/sales",
        label: "Ventas",
        icon: "sales",
        roles: ["TENANT_ADMIN", "AGENT"],
        requiredCapability: "sales.view",
      },
      {
        to: "/products",
        label: "Productos",
        icon: "products",
        roles: ["TENANT_ADMIN", "AGENT"],
        requiredCapability: "products.view",
      },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        to: "/settings/company",
        label: "Empresa",
        icon: "settings",
        roles: ["TENANT_ADMIN"],
        requiredCapability: "tenants.updateMe",
      },
    ],
  },
];

interface AppSidebarProps {
  /** Drawer móvil abierto (controlado desde el header). */
  open?: boolean;
  /** Se invoca al navegar o cerrar el drawer. */
  onNavigate?: () => void;
}

export default function AppSidebar({
  open = false,
  onNavigate,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { hasCapability } = useCapabilities();
  const user = getUser();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  const effectivelyCollapsed = isCollapsed && !isHovered;

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  const visibleNavigationGroups = navigationGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (item.roles && (!user?.role || !item.roles.includes(user.role))) {
          return false;
        }

        // Fail-closed: durante la carga (o si falla el endpoint) se ocultan
        // los ítems que requieren capacidad.
        if (
          item.requiredCapability &&
          !hasCapability(item.requiredCapability)
        ) {
          return false;
        }

        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const roleLabel = user?.role ? getRoleLabel(user.role) : undefined;
  const brandSubtitle = user?.role ? getRoleScope(user.role) : undefined;
  const avatarInitial = user?.name?.charAt(0) ?? "U";

  return (
    <aside
      id="app-sidebar"
      className={[
        "fixed md:sticky top-0 bottom-0 left-0 z-30 flex flex-col",
        effectivelyCollapsed
          ? "md:w-20 md:px-3"
          : "w-[min(280px,85vw)] md:w-[280px]",
        "shrink-0 p-4 md:p-5",
        "bg-[color:var(--shell-bg)] border-r border-[color:var(--shell-border)]",
        "-translate-x-full invisible transition-[transform,visibility] duration-200 ease-out",
        "md:translate-x-0 md:visible md:transition-[width] md:ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        open && "!translate-x-0 !visible shadow-card",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Marca */}
      <div
        className={`flex items-center w-full mb-8 text-[color:var(--shell-text)] ${
          effectivelyCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Icon
            name="brand"
            size={24}
            className="shrink-0 text-[color:var(--accent-binset-inline-end,var(--accent))]"
          />
          {!effectivelyCollapsed && (
            <span className="flex flex-col">
              <strong className="text-lg tracking-[-0.3px]">QuoPilot</strong>
              {brandSubtitle && (
                <small className="text-xs text-[color:var(--shell-text-muted)]">
                  {brandSubtitle}
                </small>
              )}
            </span>
          )}
        </div>
        {!effectivelyCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--shell-text-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isCollapsed ? "Fijar menú" : "Colapsar menú"}
          >
            <Icon
              name={isCollapsed ? "chevron-right" : "chevron-left"}
              size={20}
            />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-1.5" aria-label="Navegación principal">
        {visibleNavigationGroups.map((group, groupIndex) => (
          <div key={group.label ?? "principal"} className="flex flex-col gap-1.5">
            {!effectivelyCollapsed && group.label && (
              <span
                className={`block px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--shell-text-muted)] ${
                  groupIndex > 0 ? "mt-2.5 pt-2.5 border-t border-[color:var(--shell-border)]" : ""
                }`}
              >
                {group.label}
              </span>
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg font-medium transition-colors duration-150 hover:bg-white/5",
                    effectivelyCollapsed ? "justify-center px-0" : "",
                    isActive
                      ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] !text-[color:var(--accent-bright,var(--accent))] font-semibold"
                      : "text-[color:var(--shell-text-muted)] hover:!text-[color:var(--accent-bright,var(--accent))]",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                onClick={() => onNavigate?.()}
                title={effectivelyCollapsed ? item.label : undefined}
              >
                <Icon name={item.icon} size={18} className="shrink-0" />
                <span className={effectivelyCollapsed ? "hidden" : ""}>
                  {item.label}
                </span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="mt-auto px-3 pb-2 w-full">
        <div
          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-[10px] bg-white/5 border border-white/10 w-full ${
            effectivelyCollapsed ? "justify-center !p-2 !bg-transparent !border-transparent" : ""
          }`}
        >
          <span
            aria-hidden="true"
            title={user?.name}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-semibold text-sm shrink-0"
          >
            {avatarInitial}
          </span>

          {!effectivelyCollapsed && (
            <div className="flex flex-col justify-center flex-1 min-w-0 gap-0.5 [&_*]:truncate">
              <strong className="text-white text-[13px] font-semibold leading-tight">
                {user?.name ?? "Usuario"}
              </strong>
              {user?.email && (
                <span className="text-slate-400 text-[11px] leading-tight">
                  {user.email}
                </span>
              )}
              {roleLabel && (
                <span className="text-sky-400 text-[11px] font-medium leading-tight">
                  {roleLabel}
                </span>
              )}
            </div>
          )}

          {!effectivelyCollapsed && (
            <div className="shrink-0">
              <Button
                icon="logout"
                iconOnly
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                Cerrar sesión
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
