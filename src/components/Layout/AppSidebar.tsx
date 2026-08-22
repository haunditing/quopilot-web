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

interface AppSidebarProps {
  /** Drawer móvil abierto (controlado desde el header). */
  open?: boolean;
  /** Se invoca al navegar o cerrar el drawer. */
  onNavigate?: () => void;
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

export default function AppSidebar({ open = false, onNavigate }: AppSidebarProps) {
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
      className={`app-sidebar ${open ? "app-sidebar--open" : ""} ${effectivelyCollapsed ? "app-sidebar--collapsed" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="app-brand">
        <div className="app-brand__logo-wrapper">
          <Icon name="brand" size={24} className="app-brand__icon" />
          {!effectivelyCollapsed && (
            <span className="app-brand__text">
              <strong>QuoPilot</strong>
              {brandSubtitle && <small>{brandSubtitle}</small>}
            </span>
          )}
        </div>
        {!effectivelyCollapsed && (
          <button
            type="button"
            className="app-sidebar-toggle"
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
              flexShrink: 0,
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

      <nav className="app-navigation" aria-label="Navegación principal">
        {visibleNavigationGroups.map((group) => (
          <div
            key={group.label ?? "principal"}
            className="app-navigation__group"
          >
            {group.label && (
              <span className="app-navigation__section">{group.label}</span>
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? "app-navigation__item app-navigation__item--active"
                    : "app-navigation__item"
                }
                onClick={() => onNavigate?.()}
                title={effectivelyCollapsed ? item.label : undefined}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="app-user mt-auto">
        <div className="app-user__card">
          <span
            className="app-user__avatar"
            aria-hidden="true"
            title={user?.name}
            style={{ flexShrink: 0 }}
          >
            {avatarInitial}
          </span>

          {!effectivelyCollapsed && (
            <div className="app-user__info">
              <strong className="app-user__name">
                {user?.name ?? "Usuario"}
              </strong>
              {user?.email && (
                <span className="app-user__email">{user.email}</span>
              )}
              {roleLabel && <span className="app-user__role">{roleLabel}</span>}
            </div>
          )}

          {!effectivelyCollapsed && (
            <div className="app-logout-button" style={{ flexShrink: 0 }}>
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
