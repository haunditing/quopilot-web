import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";
import {
  getHeaderTitle,
  getRoleLabel,
  getRoleScope,
  getRoleThemeClass,
} from "../lib/roles.js";
import { clearAuth, getUser } from "../services/auth-storage.js";
import type { UserRole } from "../types/user.js";

interface AppLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  to: string;
  label: string;
  icon: IconName;
  roles?: UserRole[];
  end?: boolean;
}

interface NavigationGroup {
  label?: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
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
      },
      {
        to: "/customers",
        label: "Clientes",
        icon: "customers",
        roles: ["TENANT_ADMIN", "AGENT"],
      },
      {
        to: "/quotes",
        label: "Cotizaciones",
        icon: "quotes",
        roles: ["TENANT_ADMIN", "AGENT"],
      },
      {
        to: "/sales",
        label: "Ventas",
        icon: "sales",
        roles: ["TENANT_ADMIN", "AGENT"],
      },
      {
        to: "/products",
        label: "Productos",
        icon: "products",
        roles: ["TENANT_ADMIN", "AGENT"],
      },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        to: "/channels",
        label: "Canales",
        icon: "channels",
        roles: ["TENANT_ADMIN"],
      },
      {
        to: "/agent",
        label: "Agente",
        icon: "bot",
        roles: ["TENANT_ADMIN"],
      },
      {
        to: "/users",
        label: "Usuarios",
        icon: "users",
        roles: ["TENANT_ADMIN"],
      },
      {
        to: "/tenants",
        label: "Tenants",
        icon: "tenants",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleNavigationGroups = navigationGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (!item.roles) {
          return true;
        }

        return user?.role !== undefined && item.roles.includes(user.role);
      }),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function handleLogout() {
    clearAuth();

    navigate("/login", {
      replace: true,
    });
  }

  const roleLabel = user?.role ? getRoleLabel(user.role) : undefined;
  const headerTitle = user?.role
    ? getHeaderTitle(user.role)
    : "Panel comercial";
  const brandSubtitle = user?.role ? getRoleScope(user.role) : undefined;
  const avatarInitial = user?.name?.charAt(0) ?? "U";
  const layoutClassName = user?.role
    ? `app-layout ${getRoleThemeClass(user.role)}`
    : "app-layout";

  return (
    <div className={layoutClassName}>
      <aside
        id="app-sidebar"
        className={menuOpen ? "app-sidebar app-sidebar--open" : "app-sidebar"}
      >
        <div className="app-brand">
          <Icon name="brand" size={24} className="app-brand__icon" />

          <span className="app-brand__text">
            <strong>QuoPilot</strong>

            {brandSubtitle && <small>{brandSubtitle}</small>}
          </span>
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
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon name={item.icon} size={18} />

                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="app-user">
          <div className="app-user__card">
            <span className="app-user__avatar" aria-hidden="true">
              {avatarInitial}
            </span>

            <div className="app-user__info">
              <strong className="app-user__name">
                {user?.name ?? "Usuario"}
              </strong>
              {user?.email && (
                <span className="app-user__email">{user.email}</span>
              )}
              {roleLabel && <span className="app-user__role">{roleLabel}</span>}
            </div>

            <button
              className="app-user__logout"
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={18} />
              <span className="visually-hidden">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="app-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="app-main">
        <header className="app-header">
          <button
            className="app-header__menu"
            type="button"
            aria-label="Abrir menú"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={22} />
          </button>

          <strong className="app-header__title">{headerTitle}</strong>
        </header>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
