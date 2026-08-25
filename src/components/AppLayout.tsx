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
import { SlotRenderer } from "../banners/SlotRenderer.js";
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
  const layoutClassName = [
    "app-layout min-h-svh md:h-svh md:flex md:overflow-hidden",
    user?.role ? getRoleThemeClass(user.role) : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={layoutClassName}>
      <AppSidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-[rgba(8,6,13,0.5)] md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 w-full md:flex-1 flex flex-col overflow-hidden">
        <header
          className="static z-10 shrink-0 min-h-14 md:min-h-16 flex items-center gap-3 px-4 md:px-6 border-b border-[color:var(--shell-border)] bg-[color:var(--shell-bg)]">
          <button
            className="inline-flex items-center justify-center w-10 h-10 border-0 rounded-lg bg-transparent text-[color:var(--shell-text)] transition-colors duration-150 hover:bg-accent-soft hover:text-accent md:hidden"
            type="button"
            aria-label="Abrir menú"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={22} />
          </button>

          <strong className="text-[color:var(--shell-text)] text-base font-semibold">{headerTitle}</strong>
        </header>

        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <div className="w-full max-w-content mx-auto p-4 md:p-8">
            <SlotRenderer slotId="header_global" />
            {children}
          </div>
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
