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
    <nav className="settings-tabs" aria-label="Configuración">
      {SETTINGS_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            isActive
              ? "settings-tabs__tab settings-tabs__tab--active"
              : "settings-tabs__tab"
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
