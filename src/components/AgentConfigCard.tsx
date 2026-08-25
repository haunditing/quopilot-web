import { useState } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon.js";
import type { IconName } from "./Icon.js";

interface AgentConfigCardProps {
  id: string;
  icon: IconName;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function AgentConfigCard({
  id,
  icon,
  title,
  description,
  children,
}: AgentConfigCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section
      id={id}
      className="rounded-xl border border-line bg-surface-card shadow-card"
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((current) => !current)}
        className={`flex w-full items-center gap-3 p-4 text-left bg-transparent border-0 cursor-pointer transition-colors duration-150 hover:bg-accent-soft md:p-5 ${
          collapsed ? "" : "border-b border-line"
        }`}
      >
        <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-accent-soft text-accent">
          <Icon name={icon} size={18} />
        </span>

        <span className="flex flex-col min-w-0 flex-1 gap-0.5 [&>strong]:text-[15px] [&>strong]:font-semibold [&>strong]:text-ink-strong [&>small]:text-[13px] [&>small]:leading-snug [&>small]:text-ink-muted">
          <strong>{title}</strong>

          {description && <small>{description}</small>}
        </span>

        <Icon
          name="chevron-down"
          size={18}
          className={`shrink-0 text-ink-muted transition-transform duration-150 ${
            collapsed ? "" : "rotate-180"
          }`}
        />
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-4 p-4 md:p-5">{children}</div>
      )}
    </section>
  );
}
