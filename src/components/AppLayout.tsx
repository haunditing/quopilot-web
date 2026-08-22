import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";
import {
  getHeaderTitle,
  getRoleThemeClass,
} from "../lib/roles.js";
import { getUser } from "../services/auth-storage.js";
import AppSidebar from "./Layout/AppSidebar.js";
import FloatingPanel from "./FloatingPanel.js";
import AssistantChat from "./AssistantChat.js";
import { SUPPORT_ASSISTANT_ENDPOINT } from "../services/support-assistant-service.js";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const headerTitle = user?.role
    ? getHeaderTitle(user.role)
    : "Panel comercial";
  const layoutClassName = user?.role
    ? `app-layout ${getRoleThemeClass(user.role)}`
    : "app-layout";

  return (
    <div className={layoutClassName}>
      <AppSidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

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
          <FloatingPanel icon="bot" ariaLabel="Abrir asistente de soporte">
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
