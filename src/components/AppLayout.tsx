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
import Button from "./Button.js";
import FloatingPanel from "./FloatingPanel.js";
import AssistantChat from "./AssistantChat.js";
import { SUPPORT_ASSISTANT_ENDPOINT } from "../services/support-assistant-service.js";

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
        to: "/settings/company",
        label: "Empresa",
        icon: "settings",
        roles: ["TENANT_ADMIN"],
      },
      {
        to: "/support/assistant",
        label: "Asistente de soporte",
        icon: "bot",
        roles: ["SUPER_ADMIN"],
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

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
        className={`app-sidebar ${menuOpen ? "app-sidebar--open" : ""} ${isCollapsed ? "app-sidebar--collapsed" : ""}`}
      >
        <div
          className="app-brand"
          style={{
            display: "flex",
            justifyContent: isCollapsed ? "center" : "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: isCollapsed ? "none" : "flex",
              alignItems: "center",
              gap: "10px",
              overflow: "hidden",
            }}
          >
            <Icon
              name="brand"
              size={24}
              className="app-brand__icon"
              style={{ flexShrink: 0 }}
            />

            <span className="app-brand__text">
              <strong>QuoPilot</strong>

              {brandSubtitle && <small>{brandSubtitle}</small>}
            </span>
          </div>
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
            }}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Icon
              name={isCollapsed ? "chevron-right" : "chevron-left"}
              size={20}
            />
          </button>
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

            {!isCollapsed && (
              <Button
                icon="logout"
                iconOnly
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                Cerrar sesión
              </Button>
            )}
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

        <div className="app-content">
          <div className="app-content__inner">{children}</div>
        </div>

        {user?.role === "TENANT_ADMIN" && (
          <FloatingPanel
            icon="bot"
            ariaLabel="Abrir asistente de soporte"
          >
            <AssistantChat
              embedded
              endpoint={SUPPORT_ASSISTANT_ENDPOINT}
              title="Asistente de soporte"
              subtitle="Consulta el estado de tu tenant y resuelve dudas"
              welcomeMessage="Hola, soy el asistente de soporte de QuoPilot. Puedo consultar el estado real de tu plataforma, resolver dudas sobre cotizaciones, ventas, productos, usuarios, canales y configuración, y orientarte con procedimientos documentados."
              placeholder="Ej.: ¿cuántas cotizaciones tengo pendientes?"
              suggestions={[
                "Resumen de mi tenant",
                "¿Cuántas cotizaciones tengo pendientes?",
                "¿Cómo configuro un canal de WhatsApp?",
                "¿Qué hacer si un PDF de cotización no se descarga?",
                "Estado del sistema",
                "¿Cómo creo un usuario con rol de agente?",
              ]}
            />
          </FloatingPanel>
        )}
      </div>
    </div>
  );
}
