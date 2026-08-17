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
      className={
        collapsed
          ? "agent-config__card agent-config__card--collapsed"
          : "agent-config__card"
      }
    >
      <button
        type="button"
        className="agent-config__card-head"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((current) => !current)}
      >
        <span className="agent-config__card-head__icon">
          <Icon name={icon} size={18} />
        </span>

        <span className="agent-config__card-head__text">
          <strong>{title}</strong>

          {description && <small>{description}</small>}
        </span>

        <Icon
          name="chevron-down"
          size={18}
          className="agent-config__card-head__chevron"
        />
      </button>

      <div className="agent-config__card-body">{children}</div>
    </section>
  );
}