import { NavLink } from "react-router-dom";

interface CompanyTab {
  to: string;
  label: string;
  end?: boolean;
}

const COMPANY_TABS: CompanyTab[] = [
  { to: "/settings/company", label: "Empresa", end: true },
  { to: "/settings/company/contact", label: "Contacto" },
  { to: "/settings/company/regional", label: "Preferencias regionales" },
];

/**
 * Sub-navegación interna del módulo "Empresa". Cada tab es una página
 * independiente bajo `/settings/company/*`.
 */
export default function CompanyTabs() {
  return (
    <nav
      className="flex gap-1 pb-px border-b border-line overflow-x-auto mb-6"
      aria-label="Configuración de empresa"
    >
      {COMPANY_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            isActive
              ? "inline-flex items-center whitespace-nowrap px-3.5 py-2.5 border border-line border-b-0 rounded-t-lg bg-surface-card text-accent shadow-[inset_0_-2px_0_var(--accent)]"
              : "inline-flex items-center whitespace-nowrap px-3.5 py-2.5 border border-transparent border-b-0 rounded-t-lg text-sm font-semibold text-ink-muted transition-colors duration-150 hover:text-ink-strong hover:bg-accent-soft"
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
