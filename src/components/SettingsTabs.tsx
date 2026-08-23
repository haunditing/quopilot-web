import { NavLink } from "react-router-dom";

interface SettingsTab {
  to: string;
  label: string;
  end?: boolean;
}

const SETTINGS_TABS: SettingsTab[] = [
  { to: "/settings/company", label: "Empresa", end: true },
  { to: "/agent", label: "Agente", end: true },
  { to: "/channels", label: "Canales", end: true },
  { to: "/users", label: "Usuarios", end: true },
];

export default function SettingsTabs() {
  return (
    <nav className="flex gap-1 pb-px border-b border-line overflow-x-auto" aria-label="Configuración">
      {SETTINGS_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            isActive
              ? "inline-flex items-center px-3.5 py-2.5 border border-line border-b-0 rounded-t-lg bg-surface-card text-accent shadow-[inset_0_-2px_0_var(--accent)]"
              : "inline-flex items-center px-3.5 py-2.5 border border-transparent border-b-0 rounded-t-lg text-sm font-semibold text-ink-muted transition-colors duration-150 hover:text-ink-strong hover:bg-accent-soft"
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
